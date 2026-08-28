import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { MAX_PAGES } from "@/lib/constants";
import { chunkPages } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { getChunksCollection } from "@/lib/mongodb";
import type { ChunkDoc } from "@/lib/types";
import type { ApiError, UploadRequest, UploadResponse } from "@/lib/api-types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/upload
 *
 * Receives text already extracted from a PDF in the browser (see lib/pdf.ts),
 * chunks it, embeds each chunk with Gemini and stores the vectors in MongoDB
 * Atlas. Returns a documentId used to scope subsequent chat queries.
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
  const chunks = chunkPages(pages);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "No extractable text found in the PDF" }, { status: 400 });
  }

  try {
    const embeddings = await embedTexts(chunks.map((c) => c.text));

    const now = new Date();
    const docs: ChunkDoc[] = chunks.map((chunk, i) => ({
      documentId,
      filename,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      embedding: embeddings[i] ?? [],
      createdAt: now,
    }));

    const collection = await getChunksCollection();
    await collection.insertMany(docs);

    return NextResponse.json({
      documentId,
      filename,
      pageCount: pages.length,
      chunkCount: docs.length,
    });
  } catch (err) {
    console.error("upload pipeline failed", err);
    return NextResponse.json(
      { error: "Failed to process the document" },
      { status: 500 },
    );
  }
}
