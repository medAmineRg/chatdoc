import { NextResponse } from "next/server";
import { generateText } from "ai";
import { chatModel } from "@/lib/llm";
import { buildSystemPrompt } from "@/lib/prompt";
import { retrieveChunks } from "@/lib/retrieval";
import type { ApiError, ChatRequest, ChatResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chat
 *
 * Retrieves the most relevant chunks for the latest user question, builds a
 * grounded prompt and asks Gemini to answer using only the document context.
 * (Streaming is added in F6.)
 */
export async function POST(req: Request): Promise<NextResponse<ChatResponse | ApiError>> {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { documentId, messages } = body;
  if (typeof documentId !== "string" || documentId.length === 0) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    return NextResponse.json({ error: "No user message found" }, { status: 400 });
  }

  try {
    const chunks = await retrieveChunks(documentId, lastUser.content);
    const { text } = await generateText({
      model: chatModel(),
      system: buildSystemPrompt(chunks),
      messages,
    });

    return NextResponse.json({ answer: text });
  } catch (err) {
    console.error("chat failed", err);
    return NextResponse.json({ error: "Failed to generate an answer" }, { status: 500 });
  }
}
