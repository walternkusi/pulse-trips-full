// =============================================================================
// CATALOGUE PERSISTENCE
// Tours edited in the admin portal are saved to backend/storage/tours.json so
// changes survive server restarts. On first start (no file yet) the catalogue
// is seeded from tours.js.
//
// Uploaded photos live in backend/storage/uploads/ and are served at /uploads.
// ⚠️  On hosts with an ephemeral disk (Heroku, some Render plans) mount a
//     persistent volume at backend/storage, or move this to a database + S3.
// =============================================================================
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tours as seedTours } from './tours.js';

export const STORAGE_DIR = fileURLToPath(new URL('../../storage/', import.meta.url));
export const UPLOADS_DIR = join(STORAGE_DIR, 'uploads');
const TOURS_FILE = join(STORAGE_DIR, 'tours.json');

mkdirSync(UPLOADS_DIR, { recursive: true });

// Reads the saved catalogue, or starts from the seed data in tours.js.
export function loadTours() {
  if (existsSync(TOURS_FILE)) {
    try { return JSON.parse(readFileSync(TOURS_FILE, 'utf8')); }
    catch (err) { console.error('[catalog] tours.json is unreadable, using seed data', err); }
  }
  // structuredClone: edits must never mutate the imported seed module.
  return structuredClone(seedTours).map((t) => ({ published: true, ...t }));
}

// Atomic save: write a temp file then rename, so a crash mid-write can't corrupt it.
export function saveTours(tours) {
  const tmp = `${TOURS_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(tours, null, 2));
  renameSync(tmp, TOURS_FILE);
}
