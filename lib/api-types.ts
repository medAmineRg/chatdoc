import type { ParsedPage } from "@/lib/pdf";
import type { RetrievedChunk } from "@/lib/types";

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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  documentIds: string[];
  messages: ChatMessage[];
}

/** A cited chunk sent to the client. `filename` identifies its source document. */
export type Source = Omit<RetrievedChunk, "documentId">;

export interface ChatResponse {
  answer: string;
  sources: Source[];
}
