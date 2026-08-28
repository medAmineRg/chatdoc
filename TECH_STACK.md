# DocChat — Tech Stack

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router) | Recommended by the test. Frontend + API in one repo, zero-config Vercel deploy, built-in streaming. |
| Language | TypeScript (`strict: true`) | Mandatory. |
| LLM | Gemini `gemini-flash-latest` (via Vercel AI SDK) | Generous free tier, fast, easy token streaming. Model is env-configurable (`GEMINI_CHAT_MODEL`). |
| Embeddings | Gemini `gemini-embedding-001` (768 dims via `outputDimensionality`) | Same provider, one API key. Multilingual. |
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

## Why not LangChain / LlamaIndex

The whole RAG pipeline here is six small, pure modules — `chunk`, `embeddings`,
`retrieval`, `rerank`, `prompt`, `validation` — wired directly to the Vercel AI
SDK and the MongoDB driver. At this size, a framework would cost more than it saves:

- **Transparency.** Grounding depends entirely on the exact system prompt and the
  exact chunks we retrieve. Writing that directly (`lib/prompt.ts`, `lib/retrieval.ts`)
  keeps the behaviour obvious and easy to audit — no hidden prompt templates or
  retriever defaults to reverse-engineer.
- **Control over streaming.** Token streaming + the sources annotation are handled
  precisely with `streamText` / `createDataStreamResponse`; a higher-level chain
  abstraction would get in the way rather than help.
- **Fewer dependencies, less churn.** LangChain/LlamaIndex pull large trees that
  move fast; the direct SDKs keep the install small and the surface stable.
- **Testability.** Pure functions (chunking, prompt building, re-ranking) are unit-
  tested directly with no framework scaffolding (see `tests/`).

If the pipeline grew (many loaders, agents, tool-calling, a retriever zoo), a
framework would start to pay for itself — LlamaIndex in particular for ingestion
breadth. For a single-provider, single-store RAG app, direct SDKs are the simpler,
clearer choice.
