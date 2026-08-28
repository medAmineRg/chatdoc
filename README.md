# DocChat

Ask questions about your PDF. Upload a document, and DocChat answers in natural
language using **only** the content of that document — a small, production-shaped
RAG (Retrieval-Augmented Generation) pipeline.

Built for the Smartly.ai technical test. Stack: **Next.js 15 (App Router) +
TypeScript (strict) + MongoDB Atlas Vector Search + Google Gemini**, deployed on
Vercel.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                          │
│                                                                   │
│  1. Select PDF  ──►  unpdf extracts text (client-side)            │
│                          │  pages: [{ pageNumber, text }]         │
│                          ▼                                         │
│                    POST /api/upload ─────────────────────┐        │
│  4. Chat (useChat) ──► POST /api/chat ──► SSE stream ◄──┐ │        │
└──────────────────────────────────────────────────────┼─┼────────┘
                                                        │ │
┌───────────────── Vercel serverless (Node) ───────────┼─┼────────┐
│                                                       │ ▼        │
│  /api/upload:  chunk → embed (Gemini) → insert  ──────┼─► Atlas  │
│  /api/chat:    embed query → $vectorSearch ◄──────────┘   (chunks│
│                → grounded prompt → Gemini streamText       + 768d │
│                → stream tokens + sources annotation       vectors)│
└──────────────────────────────────────────────────────────────────┘
```

**Why parse the PDF in the browser?** Two Vercel serverless limits:

1. **Body size** — a 10 MB PDF exceeds the ~4.5 MB request body limit, so the raw
   file can't be POSTed. We send only the extracted text.
2. **Timeout** — parsing 50 pages is CPU-heavy. Offloading it to the client keeps
   the serverless function focused on the fast path (embeddings + DB write).

---

## Tech choices & trade-offs

| Area | Choice | Why / trade-off |
|------|--------|-----------------|
| Framework | Next.js 15 App Router | Frontend + serverless API in one repo, first-class streaming, zero-config Vercel deploy. |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | Catches the class of bugs (undefined array access) that RAG glue code is prone to. |
| PDF parsing | `unpdf`, **client-side** | Serverless-safe pdf.js build, no worker setup. Trade-off: no server-side control of parsing, but avoids the body/timeout limits above. |
| Embeddings | Gemini `gemini-embedding-001`, reduced to 768-dim | Generous free tier; one provider for embeddings + generation. Task-type-aware (RETRIEVAL_DOCUMENT vs RETRIEVAL_QUERY) for better retrieval. |
| Vector store | MongoDB Atlas Vector Search | One store for documents **and** vectors — no separate vector DB to sync. `$vectorSearch` returns the cosine score directly, which we surface as sources. |
| LLM | Gemini `gemini-flash-latest` via Vercel AI SDK | Fast, cheap, strong enough for grounded Q&A; AI SDK gives token streaming with minimal plumbing. Model is env-overridable. |
| Validation | Zod | Runtime validation at the API boundary → structured errors. |

**Serverless connection handling:** MongoDB uses persistent TCP connections,
which fight the serverless model (each cold start can exhaust the pool). We cache
a single `MongoClient` on the global object (`lib/mongodb.ts`) so it is reused
across invocations.

---

## RAG strategy

**Chunking** (`lib/chunk.ts`) — recursive character splitter, **~3500 chars
(~800–1000 tokens) with ~500 chars (~15%) overlap**. It breaks on the most
semantic separator available (paragraph → line → sentence → word) before a hard
cut. Documents are chunked **page by page** so every chunk keeps its source page
number for citations. Overlap preserves context that straddles a boundary.

**Retrieval** (`lib/retrieval.ts`) — the question is embedded with the same model,
then Atlas `$vectorSearch` (cosine) pulls a wider candidate set filtered to the
selected `documentId`s (one **or many** — cross-document Q&A). Candidates are
**hybrid re-ranked** (`lib/rerank.ts`): the dense-vector ranking is fused with a
lexical keyword ranking via Reciprocal Rank Fusion, and the top **5** are kept —
each still carrying its `vectorSearchScore` for display.

**Generation** (`lib/prompt.ts`) — the retrieved chunks are injected into a system
prompt that instructs the model to answer **only** from the context and to say
explicitly when the answer is not in the document. The answer streams token by
token; the source chunks (page + score + preview) are shown alongside it.

---

## API

### `POST /api/upload`
Request:
```json
{ "filename": "report.pdf", "pages": [{ "pageNumber": 1, "text": "…" }] }
```
Response `200`:
```json
{ "documentId": "uuid", "filename": "report.pdf", "pageCount": 3, "chunkCount": 7 }
```
Errors: `400` invalid body, `413` too many pages / too large, `429` rate limited
(with `Retry-After`), `500` pipeline failure.

### `POST /api/chat`
Request (`documentIds` may list one or more uploaded documents):
```json
{ "documentIds": ["uuid"], "messages": [{ "role": "user", "content": "…" }] }
```
Response: an AI SDK **data stream** (SSE). The assistant answer streams as text;
the retrieved sources are attached as a message annotation:
```json
{ "type": "sources", "sources": [{ "filename": "report.pdf", "pageNumber": 2, "chunkIndex": 4, "text": "…", "score": 0.83 }] }
```
Errors: `400` invalid body (with per-field `details`), `429` rate limited (with
`Retry-After`), `500` generation failure.

---

## Local setup

Requirements: Node 20+, a MongoDB Atlas cluster (M0 free tier works), a Gemini API key.

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

Environment variables:

| Name | Description |
|------|-------------|
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | Database name (optional, defaults to `docchat`) |
| `GEMINI_API_KEY` | Google Gemini API key |

### Atlas Vector Search index (required)

Create a Vector Search index named **`vector_index`** on the `chunks` collection
(Atlas UI → Search → Create Search Index → JSON editor). Definition in
[`docs/atlas-vector-index.json`](docs/atlas-vector-index.json):

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 768, "similarity": "cosine" },
    { "type": "filter", "path": "documentId" }
  ]
}
```

