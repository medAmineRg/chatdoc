"use client";

import type { FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import type { Source } from "@/lib/api-types";
import { Sources } from "@/components/Sources";
import { AgentIcon } from "@/components/AgentIcon";

/** Gradient avatar badge shown next to the assistant's replies. */
function AgentAvatar() {
  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-sm">
      <AgentIcon className="h-4 w-4" />
    </span>
  );
}

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

export function ChatPanel({ documentIds }: { documentIds: string[] }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/chat",
  });

  const busy = isLoading;
  const noneSelected = documentIds.length === 0;

  // Send the current selection with each request (selection changes at runtime,
  // so passing it here avoids a stale value captured at hook init).
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    handleSubmit(e, { body: { documentIds } });
  }
  const awaitingFirstToken = isLoading && messages[messages.length - 1]?.role === "user";

  return (
    <div className="flex h-[28rem] flex-col rounded-lg border border-brand-blue-soft">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            {noneSelected
              ? "Select at least one document to ask about."
              : "Ask a question about the selected document(s) to get started."}
          </p>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={isUser ? "flex justify-end" : "flex justify-start gap-2"}>
              {!isUser && <AgentAvatar />}
              <div className="max-w-[80%]">
                <div
                  className={
                    isUser
                      ? "whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand-blue px-3 py-2 text-sm text-white"
                      : "whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-brand-blue-soft px-3 py-2 text-sm text-ink"
                  }
                >
                  {m.content}
                </div>
                {!isUser && <Sources sources={sourcesOf(m.annotations)} />}
              </div>
            </div>
          );
        })}

        {awaitingFirstToken && (
          <div className="flex justify-start gap-2">
            <AgentAvatar />
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-brand-blue-soft px-3 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-blue [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-blue [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-blue" />
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600">{error.message || "Something went wrong. Please try again."}</p>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-brand-blue-soft p-3"
      >
        <input
          value={input}
          onChange={handleInputChange}
          disabled={noneSelected}
          placeholder={noneSelected ? "Select a document first…" : "Ask about the document…"}
          className="flex-1 rounded-md border border-brand-blue-soft px-3 py-2 text-sm outline-none focus:border-brand-blue disabled:cursor-not-allowed disabled:bg-brand-blue-soft/30"
        />
        <button
          type="submit"
          disabled={busy || noneSelected || input.trim().length === 0}
          className="rounded-md bg-brand-gradient px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
