# DocChat — Tech Stack

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) | Recommended by the test. Frontend + API in one repo, zero-config Vercel deploy, built-in streaming. |
| Language | TypeScript (`strict: true`) | Mandatory. |
| LLM | Gemini `gemini-2.0-flash` (via Vercel AI SDK) | Generous free tier, fast, easy token streaming. |
| Embeddings | Gemini `text-embedding-004` (768 dims) | Same provider, one API key. |
| Vector store | MongoDB Atlas Vector Search | "Appreciated" in the brief. One DB for docs + vectors, cosine `$vectorSearch` returns similarity score. |
| PDF parsing | Client-side (`unpdf` / pdf.js in browser) | Avoids serverless body limit (~4.5 MB) and timeout on heavy parsing. |
| Validation | zod | Input validation + structured errors. |
| UI | Tailwind + shadcn/ui + `useChat` (AI SDK) | Fast, clean, handles chat + streaming state. |
| Deploy | Vercel | Mandatory. |

## Why client-side PDF parsing

1. A 10 MB PDF exceeds Vercel's ~4.5 MB request body limit — can't POST the raw file.
2. Parsing 50 pages is CPU-heavy and eats the function timeout.

Browser extracts the text → sends only text to the API → serverless function stays small and fast (embeddings + DB write only).

## Serverless gotchas handled

- **MongoDB connections:** cache `MongoClient` in a global singleton so cold starts don't exhaust the connection pool.
- **Embeddings within timeout:** batch chunks; show progress in the F1 UI while they compute.

## Data model

```
Collection: chunks
{
  _id, documentId, filename,
  pageNumber, chunkIndex,
  text,
  embedding: [768 floats]   // Atlas vector index on this field
}
```

Atlas vector index: `numDimensions: 768`, `similarity: "cosine"`.

## Chunking

Recursive character split, ~800–1000 tokens per chunk, ~15% overlap.
