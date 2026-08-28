export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-blue">DocChat</h1>
        <p className="mt-1 text-muted">
          Upload a PDF and ask questions about its content.
        </p>
      </div>

      <div className="rounded-lg border border-brand-blue-soft bg-brand-blue-soft/40 p-8 text-center text-muted">
        Upload and chat coming next (F1–F6).
      </div>
    </div>
  );
}
