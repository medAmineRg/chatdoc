# DocChat — Backlog (Functional Requirements)

| ID | FUN | DESC |
|----|-----|------|
| F1 | Upload PDF | Upload a PDF with validation (type, size max ~10 MB / ~50 pages). Show visual progress of processing: parsing → chunking → embeddings. |
| F2 | RAG Pipeline | Extract text, chunk it (justified size + overlap), compute embeddings via an API (OpenAI/Gemini/Cohere/Voyage), store and search by cosine similarity. |
| F3 | Chat Q&A | Chat interface with session history. Each answer relies only on the document (no LLM general knowledge). If the info is not in the document, say so explicitly. |
| F4 | Show Sources | For each answer, show the source chunks used (truncated text OK) with their similarity score. |
| F5 | REST API | Clean, documented endpoints (min: POST /api/upload, POST /api/chat). Correct HTTP codes, structured error handling. |
| F6 | Streaming | LLM answer displayed in streaming (token by token) on the frontend. |
