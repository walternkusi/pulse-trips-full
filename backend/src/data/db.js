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
import dns from 'node:dns';
import { MongoClient } from 'mongodb';
import { config } from '../config.js';

export const dbEnabled = Boolean(config.mongodbUri);

let client = null;
let database = null;
let chain = Promise.resolve(); // queue of pending writes

async function open() {
  const candidate = new MongoClient(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  try {
    await candidate.connect();
    const db = candidate.db(config.mongodbDb);
    await db.command({ ping: 1 });
    client = candidate;
    database = db;
  } catch (err) {
    await candidate.close().catch(() => {});
    throw err;
  }
}

export async function connectDb() {
  if (!dbEnabled) return;
  try {
    await open();
  } catch (err) {
    // Phone hotspots, hotel Wi-Fi and some routers garble the DNS lookup that `mongodb+srv://`
    // needs (error "querySrv EBADRESP"). Retry once with public DNS servers before giving up.
    if (!/^query(Srv|Txt)$/.test(err.syscall || '')) throw err;
    console.warn(`⚠️  Your network's DNS could not resolve Atlas (${err.code}). Retrying with public DNS (1.1.1.1, 8.8.8.8)...`);
    dns.setServers(['1.1.1.1', '8.8.8.8']);
    await open();
  }
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
