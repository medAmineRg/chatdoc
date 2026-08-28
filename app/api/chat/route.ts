import { convertToCoreMessages, createDataStreamResponse, streamText } from "ai";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { chatModel } from "@/lib/llm";
import { log } from "@/lib/logger";
import { buildSystemPrompt } from "@/lib/prompt";
import { CHAT_LIMIT, checkRateLimit, clientKey } from "@/lib/rate-limit";
import { retrieveChunks } from "@/lib/retrieval";
import { chatSchema, jsonError, zodDetails } from "@/lib/validation";
import type { ApiError, Source } from "@/lib/api-types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 429 response carrying a Retry-After header (seconds). */
function rateLimited(retryAfterS: number): NextResponse<ApiError> {
  const res = jsonError(429, "Too many requests. Please slow down.");
  res.headers.set("Retry-After", String(retryAfterS));
  return res;
}

/**
 * POST /api/chat
 *
 * Retrieves the most relevant chunks for the latest user question, builds a
 * grounded prompt and streams Gemini's answer token-by-token (F6). The source
 * chunks (F4) are sent up-front as a message annotation so the client can
 * render them alongside the streamed answer.
 */
export async function POST(req: Request) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  const limit = checkRateLimit(clientKey(req), CHAT_LIMIT);
  if (!limit.ok) {
    log("warn", "chat.rate_limited", { requestId, retryAfterS: limit.retryAfterS });
    return rateLimited(limit.retryAfterS);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = chatSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "Invalid request", zodDetails(parsed.error));
  }
  const { documentIds, messages } = parsed.data;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return jsonError(400, "No user message found");
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const chunks = await retrieveChunks(documentIds, lastUser.content);
      log("info", "chat.retrieved", {
        requestId,
        documentIds: documentIds.length,
        chunks: chunks.length,
      });

      const sources: Source[] = chunks.map(({ filename, pageNumber, chunkIndex, text, score }) => ({
        filename,
        pageNumber,
        chunkIndex,
        text,
        score,
      }));

      const result = streamText({
        model: chatModel(),
        system: buildSystemPrompt(chunks),
        messages: convertToCoreMessages(messages),
        // Don't retry: on a 429 the default retries just burn more quota.
        maxRetries: 0,
        // Write sources after the answer so the annotation attaches to an
        // existing assistant message (writing it first breaks useChat parsing).
        onFinish: () => {
          dataStream.writeMessageAnnotation({ type: "sources", sources });
          log("info", "chat.ok", {
            requestId,
            sources: sources.length,
            durationMs: Date.now() - startedAt,
          });
        },
      });
      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => {
      const status = (error as { statusCode?: number })?.statusCode;
      log("error", "chat.stream_failed", {
        requestId,
        status,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      if (status === 429) {
        return "The model is rate-limited (free-tier quota reached). Please wait a moment and try again.";
      }
      return "Failed to generate an answer";
    },
  });
}
