import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocChat — Smartly.ai",
  description: "Ask questions about your PDF documents (RAG)",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <header className="bg-brand-navy text-white">
            <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
              <span className="text-lg font-bold tracking-tight">SMARTLY.AI</span>
              <span className="text-white/50">/</span>
              <span className="text-sm text-white/80">DocChat</span>
            </div>
          </header>

          <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
            {children}
          </main>

          <footer className="border-t border-brand-blue-soft">
            <div className="mx-auto max-w-4xl px-6 py-4 text-xs text-muted">
              Ask questions about your PDF — answers grounded in the document.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
