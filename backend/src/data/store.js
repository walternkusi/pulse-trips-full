// =============================================================================
// DATA LAYER
// Every other file talks to the data ONLY through the functions exported here.
//
// The working data lives in memory, so reads stay instant and the double-booking
// check stays atomic. With MONGODB_URI set (see db.js), `store.init()` loads
// everything from MongoDB at start-up and each change below is saved back to it.
// Without MONGODB_URI the API runs in memory only and loses bookings on restart.
// =============================================================================
import { addons, promoCodes, resources } from './tours.js';
import { loadTours, saveTours } from './catalog.js';
import { dbEnabled, col, write } from './db.js';

// Tour catalogue: editable from the admin portal. Saved to MongoDB, or to
// storage/tours.json when no database is configured.
const tours = loadTours();

// --- Collections --------------------------------------------------------------
const bookings = new Map();    // reference -> booking
const reviews = [];            // { id, tourSlug, reference, rating, title, text, name, photos[], verified, createdAt }
const messages = [];           // contact-form & live-chat messages
const subscribers = new Map(); // email -> { email, source, createdAt }
const comms = [];              // every email/SMS sent (CRM communication history)
const guestNotes = [];         // internal staff notes about a guest
const assignments = new Map(); // departureId -> { guideId, driverId, vehicleId }
const events = [];             // anonymous analytics events (checkout funnel)
const MAX_EVENTS = 20000;      // cap memory usage: oldest events are dropped

const withoutId = ({ _id, ...doc }) => doc; // eslint-disable-line no-unused-vars

// Saves the whole catalogue (it is small), keeping the admin's ordering.
function persistTours() {
  if (!dbEnabled) return saveTours(tours);
  write('tours', () => col('tours').bulkWrite(tours.map((t, i) => ({
    replaceOne: { filter: { _id: t.slug }, replacement: { ...t, _id: t.slug, _pos: i }, upsert: true },
  }))));
}

// Normalise emails so "Ana@Mail.com" and "ana@mail.com" are the same guest.
const norm = (email) => String(email || '').trim().toLowerCase();

// A booking occupies seats while confirmed, or while pending and its hold has not expired.
function occupiesSeats(b, now = Date.now()) {
  if (b.status === 'confirmed') return true;
  if (b.status === 'pending') return new Date(b.holdExpiresAt).getTime() > now;
  return false;
}

