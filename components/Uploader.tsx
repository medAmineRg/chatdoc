"use client";

import { useCallback, useRef, useState } from "react";
import { extractPdfPages } from "@/lib/pdf";
import { ACCEPTED_MIME, MAX_FILE_BYTES } from "@/lib/constants";
import type { ApiError, UploadResponse } from "@/lib/api-types";

type Stage = "idle" | "parsing" | "indexing" | "done" | "error";

const STAGE_LABEL: Record<Stage, string> = {
  idle: "",
  parsing: "Parsing PDF…",
  indexing: "Indexing (chunking + embeddings)…",
  done: "Ready",
  error: "Error",
};

export interface UploadedDoc {
  documentId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
}

export function Uploader({
  onUploaded,
  compact = false,
}: {
  onUploaded: (doc: UploadedDoc) => void;
  /** Smaller dropzone used once one or more documents are already uploaded. */
  compact?: boolean;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setMessage("");

      if (file.type !== ACCEPTED_MIME) {
        setStage("error");
        setMessage("Please select a PDF file.");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStage("error");
        setMessage("File is too large (max 10 MB).");
        return;
      }

      try {
        setStage("parsing");
        const pages = await extractPdfPages(file);
        if (pages.length === 0) {
          setStage("error");
          setMessage("No selectable text found. Is this a scanned PDF?");
          return;
        }

        setStage("indexing");
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, pages }),
        });

        if (!res.ok) {
          const err = (await res.json()) as ApiError;
          setStage("error");
          setMessage(err.error ?? "Upload failed.");
          return;
        }

        const doc = (await res.json()) as UploadResponse;
        onUploaded(doc);
        // Reset so the same uploader can immediately accept another PDF.
        setStage("idle");
      } catch {
        setStage("error");
        setMessage("Something went wrong while processing the PDF.");
      }
    },
    [onUploaded],
  );

  const busy = stage === "parsing" || stage === "indexing";

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={
          compact
            ? "flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-blue/40 bg-brand-blue-soft/40 px-4 py-3 text-center text-sm transition hover:border-brand-blue hover:bg-brand-blue-soft disabled:cursor-not-allowed disabled:opacity-60"
            : "flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand-blue/40 bg-brand-blue-soft/40 px-6 py-10 text-center transition hover:border-brand-blue hover:bg-brand-blue-soft disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        <span className="font-medium text-brand-blue">
          {compact ? "+ Add another PDF" : "Click to upload a PDF"}
        </span>
        {!compact && (
          <span className="text-sm text-muted">Text-based PDF · max 10 MB · 50 pages</span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {stage !== "idle" && (
        <div
          className={
            stage === "error"
              ? "text-sm text-red-600"
              : "flex items-center gap-2 text-sm text-brand-blue"
          }
          role="status"
        >
          {busy && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          )}
          <span>{stage === "error" ? message : STAGE_LABEL[stage]}</span>
        </div>
      )}
    </div>
  );
}
