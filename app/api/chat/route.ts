import { NextResponse } from "next/server";
import { convertToCoreMessages, createDataStreamResponse, streamText } from "ai";
import { chatModel } from "@/lib/llm";
import { buildSystemPrompt } from "@/lib/prompt";
import { retrieveChunks } from "@/lib/retrieval";
import type { ApiError, ChatRequest, Source } from "@/lib/api-types";

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
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json<ApiError>({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { documentId, messages } = body;
  if (typeof documentId !== "string" || documentId.length === 0) {
    return NextResponse.json<ApiError>({ error: "documentId is required" }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json<ApiError>({ error: "messages is required" }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json<ApiError>({ error: "No user message found" }, { status: 400 });
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
