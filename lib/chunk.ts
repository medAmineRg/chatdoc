import type { ParsedPage } from "@/lib/pdf";

/**
 * Chunking configuration.
 *
 * We target ~800-1000 tokens per chunk. Using a rough 4-chars-per-token
 * heuristic that is ~3500 characters, with ~15% overlap so context that
 * straddles a chunk boundary (a sentence cut in half) is preserved in the
 * neighbouring chunk and still retrievable.
 */
export const CHUNK_SIZE = 3500;
export const CHUNK_OVERLAP = 500;

const SEPARATORS = ["\n\n", "\n", ". ", " "];

export interface Chunk {
  pageNumber: number;
  chunkIndex: number;
  text: string;
}

/**
 * Recursively split a single string into pieces no larger than `size`,
 * preferring to break on the most semantic separator available (paragraph,
 * then line, then sentence, then word) before falling back to a hard cut.
 */
function splitText(text: string, size: number, separators: string[]): string[] {
  if (text.length <= size) return [text];

  const [separator, ...rest] = separators;
  if (separator === undefined) {
    // No separators left: hard-split on the character boundary.
    const pieces: string[] = [];
    for (let i = 0; i < text.length; i += size) {
      pieces.push(text.slice(i, i + size));
    }
    return pieces;
  }

  const parts = text.split(separator);
  const pieces: string[] = [];
  let current = "";

  for (const part of parts) {
    const candidate = current.length === 0 ? part : current + separator + part;
    if (candidate.length <= size) {
      current = candidate;
      continue;
    }
    if (current.length > 0) pieces.push(current);
    if (part.length > size) {
      pieces.push(...splitText(part, size, rest));
      current = "";
    } else {
      current = part;
    }
  }
  if (current.length > 0) pieces.push(current);
  return pieces;
}

/** Add a trailing overlap from the previous chunk to the start of each chunk. */
function withOverlap(pieces: string[], overlap: number): string[] {
  if (overlap <= 0) return pieces;
  return pieces.map((piece, i) => {
    if (i === 0) return piece;
    const prev = pieces[i - 1] ?? "";
    const tail = prev.slice(Math.max(0, prev.length - overlap));
    return `${tail} ${piece}`.trim();
  });
}

/**
 * Chunk a document page-by-page so every chunk keeps its source page number
 * (used for citations in F4). `chunkIndex` is a stable document-wide ordinal.
 */
export function chunkPages(
  pages: ParsedPage[],
  size = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const pieces = withOverlap(splitText(page.text, size, SEPARATORS), overlap);
    for (const piece of pieces) {
      const text = piece.trim();
      if (text.length === 0) continue;
      chunks.push({ pageNumber: page.pageNumber, chunkIndex, text });
      chunkIndex += 1;
    }
  }
  return chunks;
}
