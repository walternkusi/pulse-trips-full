// =============================================================================
// MONGODB CONNECTION (Atlas or any MongoDB)
// Set MONGODB_URI in .env to turn it on. Without it the API runs fully in memory
// (tours.json on disk) and bookings are lost on restart: fine for local demos.
//
// HOW IT WORKS
//   store.js keeps its working data in memory so reads and the double-booking
//   check stay instant and atomic. On start-up it loads everything from MongoDB,
//   and every change is written back through `write()` below, in order, one at a
//   time, so a later save of a booking can never be overtaken by an earlier one.
//
// ⚠️  Run ONE copy of the API. Two servers would each hold their own in-memory
//     copy and could sell the same seat twice.
// =============================================================================
import { MongoClient } from 'mongodb';
import { config } from '../config.js';

export const dbEnabled = Boolean(config.mongodbUri);

let client = null;
let database = null;
let chain = Promise.resolve(); // queue of pending writes

export async function connectDb() {
  if (!dbEnabled) return;
  client = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  database = client.db(config.mongodbDb);
  await database.command({ ping: 1 });
}

export const col = (name) => database.collection(name);

// Queues one database write. Failures are logged, never thrown into a request:
// a guest's booking should not fail just because a save was slow.
export function write(label, fn) {
  if (!database) return;
  chain = chain.then(fn).catch((err) => console.error(`[db] saving ${label} failed:`, err.message));
}

// Waits for queued writes, then closes the connection (used on shutdown).
export async function closeDb() {
  if (!client) return;
  await chain;
  await client.close();
}
