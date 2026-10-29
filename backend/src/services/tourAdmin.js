// =============================================================================
// TOUR ADMIN SERVICE
// Everything the admin "Tours" editor needs:
//   • parseTourInput  – validates & cleans an edited tour before it is saved
//   • createTourFrom  – builds a brand-new tour with safe defaults
//   • saveUpload      – stores an uploaded photo (type-checked) in storage/uploads
//   • searchPhotos    – finds REAL photos of a place on Unsplash
//   • trackPhotoUse   – tells Unsplash a photo was used (required by their API terms)
// =============================================================================
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import { store } from '../data/store.js';
import { UPLOADS_DIR } from '../data/catalog.js';
import { UTC_OFFSET_HOURS } from './availability.js';
import { HttpError } from '../middleware/errors.js';
import { isTime } from '../middleware/validate.js';

export const COUNTRIES = Object.keys(UTC_OFFSET_HOURS);
export const CATEGORIES = ['safari', 'adventure', 'day-trip', 'event'];
export const LEVELS = ['Easy', 'Moderate', 'Challenging'];
const MAX_IMAGES = 12;
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024; // 6 MB per photo

// --- Small cleaning helpers ---------------------------------------------------
const str = (v, max) => String(v ?? '').trim().slice(0, max);
function num(v, min, max, label) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${label} must be between ${min} and ${max}.`);
  return n;
}
const list = (v, maxItems = 20, maxLen = 200) => (Array.isArray(v) ? v : []).map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);

// Photo links must be our own uploads or https URLs (no javascript:, data: or http: links).
function cleanImage(img) {
  const src = str(img?.src, 1000);
  const ok = src.startsWith('https://') || src.startsWith(`${config.apiPublicUrl}/uploads/`);
  if (!ok) throw new HttpError(400, 'Each photo must be an uploaded file or an https:// link.');
  const credit = img.credit?.name ? { name: str(img.credit.name, 80), url: str(img.credit.url, 300).startsWith('https://') ? str(img.credit.url, 300) : '' } : undefined;
  // Alt text describes the photo for blind visitors and for Google Images.
  return { src, alt: str(img.alt, 160) || 'Tour photo', ...(credit ? { credit } : {}) };
}

// -----------------------------------------------------------------------------
// VALIDATE AN EDITED TOUR (all editable fields; slug & seasons are kept as they are)
// -----------------------------------------------------------------------------
export function parseTourInput(b = {}) {
  const name = str(b.name, 120);
  if (name.length < 3) throw new HttpError(400, 'Give the tour a name (3+ characters).');
  const blurb = str(b.blurb, 300);
  if (blurb.length < 10) throw new HttpError(400, 'Write a short card description (10+ characters).');
  if (!COUNTRIES.includes(b.country)) throw new HttpError(400, `Country must be one of: ${COUNTRIES.join(', ')}.`);
  if (!CATEGORIES.includes(b.category)) throw new HttpError(400, 'Choose a category.');
  if (!LEVELS.includes(b.level)) throw new HttpError(400, 'Choose a difficulty level.');

  const departures = list(b.departures, 8, 5).filter(isTime).sort();
  if (!departures.length) throw new HttpError(400, 'Add at least one departure time (HH:MM).');
  const daysOfWeek = [...new Set((Array.isArray(b.daysOfWeek) ? b.daysOfWeek : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  if (!daysOfWeek.length) throw new HttpError(400, 'Choose at least one operating day.');

  const images = (Array.isArray(b.images) ? b.images : []).slice(0, MAX_IMAGES).map(cleanImage);
  if (!images.length) throw new HttpError(400, 'Add at least one photo: the first one is the card cover.');

  const p = b.pricing || {};
  const pricing = {
    adult: num(p.adult, 0, 100000, 'Adult price'),
    child: num(p.child, 0, 100000, 'Child price'),
    privateFlat: num(p.privateFlat, 0, 1000000, 'Private price'),
    group: p.group && Number(p.group.minGuests) > 0
      ? { minGuests: num(p.group.minGuests, 2, 200, 'Group size'), discount: num(p.group.discount, 0, 0.9, 'Group discount') }
      : null,
  };

  const mp = b.meetingPoint || {};
  const meetingPoint = { name: str(mp.name, 120), lat: num(mp.lat, -90, 90, 'Latitude'), lng: num(mp.lng, -180, 180, 'Longitude'), note: str(mp.note, 300) };
  if (!meetingPoint.name) throw new HttpError(400, 'Name the meeting point.');

  // Itinerary steps and map stops.
  const itinerary = (Array.isArray(b.itinerary) ? b.itinerary : []).slice(0, 20)
    .map((s) => ({ time: str(s.time, 30), title: str(s.title, 120), text: str(s.text, 500) })).filter((s) => s.title);
  const stops = (Array.isArray(b.stops) ? b.stops : []).slice(0, 15)
    .map((s) => ({ name: str(s.name, 120), lat: Number(s.lat), lng: Number(s.lng) }))
    .filter((s) => s.name && Math.abs(s.lat) <= 90 && Math.abs(s.lng) <= 180 && Number.isFinite(s.lat) && Number.isFinite(s.lng));

  const knownAddons = store.listAddons().map((a) => a.id);
  const video = str(b.video, 500);
  if (video && !video.startsWith('https://')) throw new HttpError(400, 'The video link must start with https://');

  return {
    name, blurb, country: b.country, category: b.category, level: b.level,
    durationLabel: str(b.durationLabel, 30) || 'Full day',
    durationHours: num(b.durationHours, 1, 720, 'Duration (hours)'),
    maxGuests: num(b.maxGuests, 1, 200, 'Max guests'),
    minAge: num(b.minAge ?? 0, 0, 99, 'Minimum age'),
    cutoffHours: num(b.cutoffHours ?? 12, 0, 168, 'Booking cut-off'),
    languages: list(b.languages, 10, 30),
    departures, daysOfWeek, images, video, pricing, meetingPoint,
    stops: stops.length ? stops : [{ name: meetingPoint.name, lat: meetingPoint.lat, lng: meetingPoint.lng }],
    itinerary,
    highlights: list(b.highlights), inclusions: list(b.inclusions), exclusions: list(b.exclusions), whatToBring: list(b.whatToBring),
    addonIds: list(b.addonIds, 10, 30).filter((id) => knownAddons.includes(id)),
    published: b.published !== false,
    featured: Boolean(b.featured), // shown first in the home page "Featured experiences"
  };
}

// URL-friendly, unique slug: "Lake Kivu Sunset Cruise" -> "lake-kivu-sunset-cruise"
function uniqueSlug(name) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'tour';
  let slug = base, n = 2;
  while (store.getTour(slug)) slug = `${base}-${n++}`;
  return slug;
}

// New tours start hidden (published: false) unless the admin ticks "Published".
export function createTourFrom(body) {
  const fields = parseTourInput(body);
  return store.createTour({ slug: uniqueSlug(fields.name), ...fields, pricing: { ...fields.pricing, seasons: [] } });
}

// Edits keep the tour's seasonal pricing rules (set in tours.js / tours.json).
export function updateTourFrom(slug, body) {
  const existing = store.getTour(slug);
  if (!existing) throw new HttpError(404, 'Tour not found.');
  const fields = parseTourInput(body);
  return store.updateTour(slug, { ...fields, pricing: { ...fields.pricing, seasons: existing.pricing.seasons || [] } });
}

// -----------------------------------------------------------------------------
// PHOTO UPLOAD
// The browser sends a resized image as a base64 data URL. We check the real
// file signature ("magic bytes"), not just the name, so nobody can upload a
// script disguised as a photo. SVG is refused (it can contain JavaScript).
// -----------------------------------------------------------------------------
const SIGNATURES = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'webp', test: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
];

export function saveUpload(dataUrl) {
  const match = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!match) throw new HttpError(400, 'Upload a JPEG, PNG or WebP image.');
  const buf = Buffer.from(match[2], 'base64');
  if (buf.length > MAX_UPLOAD_BYTES) throw new HttpError(400, 'Photo is too large (max 6 MB).');
  const type = SIGNATURES.find((s) => s.test(buf));
  if (!type) throw new HttpError(400, 'That file is not a valid JPEG, PNG or WebP image.');
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString('hex')}.${type.ext}`; // unguessable, never user-chosen
  writeFileSync(join(UPLOADS_DIR, name), buf);
  return { src: `${config.apiPublicUrl}/uploads/${name}` };
}

