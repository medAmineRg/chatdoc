import { getChunksCollection, VECTOR_INDEX_NAME } from "@/lib/mongodb";
import { embedQuery } from "@/lib/embeddings";
import type { RetrievedChunk } from "@/lib/types";

export const DEFAULT_TOP_K = 5;

/**
 * Retrieve the most similar chunks to `question` within a document using
 * Atlas Vector Search (cosine). The `$vectorSearchScore` is returned so the
 * frontend can display source relevance (F4).
 */
export async function retrieveChunks(
  documentId: string,
  question: string,
  topK = DEFAULT_TOP_K,
): Promise<RetrievedChunk[]> {
  const queryVector = await embedQuery(question);
  const chunks = await getChunksCollection();

  const results = await chunks
    .aggregate<RetrievedChunk>([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector,
          numCandidates: Math.max(topK * 20, 100),
          limit: topK,
          filter: { documentId },
        },
      },
      {
        $project: {
          _id: 0,
          documentId: 1,
          filename: 1,
          pageNumber: 1,
          chunkIndex: 1,
          text: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ])
    .toArray();

  return results;
}
