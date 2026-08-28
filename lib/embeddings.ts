import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, embedMany } from "ai";
import { env } from "@/lib/env";

/**
 * Gemini embeddings.
 *
 * gemini-embedding-001 defaults to 3072 dimensions but supports a reduced
 * output; we request 768 so vectors match the Atlas index numDimensions
 * (see docs/atlas-vector-index.json). Documents and queries are embedded with
 * matching-but-distinct task types, which improves retrieval quality.
 */
export const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function embeddingModel(taskType: TaskType) {
  const google = createGoogleGenerativeAI({ apiKey: env.geminiApiKey });
  return google.textEmbeddingModel(EMBEDDING_MODEL, {
    outputDimensionality: EMBEDDING_DIMENSIONS,
    taskType,
  });
}

/** Embed many chunk texts at once (batched by the SDK). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModel("RETRIEVAL_DOCUMENT"),
    values: texts,
  });
  return embeddings;
}

/** Embed a single query string for similarity search. */
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel("RETRIEVAL_QUERY"),
    value: text,
  });
  return embedding;
}