// -----------------------------------------------------------------------------
// REAL PHOTO SEARCH (Unsplash)
// Returns landscape photos of the real place, with the photographer credit
// that Unsplash's licence asks us to show.
// -----------------------------------------------------------------------------
const UTM = 'utm_source=pulse_trips&utm_medium=referral'; // required on Unsplash credit links

export async function searchPhotos(query, page = 1) {
  if (!config.unsplashKey) throw new HttpError(503, 'Photo search is off. Add a free UNSPLASH_ACCESS_KEY to backend/.env (unsplash.com/developers) and restart the API.');
  const q = str(query, 100);
  if (q.length < 2) throw new HttpError(400, 'Type a place to search, e.g. "Serengeti wildebeest".');
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=18&page=${Number(page) || 1}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${config.unsplashKey}`, 'Accept-Version': 'v1' } });
  if (!res.ok) throw new HttpError(502, res.status === 401 ? 'Unsplash rejected the access key.' : 'Photo search is unavailable right now.');
  const data = await res.json();
  return {
    total: data.total,
    results: data.results.map((p) => ({
      id: p.id,
      thumb: p.urls.small,
      // `raw` + our size params = sharp 1600 px image served from Unsplash's CDN.
      src: `${p.urls.raw}&auto=format&fit=crop&w=1600&q=75`,
      alt: (p.alt_description || p.description || q).slice(0, 160),
      location: p.location?.name || '',
      credit: { name: p.user.name, url: `${p.user.links.html}?${UTM}` },
      downloadLocation: p.links.download_location,
    })),
  };
}

// Unsplash API terms: ping the photo's download endpoint when it is used.
export async function trackPhotoUse(downloadLocation) {
  if (!config.unsplashKey || !String(downloadLocation).startsWith('https://api.unsplash.com/')) return;
  await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${config.unsplashKey}` } }).catch(() => {});
}
