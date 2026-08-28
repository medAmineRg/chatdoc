import { extractText, getDocumentProxy } from "unpdf";

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

/**
 * Extract text from a PDF in the browser, page by page.
 *
 * Parsing happens client-side on purpose: a ~10 MB PDF exceeds Vercel's
 * serverless request-body limit, and parsing 50 pages is CPU-heavy enough
 * to risk the function timeout. We upload only the extracted text.
 */
export async function extractPdfPages(file: File): Promise<ParsedPage[]> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: false });

  const pages = Array.isArray(text) ? text : [text];
  return pages
    .map((pageText, i) => ({
      pageNumber: i + 1,
      text: (pageText ?? "").trim(),
    }))
    .filter((page) => page.text.length > 0);
}
