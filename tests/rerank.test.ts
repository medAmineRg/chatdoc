import { describe, it, expect } from "vitest";
import {
  tokenize,
  lexicalScore,
  reciprocalRankFusion,
  hybridRerank,
} from "@/lib/rerank";
import type { RetrievedChunk } from "@/lib/types";

function chunk(chunkIndex: number, text: string, score: number): RetrievedChunk {
  return {
    documentId: "doc-1",
    filename: "file.pdf",
    pageNumber: 1,
    chunkIndex,
    text,
    score,
  };
}

describe("tokenize", () => {
  it("lowercases and splits on non-letters", () => {
    expect(tokenize("Hello, World! 42")).toEqual(["hello", "world", "42"]);
  });

  it("keeps French accented letters", () => {
    expect(tokenize("Déjà à côté")).toEqual(["déjà", "à", "côté"]);
  });

  it("keeps Arabic script", () => {
    expect(tokenize("مرحبا بالعالم")).toEqual(["مرحبا", "بالعالم"]);
  });
});

describe("lexicalScore", () => {
  it("is the fraction of distinct query terms present", () => {
    const q = tokenize("deadline payment terms");
    expect(lexicalScore(q, "the payment deadline is friday")).toBeCloseTo(2 / 3);
  });

  it("is 0 for an empty query", () => {
    expect(lexicalScore([], "anything")).toBe(0);
  });
});

describe("reciprocalRankFusion", () => {
  it("rewards items ranked highly in either list", () => {
    const scores = reciprocalRankFusion([
      ["a", "b", "c"],
      ["c", "b", "a"],
    ]);
    // b is 2nd in both lists; a and c are 1st in one and last in the other.
    expect(scores.get("b")).toBeGreaterThan(0);
    expect(scores.get("a")).toBeCloseTo(scores.get("c") ?? 0);
  });
});

describe("hybridRerank", () => {
  it("promotes an exact keyword match above a higher pure-vector score", () => {
    const candidates = [
      chunk(0, "an unrelated semantic paragraph", 0.92),
      chunk(1, "the invoice total is 4200 euros", 0.88),
    ];
    const ranked = hybridRerank(candidates, "invoice total", 2);
    expect(ranked[0]?.chunkIndex).toBe(1);
  });

  it("returns at most topK and preserves original scores", () => {
    const candidates = [
      chunk(0, "alpha", 0.9),
      chunk(1, "beta", 0.8),
      chunk(2, "gamma", 0.7),
    ];
    const ranked = hybridRerank(candidates, "alpha", 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.score).toBe(0.9);
  });
});
