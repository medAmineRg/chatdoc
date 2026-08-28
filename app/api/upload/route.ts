import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { chunkPages } from "@/lib/chunk";
import { embedTexts } from "@/lib/embeddings";
import { getChunksCollection } from "@/lib/mongodb";
import { log } from "@/lib/logger";
import { UPLOAD_LIMIT, checkRateLimit, clientKey } from "@/lib/rate-limit";
import { MAX_TOTAL_CHARS, jsonError, uploadSchema, zodDetails } from "@/lib/validation";
import type { ChunkDoc } from "@/lib/types";
import type { ApiError, UploadResponse } from "@/lib/api-types";

/** 429 response carrying a Retry-After header (seconds). */
function rateLimited(retryAfterS: number): NextResponse<ApiError> {
  const res = jsonError(429, "Too many requests. Please slow down.");
  res.headers.set("Retry-After", String(retryAfterS));
  return res;
}

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/upload
 *
 * Receives text already extracted from a PDF in the browser (see lib/pdf.ts),
 * chunks it, embeds each chunk with Gemini and stores the vectors in MongoDB
 * Atlas. Returns a documentId used to scope subsequent chat queries.
 *
 * Errors use a consistent shape: { error, details? } with correct HTTP codes.
 */
export async function POST(req: Request): Promise<NextResponse<UploadResponse | ApiError>> {
  const requestId = randomUUID();
  const startedAt = Date.now();

  const limit = checkRateLimit(clientKey(req), UPLOAD_LIMIT);
  if (!limit.ok) {
    log("warn", "upload.rate_limited", { requestId, retryAfterS: limit.retryAfterS });
    return rateLimited(limit.retryAfterS);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const parsed = uploadSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, "Invalid request", zodDetails(parsed.error));
  }
  const { filename, pages } = parsed.data;

  const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
  if (totalChars > MAX_TOTAL_CHARS) {
    return jsonError(413, "Document is too large to process");
  }

  const documentId = randomUUID();
  const chunks = chunkPages(pages);
  if (chunks.length === 0) {
    return jsonError(400, "No extractable text found in the PDF");
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

    log("info", "upload.ok", {
      requestId,
      documentId,
      pageCount: pages.length,
      chunkCount: docs.length,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      documentId,
      filename,
      pageCount: pages.length,
      chunkCount: docs.length,
    });
  } catch (err) {
    log("error", "upload.failed", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonError(500, "Failed to process the document");
  }
}
