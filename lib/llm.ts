import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@/lib/env";

export const CHAT_MODEL = "gemini-2.0-flash";

/** Gemini chat model used for answer generation. */
export function chatModel() {
  const google = createGoogleGenerativeAI({ apiKey: env.geminiApiKey });
  return google(CHAT_MODEL);
}
