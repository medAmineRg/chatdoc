"use client";

import { useChat } from "@ai-sdk/react";
import type { Source } from "@/lib/api-types";
import { Sources } from "@/components/Sources";

/** Pull the sources annotation (written by /api/chat) off a message. */
function sourcesOf(annotations: unknown): Source[] {
  if (!Array.isArray(annotations)) return [];
  for (const a of annotations) {
    if (
      a &&
      typeof a === "object" &&
      (a as { type?: unknown }).type === "sources" &&
      Array.isArray((a as { sources?: unknown }).sources)
    ) {
      return (a as { sources: Source[] }).sources;
    }
  }
  return [];
}

export function ChatPanel({ documentId }: { documentId: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
    body: { documentId },
  });

  const busy = isLoading;
  const awaitingFirstToken = isLoading && messages[messages.length - 1]?.role === "user";

  return (
    <div className="flex h-[28rem] flex-col rounded-lg border border-brand-blue-soft">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask a question about the document to get started.
          </p>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[80%]">
              <div
                className={
                  m.role === "user"
                    ? "whitespace-pre-wrap rounded-lg bg-brand-blue px-3 py-2 text-sm text-white"
                    : "whitespace-pre-wrap rounded-lg bg-brand-blue-soft px-3 py-2 text-sm text-ink"
                }
              >
                {m.content}
              </div>
              {m.role === "assistant" && <Sources sources={sourcesOf(m.annotations)} />}
            </div>
          </div>
        ))}

        {awaitingFirstToken && <p className="text-sm text-muted">Thinking…</p>}
        {error && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-brand-blue-soft p-3"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about the document…"
          className="flex-1 rounded-md border border-brand-blue-soft px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
