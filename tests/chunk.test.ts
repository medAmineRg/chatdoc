import { describe, it, expect } from "vitest";
import { chunkPages, CHUNK_SIZE } from "@/lib/chunk";
import type { ParsedPage } from "@/lib/pdf";

describe("chunkPages", () => {
  it("preserves the source page number on every chunk", () => {
    const pages: ParsedPage[] = [
      { pageNumber: 1, text: "alpha" },
      { pageNumber: 2, text: "beta" },
    ];
    const chunks = chunkPages(pages);
    expect(chunks.map((c) => c.pageNumber)).toEqual([1, 2]);
  });

  it("assigns a stable document-wide chunkIndex", () => {
    const pages: ParsedPage[] = [
      { pageNumber: 1, text: "one" },
      { pageNumber: 2, text: "two" },
      { pageNumber: 3, text: "three" },
    ];
    expect(chunkPages(pages).map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
  });

  it("drops empty / whitespace-only pages", () => {
    const pages: ParsedPage[] = [
      { pageNumber: 1, text: "   " },
      { pageNumber: 2, text: "content" },
    ];
    const chunks = chunkPages(pages);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.pageNumber).toBe(2);
  });

  it("splits an oversized page into multiple chunks within the size bound", () => {
    const long = "word ".repeat(2000); // ~10k chars, well over CHUNK_SIZE
    const chunks = chunkPages([{ pageNumber: 1, text: long }]);
    expect(chunks.length).toBeGreaterThan(1);
    // Allow for the prepended overlap, but chunks must stay bounded.
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(CHUNK_SIZE * 2);
    }
  });

  it("applies overlap so successive chunks share a boundary", () => {
    const long = "sentence. ".repeat(1000);
    const chunks = chunkPages([{ pageNumber: 1, text: long }]);
    expect(chunks.length).toBeGreaterThan(1);
    // With overlap, the combined length exceeds the raw text length.
    const combined = chunks.reduce((n, c) => n + c.text.length, 0);
    expect(combined).toBeGreaterThan(long.trim().length);
  });
});
