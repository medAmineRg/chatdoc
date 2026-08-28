/** A single embedded chunk stored in MongoDB. */
export interface ChunkDoc {
  documentId: string;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number;
  text: string;
  embedding: number[];
  createdAt: Date;
}

/** A chunk returned from vector search, including its similarity score. */
export interface RetrievedChunk {
  documentId: string;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number;
  text: string;
  score: number;
}