The 768 dimensions must match the embedding output (`gemini-embedding-001` is
reduced to 768 via `outputDimensionality`).

You can create the index programmatically instead:

```bash
node --env-file=.env.local scripts/create-index.mjs
```

---

## Deployment (Vercel)

1. Push to GitHub and import the repo in Vercel.
2. Set `MONGODB_URI`, `GEMINI_API_KEY` (and optionally `MONGODB_DB`) in
   Project → Settings → Environment Variables.
3. Allow Vercel egress in Atlas Network Access (`0.0.0.0/0` for the test, or the
   Vercel IP ranges).
4. Deploy. API routes declare `maxDuration = 60` for the upload/generation paths.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | Next.js lint |
| `npm test` | Unit tests (vitest) |

---

## Bonus features

Beyond the core F1–F6 requirements:

- **Hybrid retrieval / re-ranking** — vector hits are fused with a lexical keyword
  ranking via Reciprocal Rank Fusion (`lib/rerank.ts`), improving recall for exact
  terms (names, codes, amounts) that pure vector search can miss.
- **Multi-document Q&A** — upload several PDFs and query across any selected subset;
  sources cite which file each passage came from.
- **Rate limiting + structured logging** — per-client fixed-window limits on both
  endpoints (`429` + `Retry-After`) and one-JSON-line-per-event logs with a request
  id and latency (`lib/rate-limit.ts`, `lib/logger.ts`).
  > **Limitation:** the limiter is in-memory, so on a multi-instance serverless
  > deploy each instance counts independently. It's a best-effort guard for this
  > test; a production deploy would back it with Redis (e.g. Upstash).
- **Tests** — pure-function unit tests for chunking, prompt building, re-ranking and
  the rate limiter (`tests/`, `npm test`).
- **Multilingual (FR/AR)** — Unicode-safe extraction, tokenizer and multilingual
  embeddings; the model answers in the question's language. French is verified end
  to end; Arabic works via the same path. Details in
  [`TECH_STACK.md`](TECH_STACK.md#multilingual-fr--ar). Generate the samples with
  `node scripts/make-sample-pdfs.mjs`.
- **No heavy RAG framework** — direct AI SDK + Mongo driver instead of LangChain/
  LlamaIndex; rationale in [`TECH_STACK.md`](TECH_STACK.md#why-not-langchain--llamaindex).

## Requirements coverage

F1 upload + validation + progress · F2 chunking + embeddings + cosine search ·
F3 grounded chat with history · F4 sources with similarity scores · F5 documented
REST API with structured errors · F6 token streaming. See `BACKLOG.md`.