export const store = {
  // Loads all saved data from MongoDB. Call once before the server starts listening.
  async init() {
    if (!dbEnabled) return;
    const all = (name, sort = { _id: 1 }) => col(name).find({}).sort(sort).toArray();

    // First run: the catalogue (tours.json or the built-in seed) is copied into MongoDB.
    const savedTours = await all('tours', { _pos: 1 });
    if (savedTours.length) tours.splice(0, tours.length, ...savedTours.map(({ _id, _pos, ...t }) => t)); // eslint-disable-line no-unused-vars
    else persistTours();

    for (const b of await all('bookings')) bookings.set(b._id, withoutId(b));
    reviews.push(...(await all('reviews', { createdAt: 1 })).map(withoutId));
    messages.push(...(await all('messages')).map(withoutId));
    comms.push(...(await all('comms')).map(withoutId));
    guestNotes.push(...(await all('guestNotes')).map(withoutId));
    for (const s of await all('subscribers')) subscribers.set(s._id, withoutId(s));
    for (const a of await all('assignments')) assignments.set(a._id, withoutId(a));

    // Analytics: keep the newest MAX_EVENTS in memory and trim older ones from the database.
    const recent = await col('events').find({}).sort({ _id: -1 }).limit(MAX_EVENTS).toArray();
    events.push(...recent.reverse().map(withoutId));
    if (recent.length === MAX_EVENTS) write('events cleanup', () => col('events').deleteMany({ _id: { $lt: recent[0]._id } }));
  },

  // ---------------------------------------------------------------------------
  // Catalogue
  // ---------------------------------------------------------------------------
  // Tours are returned with their live rating summary attached (for cards & SEO).
  // Public listing: only published tours. Admin listing: everything.
  listTours: () => tours.filter((t) => t.published !== false).map((t) => ({ ...t, rating: store.ratingSummary(t.slug) })),
  listAllTours: () => tours.map((t) => ({ ...t, rating: store.ratingSummary(t.slug) })),
  // Any tour, published or not (existing bookings on a hidden tour must keep working).
  getTour(slug) {
    const t = tours.find((x) => x.slug === slug);
    return t ? { ...t, rating: store.ratingSummary(t.slug) } : null;
  },
  // Admin: replace a tour's editable fields and save to disk. The slug never changes
  // because bookings, reviews and URLs point to it.
  updateTour(slug, fields) {
    const i = tours.findIndex((x) => x.slug === slug);
    if (i === -1) return null;
    tours[i] = { ...tours[i], ...fields, slug };
    persistTours();
    return store.getTour(slug);
  },
  createTour(tour) {
    tours.push(tour);
    persistTours();
    return store.getTour(tour.slug);
  },
  // Pass a tour's addonIds to get only the extras offered on that tour.
  listAddons: (ids) => (ids ? addons.filter((a) => ids.includes(a.id)) : addons),
  getPromo: (code) => promoCodes[String(code || '').trim().toUpperCase()] || null,
  resources: () => resources,

  // ---------------------------------------------------------------------------
  // Bookings & availability
  // ---------------------------------------------------------------------------
  // Guests holding seats on one departure (tour + date + start time).
  seatsTaken(slug, date, time) {
    let taken = 0;
    for (const b of bookings.values()) {
      if (b.slug === slug && b.date === date && b.time === time && occupiesSeats(b)) taken += b.adults + b.children;
    }
    return taken;
  },
  // True if a private booking already owns this departure (private = no strangers).
  hasPrivateBooking(slug, date, time) {
    for (const b of bookings.values()) {
      if (b.slug === slug && b.date === date && b.time === time && b.isPrivate && occupiesSeats(b)) return true;
    }
    return false;
  },

  // Call again after changing a booking in place: it saves the latest state to MongoDB.
  saveBooking(b) {
    bookings.set(b.reference, b);
    write(`booking ${b.reference}`, () => col('bookings').replaceOne({ _id: b.reference }, { ...b, _id: b.reference }, { upsert: true }));
    return b;
  },
  getBooking: (ref) => bookings.get(ref) || null,
  // Returns the booking only if the email matches (guest lookup, cancel, reviews).
  findBookingByEmail(ref, email) {
    const b = bookings.get(String(ref || '').toUpperCase());
    return b && norm(b.email) === norm(email) ? b : null;
  },
  // Admin listing with optional filters, newest first.
  listBookings({ status, slug, q } = {}) {
    const needle = norm(q);
    return [...bookings.values()]
      .filter((b) => (!status || b.status === status) && (!slug || b.slug === slug))
      .filter((b) => !needle || [b.reference, b.name, b.email].some((v) => norm(v).includes(needle)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  // Bookings on one departure that still matter (used by roster & weather cancel).
  bookingsOnDeparture: (slug, date, time) =>
    [...bookings.values()].filter((b) => b.slug === slug && b.date === date && b.time === time && occupiesSeats(b)),
  // Mark unpaid holds whose timer ran out as expired, releasing their seats for good.
  // Returns the bookings that just expired so callers can broadcast the freed seats.
  expireHolds(now = Date.now()) {
    const expired = [];
    for (const b of bookings.values()) {
      if (b.status === 'pending' && new Date(b.holdExpiresAt).getTime() <= now) { b.status = 'expired'; store.saveBooking(b); expired.push(b); }
    }
    return expired;
  },

  // ---------------------------------------------------------------------------
  // Reviews (social proof)
  // ---------------------------------------------------------------------------
  listReviews: (slug) => (slug ? reviews.filter((r) => r.tourSlug === slug) : reviews)
    .slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  // Same list without the booking reference: safe to send to browsers.
  listPublicReviews: (slug) => store.listReviews(slug).map(({ reference, ...pub }) => pub), // eslint-disable-line no-unused-vars
  addReview(r) {
    reviews.push(r);
    write('review', () => col('reviews').insertOne({ ...r }));
    return r;
  },
  reviewForBooking: (ref) => reviews.find((r) => r.reference === ref) || null,
  // { average, count } used on cards, tour pages and Schema.org aggregateRating.
  ratingSummary(slug) {
    const list = reviews.filter((r) => r.tourSlug === slug);
    if (!list.length) return { average: 0, count: 0 };
    const avg = list.reduce((s, r) => s + r.rating, 0) / list.length;
    return { average: Math.round(avg * 10) / 10, count: list.length };
  },

  // ---------------------------------------------------------------------------
  // Leads, messages & communication history (CRM)
  // ---------------------------------------------------------------------------
  saveMessage(m) {
    messages.push(m);
    write('message', () => col('messages').insertOne({ ...m }));
    return m;
  },
  listMessages: (email) => (email ? messages.filter((m) => norm(m.email) === norm(email)) : messages),
  // Returns true when the email is new (so we only send the welcome email once).
  addSubscriber(email, source = 'popup') {
    const key = norm(email);
    if (subscribers.has(key)) return false;
    const sub = { email: key, source, createdAt: new Date().toISOString() };
    subscribers.set(key, sub);
    write('subscriber', () => col('subscribers').insertOne({ ...sub, _id: key }));
    return true;
  },
  countSubscribers: () => subscribers.size,
  isSubscriber: (email) => subscribers.has(norm(email)),

  logComm(entry) {
    const comm = { at: new Date().toISOString(), ...entry, email: norm(entry.email) };
    comms.push(comm);
    write('comm', () => col('comms').insertOne({ ...comm }));
  },
  commsFor: (email) => comms.filter((c) => c.email === norm(email)),

  addGuestNote(email, text, author = 'staff') {
    const note = { email: norm(email), text, author, at: new Date().toISOString() };
    guestNotes.push(note);
    write('guest note', () => col('guestNotes').insertOne({ ...note }));
    return note;
  },
  notesFor: (email) => guestNotes.filter((n) => n.email === norm(email)),

  // ---------------------------------------------------------------------------
  // Roster (guide / driver / vehicle assignments per departure)
  // ---------------------------------------------------------------------------
  getAssignment: (id) => assignments.get(id) || { guideId: '', driverId: '', vehicleId: '' },
  setAssignment(id, a) {
    assignments.set(id, a);
    write('assignment', () => col('assignments').replaceOne({ _id: id }, { ...a, _id: id }, { upsert: true }));
    return a;
  },
  listAssignments: () => [...assignments.entries()],

  // ---------------------------------------------------------------------------
  // Analytics events
  // ---------------------------------------------------------------------------
  addEvent(e) {
    events.push(e);
    write('event', () => col('events').insertOne({ ...e }));
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
  },
  listEvents: () => events,
};
