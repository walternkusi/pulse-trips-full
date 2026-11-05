// =============================================================================
// ADMIN NUMBERS
// Pure functions that turn the real bookings list (GET /api/admin/bookings, up to the
// newest 500) into chart series and KPI figures. No network, no React: easy to test.
// "Revenue" always means CONFIRMED bookings in USD (totalUsd), like the old dashboard.
// =============================================================================
const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const round2 = (n) => Math.round(n * 100) / 100;
export const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const isPaid = (b) => b.status === 'confirmed';
// When the money arrived: confirmation time, or creation time for older records.
export const paidAt = (b) => new Date(b.confirmedAt || b.createdAt).getTime();
export const refundUsd = (b) => (b.refund?.amount > 0 ? round2((b.totalUsd * (b.refund.percent ?? 0)) / 100) : 0);

const sumPaid = (bookings, from, to) => bookings.filter((b) => isPaid(b) && paidAt(b) >= from && paidAt(b) < to).reduce((s, b) => s + b.totalUsd, 0);
const countPaid = (bookings, from, to) => bookings.filter((b) => isPaid(b) && paidAt(b) >= from && paidAt(b) < to).length;

// % change between two numbers; null when there is nothing to compare with.
export function pctChange(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// Bars for the revenue chart. weekly = last 7 days, monthly = last 8 weeks, yearly = last 12 months.
export function revenueSeries(bookings, mode = 'weekly', now = Date.now()) {
  const today = startOfDay(now);
  let buckets = [];
  if (mode === 'weekly') {
    buckets = Array.from({ length: 7 }, (_, i) => { const s = today - (6 - i) * DAY; return { label: WEEKDAYS[new Date(s).getDay()], from: s, to: s + DAY }; });
  } else if (mode === 'monthly') {
    buckets = Array.from({ length: 8 }, (_, i) => {
      const to = today + DAY - (7 - i) * 7 * DAY, from = to - 7 * DAY; const d = new Date(from);
      return { label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, from, to };
    });
  } else {
    const n = new Date(now);
    buckets = Array.from({ length: 12 }, (_, i) => {
      const from = new Date(n.getFullYear(), n.getMonth() - (11 - i), 1); const to = new Date(n.getFullYear(), n.getMonth() - (10 - i), 1);
      return { label: MONTHS[from.getMonth()], from: from.getTime(), to: to.getTime() };
    });
  }
  return buckets.map((b) => ({ label: b.label, value: round2(sumPaid(bookings, b.from, b.to)), bookings: countPaid(bookings, b.from, b.to) }));
}

// Daily revenue for the last `days` days (area chart).
export function dailySeries(bookings, days = 30, now = Date.now()) {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const from = today - (days - 1 - i) * DAY; const d = new Date(from);
    return { label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, value: round2(sumPaid(bookings, from, from + DAY)) };
  });
}

// Headline numbers with the change vs the 30 days before.
export function monthlyKpis(bookings, now = Date.now()) {
  const end = startOfDay(now) + DAY, mid = end - 30 * DAY, start = mid - 30 * DAY;
  const rev = sumPaid(bookings, mid, end), prevRev = sumPaid(bookings, start, mid);
  const cnt = countPaid(bookings, mid, end), prevCnt = countPaid(bookings, start, mid);
  const aov = cnt ? rev / cnt : 0, prevAov = prevCnt ? prevRev / prevCnt : 0;
  return { revenue: round2(rev), revenueChange: pctChange(rev, prevRev), bookings: cnt, bookingsChange: pctChange(cnt, prevCnt), aov: round2(aov), aovChange: pctChange(aov, prevAov) };
}

// Guests travelling in the next 7 days vs the previous 7 (by departure date).
export function guestsTrend(bookings, now = Date.now()) {
  const iso = (offset) => new Date(startOfDay(now) + offset * DAY).toISOString().slice(0, 10);
  const guests = (from, to) => bookings.filter((b) => isPaid(b) && b.date >= from && b.date < to).reduce((s, b) => s + b.adults + b.children, 0);
  const next = guests(iso(0), iso(7)), prev = guests(iso(-7), iso(0));
  return { next, change: pctChange(next, prev) };
}

export const CATEGORY_LABEL = { safari: 'Safaris', adventure: 'Adventure', 'day-trip': 'Day trips', event: 'Events' };

// Confirmed bookings per tour category, for the donut.
export function categoryBreakdown(bookings, tours) {
  const cat = new Map(tours.map((t) => [t.slug, t.category]));
  const counts = {};
  for (const b of bookings.filter(isPaid)) { const c = cat.get(b.slug) || 'other'; counts[c] = (counts[c] || 0) + 1; }
  return Object.entries(counts).map(([key, value]) => ({ key, name: CATEGORY_LABEL[key] || 'Other', value })).sort((a, b) => b.value - a.value);
}

// Money position for the Finance page.
export function financeTotals(bookings) {
  const revenue = bookings.filter(isPaid).reduce((s, b) => s + b.totalUsd, 0);
  const pending = bookings.filter((b) => b.status === 'pending').reduce((s, b) => s + b.totalUsd, 0);
  const refunds = bookings.reduce((s, b) => s + refundUsd(b), 0);
  const collected = revenue + pending ? Math.round((revenue / (revenue + pending)) * 100) : 0;
  return { revenue: round2(revenue), pending: round2(pending), refunds: round2(refunds), collectedPct: collected };
}

// "MoMo QR · Mobile money" instead of "momo_qr · mobile_money".
const PROVIDER = { stripe: 'Stripe', momo_qr: 'MoMo QR', flutterwave: 'Flutterwave', demo: 'Demo' };
const METHOD = { card: 'Card', wallet: 'Wallet', mobile_money: 'Mobile money' };
export const providerLabel = (b) => PROVIDER[b.payment?.provider] || b.payment?.provider || '—';
export const methodLabel = (b) => METHOD[b.payment?.method] || b.payment?.method || '';

// MoMo QR bookings with a transaction ID that staff still need to confirm.
export const needsPaymentCheck = (b) => b.payment?.provider === 'momo_qr' && (b.status === 'pending' || b.status === 'expired') && Boolean(b.payment?.proof);

// CSV text for "Export": quotes every cell so commas in names are safe.
export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const cell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
}
export function downloadCsv(filename, rows) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
