import { convertToCoreMessages, createDataStreamResponse, streamText } from "ai";
import { chatModel } from "@/lib/llm";
import { buildSystemPrompt } from "@/lib/prompt";
import { retrieveChunks } from "@/lib/retrieval";
import { chatSchema, jsonError, zodDetails } from "@/lib/validation";
import type { Source } from "@/lib/api-types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chat
 *
 * Retrieves the most relevant chunks for the latest user question, builds a
 * grounded prompt and streams Gemini's answer token-by-token (F6). The source
 * chunks (F4) are sent up-front as a message annotation so the client can
 * render them alongside the streamed answer.
 */
export async function POST(req: Request) {
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
  const { documentId, messages } = parsed.data;

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return jsonError(400, "No user message found");
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const chunks = await retrieveChunks(documentId, lastUser.content);

      const sources: Source[] = chunks.map(({ pageNumber, chunkIndex, text, score }) => ({
        pageNumber,
        chunkIndex,
        text,
        score,
      }));
      dataStream.writeMessageAnnotation({ type: "sources", sources });

      const result = streamText({
        model: chatModel(),
        system: buildSystemPrompt(chunks),
        messages: convertToCoreMessages(messages),
      });
      result.mergeIntoDataStream(dataStream);
    },
    onError: (error) => {
      console.error("chat stream failed", error);
      return "Failed to generate an answer";
    },
  });
}
