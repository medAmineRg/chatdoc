"use client";

import { useState } from "react";
import { Uploader, type UploadedDoc } from "@/components/Uploader";
import { ChatPanel } from "@/components/ChatPanel";

export default function Home() {
  const [doc, setDoc] = useState<UploadedDoc | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-blue">DocChat</h1>
        <p className="mt-1 text-muted">
          Upload a PDF and ask questions about its content.
        </p>
      </div>

      {!doc && <Uploader onUploaded={setDoc} />}

      {doc && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-brand-blue-soft bg-brand-blue-soft/40 p-3 text-sm">
            <div>
              <span className="font-medium text-ink">{doc.filename}</span>
              <span className="text-muted">
                {" "}
                · {doc.pageCount} page{doc.pageCount > 1 ? "s" : ""} · {doc.chunkCount} chunks
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDoc(null)}
              className="text-brand-blue hover:underline"
            >
              New document
            </button>
          </div>

          <ChatPanel documentId={doc.documentId} />
        </div>
      )}
    </div>
  );
}
