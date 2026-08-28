import type { ParsedPage } from "@/lib/pdf";

export interface UploadRequest {
  filename: string;
  pages: ParsedPage[];
}

export interface UploadResponse {
  documentId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
