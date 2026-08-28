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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  documentId: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  answer: string;
}
