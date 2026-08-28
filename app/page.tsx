"use client";

import { useState } from "react";
import { Uploader, type UploadedDoc } from "@/components/Uploader";
import { ChatPanel } from "@/components/ChatPanel";
import { AgentIcon } from "@/components/AgentIcon";

export default function Home() {
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function addDoc(doc: UploadedDoc) {
    setDocs((prev) =>
      prev.some((d) => d.documentId === doc.documentId) ? prev : [...prev, doc],
    );
    setSelectedIds((prev) => new Set(prev).add(doc.documentId));
  }

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reset() {
    setDocs([]);
    setSelectedIds(new Set());
  }

  const selected = [...selectedIds];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-sm">
          <AgentIcon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="bg-brand-gradient bg-clip-text text-2xl font-bold text-transparent">
            DocChat
          </h1>
          <p className="mt-0.5 text-muted">
            Upload one or more PDFs and ask questions across them.
          </p>
        </div>
      </div>

      {docs.length === 0 ? (
        <Uploader onUploaded={addDoc} />
      ) : (
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-brand-blue-soft p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">
                Documents ({selectedIds.size}/{docs.length} selected)
              </span>
              <button
                type="button"
                onClick={reset}
                className="text-sm text-brand-blue hover:underline"
              >
                Clear all
              </button>
            </div>

            <ul className="space-y-1.5">
              {docs.map((d) => (
                <li key={d.documentId}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-brand-blue-soft/40">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(d.documentId)}
                      onChange={() => toggle(d.documentId)}
                      className="h-4 w-4 accent-brand-blue"
                    />
                    <span className="font-medium text-ink">{d.filename}</span>
                    <span className="text-muted">
                      · {d.pageCount} page{d.pageCount > 1 ? "s" : ""} · {d.chunkCount} chunks
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <Uploader onUploaded={addDoc} compact />
          </div>

          <ChatPanel documentIds={selected} />
        </div>
      )}
    </div>
  );
}
