// =============================================================================
// FIRST-PARTY ANALYTICS
// Google Analytics 4 runs in the browser (see frontend/components/Analytics.js).
// In addition, the website sends a few anonymous funnel events here so the
// admin dashboard can show checkout abandonment and top tours without anyone
// needing GA access. No cookies and no personal data: just a random per-tab id.
// =============================================================================
import { store } from '../data/store.js';

// Only these event names are accepted (mirrors GA4's recommended e-commerce events).
export const FUNNEL = ['view_item', 'begin_checkout', 'add_payment_info', 'purchase'];
const ALLOWED = new Set(['page_view', 'generate_lead', 'contact', 'whatsapp_click', ...FUNNEL]);

// Validates and stores one event. Unknown names are silently ignored.
export function recordEvent({ name, sessionId, slug, source }) {
  if (!ALLOWED.has(name) || typeof sessionId !== 'string' || sessionId.length > 64) return;
  store.addEvent({
    name,
    sessionId,
    slug: slug ? String(slug).slice(0, 80) : '',
    source: source ? String(source).slice(0, 80) : 'direct', // utm_source or referrer host
    at: new Date().toISOString(),
  });
}

// Dashboard numbers: KPIs, funnel, abandonment, top tours, traffic sources.
export function overview() {
  const events = store.listEvents();
  const bookings = store.listBookings();
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const todayStr = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  // --- Funnel: unique sessions reaching each step -----------------------------
  const sessionsAt = (name) => new Set(events.filter((e) => e.name === name).map((e) => e.sessionId)).size;
  const funnel = FUNNEL.map((name) => ({ step: name, sessions: sessionsAt(name) }));
  const started = funnel[1].sessions;
  const purchased = funnel[3].sessions;
  const abandonmentRate = started ? Math.round((1 - purchased / started) * 1000) / 10 : 0;

  // --- Top tours by confirmed revenue -----------------------------------------
  const byTour = new Map();
  for (const b of confirmed) {
    const t = byTour.get(b.slug) || { slug: b.slug, name: b.tourName, bookings: 0, guests: 0, revenueUsd: 0, views: 0 };
    t.bookings += 1; t.guests += b.adults + b.children; t.revenueUsd += b.totalUsd;
    byTour.set(b.slug, t);
  }
  for (const e of events.filter((x) => x.name === 'view_item' && x.slug)) {
    const t = byTour.get(e.slug) || { slug: e.slug, name: store.getTour(e.slug)?.name || e.slug, bookings: 0, guests: 0, revenueUsd: 0, views: 0 };
    t.views += 1;
    byTour.set(e.slug, t);
  }

  // --- Traffic sources: first source seen for each session -------------------
  const firstSource = new Map();
  for (const e of events) if (!firstSource.has(e.sessionId)) firstSource.set(e.sessionId, e.source);
  const sources = {};
  for (const s of firstSource.values()) sources[s] = (sources[s] || 0) + 1;

  const revenueUsd = confirmed.reduce((s, b) => s + b.totalUsd, 0);
  return {
    kpis: {
      confirmedBookings: confirmed.length,
      revenueUsd: Math.round(revenueUsd * 100) / 100,
      averageOrderUsd: confirmed.length ? Math.round((revenueUsd / confirmed.length) * 100) / 100 : 0,
      guestsNext7Days: confirmed.filter((b) => b.date >= todayStr && b.date <= in7).reduce((s, b) => s + b.adults + b.children, 0),
      pendingHolds: bookings.filter((b) => b.status === 'pending').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      subscribers: store.countSubscribers(),
      sessions: firstSource.size,
    },
    funnel,
    abandonmentRate,
    topTours: [...byTour.values()].map((t) => ({ ...t, revenueUsd: Math.round(t.revenueUsd * 100) / 100 })).sort((a, b) => b.revenueUsd - a.revenueUsd || b.views - a.views),
    sources: Object.entries(sources).map(([source, sessions]) => ({ source, sessions })).sort((a, b) => b.sessions - a.sessions),
  };
}
