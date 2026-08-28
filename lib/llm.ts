import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@/lib/env";

/** Chat model, overridable via env so it can track the current Gemini flash alias. */
export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-flash-latest";

/** Gemini chat model used for answer generation. */
export function chatModel() {
  const google = createGoogleGenerativeAI({ apiKey: env.geminiApiKey });
  return google(CHAT_MODEL);
}
