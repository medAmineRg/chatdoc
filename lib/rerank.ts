import type { RetrievedChunk } from "@/lib/types";

/**
 * Hybrid retrieval re-ranking.
 *
 * Dense vector search alone can miss passages that share the exact keywords of
 * a query (names, codes, rare terms) but sit slightly apart in embedding space.
 * We over-fetch vector candidates, score each one lexically as well, and fuse
 * the two rankings with Reciprocal Rank Fusion (RRF). The result favours chunks
 * that are strong on *either* signal without needing a second Atlas index.
 */

/** RRF dampening constant; 60 is the value from the original RRF paper. */
export const RRF_K = 60;

/**
 * Split text into lowercased Unicode word tokens: runs of letters or digits.
 * Uses `\p{L}`/`\p{N}` so it works for Latin, French accents and Arabic script
 * alike (no `[a-z]` assumptions), and keeps numeric tokens so codes/amounts
 * like "4200" stay matchable. Punctuation and whitespace are dropped.
 */
export function tokenize(text: string): string[] {
  const matches = text.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu);
  return matches ?? [];
}

/**
 * Lexical overlap in [0,1]: the fraction of the query's distinct terms that
 * appear anywhere in the chunk. A cheap keyword signal to complement vectors.
 */
export function lexicalScore(queryTokens: string[], text: string): number {
  const unique = [...new Set(queryTokens)];
  if (unique.length === 0) return 0;
  const haystack = new Set(tokenize(text));
  let hits = 0;
  for (const term of unique) if (haystack.has(term)) hits += 1;
  return hits / unique.length;
}

/**
 * Reciprocal Rank Fusion. Each input is a list of item ids in ranked order
 * (best first). An item's fused score is the sum over lists of `1 / (k + rank)`,
 * so being near the top of either list is rewarded.
 */
export function reciprocalRankFusion(rankings: string[][], k = RRF_K): Map<string, number> {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((itemId, index) => {
      const rank = index + 1;
      scores.set(itemId, (scores.get(itemId) ?? 0) + 1 / (k + rank));
    });
  }
  return scores;
}

/** Stable id for a candidate chunk (unique across documents). */
function chunkId(chunk: RetrievedChunk): string {
  return `${chunk.documentId}:${chunk.chunkIndex}`;
}

/**
 * Re-rank vector candidates by fusing their dense-vector ranking with a lexical
 * ranking, then return the top `topK`. Each chunk's original `score` is kept
 * untouched so the UI still shows the true vector similarity.
 */
export function hybridRerank(
  candidates: RetrievedChunk[],
  question: string,
  topK: number,
  k = RRF_K,
): RetrievedChunk[] {
  if (candidates.length <= 1) return candidates.slice(0, topK);

  const queryTokens = tokenize(question);

  const byVector = [...candidates].sort((a, b) => b.score - a.score).map(chunkId);

  const lexical = new Map(
    candidates.map((c) => [chunkId(c), lexicalScore(queryTokens, c.text)] as const),
  );
  const byLexical = [...candidates]
    .sort((a, b) => (lexical.get(chunkId(b)) ?? 0) - (lexical.get(chunkId(a)) ?? 0))
    .map(chunkId);

  const fused = reciprocalRankFusion([byVector, byLexical], k);

  return [...candidates]
    .sort((a, b) => {
      const byFused = (fused.get(chunkId(b)) ?? 0) - (fused.get(chunkId(a)) ?? 0);
      if (byFused !== 0) return byFused;
      // On a fused tie (common with few candidates), prefer the stronger
      // keyword match, then the stronger vector score.
      const byLex = (lexical.get(chunkId(b)) ?? 0) - (lexical.get(chunkId(a)) ?? 0);
      if (byLex !== 0) return byLex;
      return b.score - a.score;
    })
    .slice(0, topK);
}
