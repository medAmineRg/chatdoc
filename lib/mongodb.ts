import { MongoClient, type Collection, type Db } from "mongodb";
import { env } from "@/lib/env";
import type { ChunkDoc } from "@/lib/types";

/**
 * MongoDB connection for serverless (Vercel).
 *
 * Serverless functions are invoked concurrently and reused across requests.
 * Creating a new client per invocation would exhaust the Atlas connection
 * pool, so we cache a single `MongoClient` (and its connect promise) on the
 * global object. In development, the global cache also survives HMR reloads.
 */
const DB_NAME = process.env.MONGODB_DB ?? "docchat";
const CHUNKS_COLLECTION = "chunks";

interface MongoCache {
  client: MongoClient | null;
  promise: Promise<MongoClient> | null;
}

const globalForMongo = globalThis as unknown as {
  _mongoCache?: MongoCache;
};

const cache: MongoCache = globalForMongo._mongoCache ?? {
  client: null,
  promise: null,
};
globalForMongo._mongoCache = cache;

export async function getMongoClient(): Promise<MongoClient> {
  if (cache.client) return cache.client;
  if (!cache.promise) {
    cache.promise = new MongoClient(env.mongodbUri).connect();
  }
  cache.client = await cache.promise;
  return cache.client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(DB_NAME);
}

export async function getChunksCollection(): Promise<Collection<ChunkDoc>> {
  const db = await getDb();
  return db.collection<ChunkDoc>(CHUNKS_COLLECTION);
}

export const VECTOR_INDEX_NAME = "vector_index";
export { CHUNKS_COLLECTION, DB_NAME };
