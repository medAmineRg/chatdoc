"use client";

import { useState } from "react";
import type { Source } from "@/lib/api-types";

const PREVIEW_CHARS = 240;

export function Sources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-brand-blue hover:underline"
      >
        {open ? "Hide" : "Show"} sources ({sources.length})
      </button>

      {open && (
        <ul className="mt-2 space-y-2">
          {sources.map((s) => (
            <li
              key={s.chunkIndex}
              className="rounded-md border border-brand-blue-soft bg-white p-2 text-xs"
            >
              <div className="mb-1 flex items-center justify-between text-muted">
                <span>{s.pageNumber === null ? "Page ?" : `Page ${s.pageNumber}`}</span>
                <span className="rounded bg-brand-blue-soft px-1.5 py-0.5 font-medium text-brand-blue">
                  {(s.score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-ink/80">
                {s.text.length > PREVIEW_CHARS
                  ? `${s.text.slice(0, PREVIEW_CHARS).trim()}…`
                  : s.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
