"use client";

import { useState } from "react";
import { Uploader, type UploadedDoc } from "@/components/Uploader";

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

      <Uploader onUploaded={setDoc} />

      {doc && (
        <div className="rounded-lg border border-brand-blue-soft bg-brand-blue-soft/40 p-4 text-sm">
          <p className="font-medium text-ink">{doc.filename}</p>
          <p className="text-muted">
            {doc.pageCount} page{doc.pageCount > 1 ? "s" : ""} · document ready.
            Chat coming next (F3).
          </p>
        </div>
      )}
    </div>
  );
}
