import type { RetrievedChunk } from "@/lib/types";

/**
 * Grounding rules for the assistant. The model must answer only from the
 * provided document context (F3) and explicitly say when the answer is not
 * present, rather than falling back on general knowledge.
 */
export const SYSTEM_RULES = [
  "You are DocChat, an assistant that answers questions about a single uploaded document.",
  "Use ONLY the context passages provided below to answer.",
  "If the answer is not contained in the context, reply that the information is not in the document. Do not use outside knowledge.",
  "When helpful, cite the page number(s) you used, e.g. (page 2).",
  "Answer in the same language as the question.",
  "Be concise and factual.",
].join("\n");

/** Render retrieved chunks as a numbered context block with page markers. */
export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(no relevant passages found)";
  return chunks
    .map((chunk, i) => {
      const page = chunk.pageNumber === null ? "?" : chunk.pageNumber;
      return `[Source ${i + 1} | page ${page}]\n${chunk.text}`;
    })
    .join("\n\n");
}

/** Build the full system prompt: grounding rules + document context. */
export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  return `${SYSTEM_RULES}\n\n--- DOCUMENT CONTEXT ---\n${formatContext(chunks)}\n--- END CONTEXT ---`;
}
