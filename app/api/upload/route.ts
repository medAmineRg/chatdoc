import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { MAX_PAGES } from "@/lib/constants";
import type { ApiError, UploadRequest, UploadResponse } from "@/lib/api-types";

export const runtime = "nodejs";

/**
 * POST /api/upload
 *
 * Receives text already extracted from a PDF in the browser (see lib/pdf.ts).
 * F1 validates the payload and returns a documentId. The chunking + embedding
 * pipeline is wired in F2.
 */
export async function POST(req: Request): Promise<NextResponse<UploadResponse | ApiError>> {
  let body: UploadRequest;
  try {
    body = (await req.json()) as UploadRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { filename, pages } = body;

  if (typeof filename !== "string" || filename.length === 0) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }
  if (!Array.isArray(pages) || pages.length === 0) {
    return NextResponse.json({ error: "No extractable text found in the PDF" }, { status: 400 });
  }
  if (pages.length > MAX_PAGES) {
    return NextResponse.json(
      { error: `Document has too many pages (max ${MAX_PAGES})` },
      { status: 413 },
    );
  }

  const documentId = randomUUID();

  return NextResponse.json({
    documentId,
    filename,
    pageCount: pages.length,
    chunkCount: 0,
  });
}
