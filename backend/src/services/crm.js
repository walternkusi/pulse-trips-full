// =============================================================================
// CRM SERVICE
// Builds a guest-centric view out of bookings, messages, emails/SMS sent and
// staff notes. A "guest" is identified by their email address.
//
// 🔌 To sync with HubSpot / Zoho / Salesforce, push the same objects from
//    `listGuests` to their contacts API on a schedule or after each booking.
// =============================================================================
import { store } from '../data/store.js';

const norm = (e) => String(e || '').trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

// One row per guest for the CRM table, most recently active first.
export function listGuests(q = '') {
  const guests = new Map();
  const get = (email, name = '') => {
    const key = norm(email);
    if (!guests.has(key)) guests.set(key, { email: key, name, phone: '', bookings: 0, confirmed: 0, spentUsd: 0, lastTrip: '', nextTrip: '', requirements: [], lastActivity: '', isLeadOnly: true });
    return guests.get(key);
  };

  for (const b of store.listBookings()) {
    const g = get(b.email, b.name);
    g.name = g.name || b.name;
    g.phone = g.phone || b.phone;
    g.isLeadOnly = false;
    g.bookings += 1;
    if (b.status === 'confirmed') {
      g.confirmed += 1;
      g.spentUsd += b.totalUsd;
      if (b.date < today() && b.date > g.lastTrip) g.lastTrip = b.date;
      if (b.date >= today() && (!g.nextTrip || b.date < g.nextTrip)) g.nextTrip = b.date;
    }
    // Special requirements (dietary, accessibility...) entered at checkout.
    if (b.notes && !g.requirements.includes(b.notes)) g.requirements.push(b.notes);
    if (b.createdAt > g.lastActivity) g.lastActivity = b.createdAt;
  }
  // People who only wrote to us are leads worth following up.
  for (const m of store.listMessages()) {
    const g = get(m.email, m.name);
    if (m.at > g.lastActivity) g.lastActivity = m.at;
  }

  const needle = norm(q);
  return [...guests.values()]
    .map((g) => ({ ...g, spentUsd: Math.round(g.spentUsd * 100) / 100, subscriber: store.isSubscriber(g.email) }))
    .filter((g) => !needle || g.email.includes(needle) || norm(g.name).includes(needle))
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

// Full guest profile: past/upcoming bookings + communication history + notes.
export function getGuest(email) {
  const key = norm(email);
  const bookings = store.listBookings().filter((b) => norm(b.email) === key);
  const messages = store.listMessages(key);
  if (!bookings.length && !messages.length) return null;

  // Timeline merges emails/SMS sent, messages received and staff notes, newest first.
  const timeline = [
    ...store.commsFor(key).map((c) => ({ at: c.at, type: c.channel, text: `${c.kind}: ${c.subject} (${c.status})` })),
    ...messages.map((m) => ({ at: m.at, type: 'inbound', text: `${m.source || 'contact'}: ${m.message}` })),
    ...store.notesFor(key).map((n) => ({ at: n.at, type: 'note', text: n.text })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    summary: listGuests(key).find((g) => g.email === key),
    bookings,
    reviews: store.listReviews().filter((r) => bookings.some((b) => b.reference === r.reference)),
    timeline,
  };
}
