import { z } from "zod";
import { NextResponse } from "next/server";
import { MAX_PAGES } from "@/lib/constants";
import type { ApiError } from "@/lib/api-types";

/** Cap on total extracted characters, guards against oversized payloads. */
export const MAX_TOTAL_CHARS = 1_200_000; // ~50 pages of dense text

export const parsedPageSchema = z.object({
  pageNumber: z.number().int().positive(),
  text: z.string(),
});

export const uploadSchema = z.object({
  filename: z.string().min(1).max(255),
  pages: z.array(parsedPageSchema).min(1).max(MAX_PAGES),
});

/**
 * Messages arrive from the useChat hook with extra fields (id, parts…), so we
 * validate only what we rely on and pass the rest through untouched.
 */
export const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system", "data"]),
    content: z.string(),
  })
  .passthrough();

export const chatSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(20),
  messages: z.array(chatMessageSchema).min(1),
});

/** Consistent structured error response. */
export function jsonError(
  status: number,
  message: string,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json<ApiError>(
    details === undefined ? { error: message } : { error: message, details },
    { status },
  );
}

/** Turn a Zod error into a flat field->messages map for the `details` payload. */
export function zodDetails(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
