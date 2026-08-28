/**
 * Minimal structured logger.
 *
 * Emits one JSON object per line so logs are machine-parsable in any hosting
 * platform's log drain (Vercel, Docker, etc.). Prefer this over bare
 * `console.*` so every entry carries a consistent shape (ts, level, event, …).
 */

type Level = "info" | "warn" | "error";

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}
