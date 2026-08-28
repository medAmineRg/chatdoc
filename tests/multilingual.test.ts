import { describe, it, expect } from "vitest";
import { tokenize, lexicalScore } from "@/lib/rerank";

// The retrieval pipeline is language-agnostic: extraction (unpdf) is Unicode,
// the tokenizer below is `\p{L}`-based, the embedding model is multilingual and
// the prompt answers in the question's language. These tests lock in the
// tokenizer/lexical behaviour for French (accents) and Arabic (RTL script).

describe("multilingual lexical matching", () => {
  it("matches French query terms against accented source text", () => {
    const query = tokenize("période de garantie");
    const score = lexicalScore(query, "La période de garantie standard est de 24 mois.");
    expect(score).toBe(1); // all three distinct terms present
  });

  it("matches Arabic query terms against Arabic source text", () => {
    const query = tokenize("فترة الضمان");
    const score = lexicalScore(query, "مدة الضمان القياسية هي 24 شهرا فترة كاملة");
    expect(score).toBe(1);
  });

  it("preserves accents (no ASCII folding) so terms stay distinct", () => {
    expect(tokenize("période")).not.toEqual(tokenize("periode"));
  });
});
