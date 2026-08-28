import { getChunksCollection, VECTOR_INDEX_NAME } from "@/lib/mongodb";
import { embedQuery } from "@/lib/embeddings";
import { hybridRerank } from "@/lib/rerank";
import type { RetrievedChunk } from "@/lib/types";

export const DEFAULT_TOP_K = 5;
/** Over-fetch factor: pull this many × topK vector hits, then re-rank down. */
export const CANDIDATE_MULTIPLIER = 4;

/**
 * Retrieve the most relevant chunks to `question` across one or more documents.
 *
 * Runs Atlas Vector Search (cosine) over the given `documentIds` to pull a wider
 * candidate set, then applies hybrid re-ranking (dense vector + lexical, fused
 * via RRF) to pick the final top-k. Searching several documents at once powers
 * cross-document Q&A. The `$vectorSearchScore` is preserved so the frontend can
 * display source relevance (F4).
 */
export async function retrieveChunks(
  documentIds: string[],
  question: string,
  topK = DEFAULT_TOP_K,
): Promise<RetrievedChunk[]> {
  if (documentIds.length === 0) return [];

  const queryVector = await embedQuery(question);
  const chunks = await getChunksCollection();

  const candidateLimit = topK * CANDIDATE_MULTIPLIER;
  const candidates = await chunks
    .aggregate<RetrievedChunk>([
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector,
          numCandidates: Math.max(candidateLimit * 20, 100),
          limit: candidateLimit,
          filter: { documentId: { $in: documentIds } },
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

  return hybridRerank(candidates, question, topK);
}
