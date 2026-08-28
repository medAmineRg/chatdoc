import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { env } from "@/lib/env";

/**
 * Gemini text-embedding-004 produces 768-dimensional vectors, which must match
 * the numDimensions in the Atlas vector index (see docs/atlas-vector-index.json).
 */
export const EMBEDDING_DIMENSIONS = 768;

function embeddingModel() {
  const google = createGoogleGenerativeAI({ apiKey: env.geminiApiKey });
  return google.textEmbeddingModel("text-embedding-004");
}

/** Embed many chunk texts at once (batched by the SDK). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModel(),
    values: texts,
  });
  return embeddings;
}

/** Embed a single query string for similarity search. */
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel(),
    value: text,
  });
  return embedding;
}
