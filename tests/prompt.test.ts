import { describe, it, expect } from "vitest";
import { buildSystemPrompt, formatContext, SYSTEM_RULES } from "@/lib/prompt";
import type { RetrievedChunk } from "@/lib/types";

function chunk(partial: Partial<RetrievedChunk>): RetrievedChunk {
  return {
    documentId: "doc-1",
    filename: "file.pdf",
    pageNumber: 1,
    chunkIndex: 0,
    text: "hello",
    score: 0.9,
    ...partial,
  };
}

describe("formatContext", () => {
  it("returns a placeholder when there are no chunks", () => {
    expect(formatContext([])).toContain("no relevant passages");
  });

  it("numbers sources and includes page markers", () => {
    const out = formatContext([
      chunk({ pageNumber: 2, text: "first passage" }),
      chunk({ pageNumber: 5, text: "second passage" }),
    ]);
    expect(out).toContain("[Source 1 | page 2]");
    expect(out).toContain("[Source 2 | page 5]");
    expect(out).toContain("first passage");
  });

  it("renders a null page as '?'", () => {
    expect(formatContext([chunk({ pageNumber: null })])).toContain("page ?");
  });
});

describe("buildSystemPrompt", () => {
  it("embeds the grounding rules and the context block", () => {
    const prompt = buildSystemPrompt([chunk({ text: "grounded fact" })]);
    expect(prompt).toContain(SYSTEM_RULES);
    expect(prompt).toContain("DOCUMENT CONTEXT");
    expect(prompt).toContain("grounded fact");
  });
});
