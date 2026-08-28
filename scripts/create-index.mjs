// Creates the Atlas Vector Search index for the `chunks` collection.
// Usage: node --env-file=.env.local scripts/create-index.mjs
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "docchat";
if (!uri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

const existing = await db.listCollections({ name: "chunks" }).toArray();
if (existing.length === 0) {
  await db.createCollection("chunks");
  console.log("created collection 'chunks'");
}

const chunks = db.collection("chunks");

try {
  await chunks.createSearchIndex({
    name: "vector_index",
    type: "vectorSearch",
    definition: {
      fields: [
        { type: "vector", path: "embedding", numDimensions: 768, similarity: "cosine" },
        { type: "filter", path: "documentId" },
      ],
    },
  });
  console.log("requested vector_index creation");
} catch (err) {
  console.log("createSearchIndex:", err.message);
}

const indexes = await chunks.listSearchIndexes().toArray();
console.log("search indexes:", JSON.stringify(indexes.map((i) => ({ name: i.name, status: i.status, queryable: i.queryable })), null, 1));

await client.close();
