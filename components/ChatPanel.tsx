"use client";

import { useState } from "react";
import type { ApiError, ChatMessage, ChatResponse } from "@/lib/api-types";

export function ChatPanel({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>("");

  async function send() {
    const question = input.trim();
    if (question.length === 0 || pending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, messages: nextMessages }),
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiError;
        setError(err.error ?? "Failed to get an answer.");
        return;
      }

      const data = (await res.json()) as ChatResponse;
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-lg border border-brand-blue-soft">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted">
            Ask a question about the document to get started.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] whitespace-pre-wrap rounded-lg bg-brand-blue px-3 py-2 text-sm text-white"
                  : "max-w-[80%] whitespace-pre-wrap rounded-lg bg-brand-blue-soft px-3 py-2 text-sm text-ink"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {pending && <p className="text-sm text-muted">Thinking…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-center gap-2 border-t border-brand-blue-soft p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="Ask about the document…"
          className="flex-1 rounded-md border border-brand-blue-soft px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={pending || input.trim().length === 0}
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-navy disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
