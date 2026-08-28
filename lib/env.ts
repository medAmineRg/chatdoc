/**
 * Centralised access to required server-side environment variables.
 * Throws early with a clear message if a variable is missing, so a
 * misconfigured deployment fails loudly instead of at request time.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get mongodbUri(): string {
    return required("MONGODB_URI");
  },
  get geminiApiKey(): string {
    return required("GEMINI_API_KEY");
  },
};
