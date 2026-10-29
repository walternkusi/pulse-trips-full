// =============================================================================
// PRICING SERVICE
// Pure function (no I/O except reading the catalogue) that turns a booking
// request into an itemised quote. Being pure makes it easy to unit-test.
//
// 🔒 The server ALWAYS recalculates the total itself: never trust a price sent
//    by the browser. The frontend asks POST /api/quote and just displays it.
//
// Pricing rules, applied in this order:
//   1. Base:   private flat rate, OR adults × adult price + children × child price
//   2. Season: multiplier for the departure month (peak / green season)
//   3. Group:  % discount when a shared booking reaches the group size
//   4. Add-ons: per person or per booking
//   5. Promo:  % discount code (e.g. WELCOME10 from the newsletter)
//   6. Convert everything from USD into the chosen currency
// =============================================================================
import { store } from '../data/store.js';
import { fromUsd, BASE_CURRENCY } from './currency.js';

// Finds the seasonal rule for the month of `date` (YYYY-MM-DD), if any.
export function seasonFor(tour, date) {
  const month = Number(String(date || '').slice(5, 7));
  return tour.pricing.seasons.find((s) => s.months.includes(month)) || null;
}

export function calculatePrice(tour, { date, adults, children, isPrivate, addonIds = [], promoCode, currency = BASE_CURRENCY }) {
  const p = tour.pricing;
  const guests = adults + children;
  const lines = []; // human-readable breakdown shown in checkout and on the voucher

  // --- 1. Base price -----------------------------------------------------------
  let base;
  if (isPrivate) {
    base = p.privateFlat;
    lines.push({ label: `Private tour (up to ${tour.maxGuests} guests)`, usd: base });
  } else {
    base = adults * p.adult + children * p.child;
    lines.push({ label: `${adults} × Adult`, usd: adults * p.adult });
    if (children) lines.push({ label: `${children} × Child`, usd: children * p.child });
  }

  // --- 2. Seasonal adjustment --------------------------------------------------
  const season = seasonFor(tour, date);
  if (season) {
    const delta = base * (season.multiplier - 1);
    lines.push({ label: `${season.name} (${season.multiplier > 1 ? '+' : ''}${Math.round((season.multiplier - 1) * 100)}%)`, usd: delta });
    base += delta;
  }

  // --- 3. Group discount (shared tours only; private already has a flat rate) ---
  if (!isPrivate && p.group && guests >= p.group.minGuests) {
    const delta = -base * p.group.discount;
    lines.push({ label: `Group rate ${p.group.minGuests}+ guests (−${Math.round(p.group.discount * 100)}%)`, usd: delta });
    base += delta;
  }

  // --- 4. Add-ons (only ids that really exist on this tour are counted) ---------
  for (const a of store.listAddons(tour.addonIds).filter((x) => addonIds.includes(x.id))) {
    const qty = a.per === 'person' ? guests : 1;
    lines.push({ label: qty > 1 ? `${a.label} × ${qty}` : a.label, usd: a.price * qty });
    base += a.price * qty;
  }

  // --- 5. Promo code ------------------------------------------------------------
  const promo = promoCode ? store.getPromo(promoCode) : null;
  if (promo) {
    const delta = -base * (promo.percent / 100);
    lines.push({ label: `${promo.label} (−${promo.percent}%)`, usd: delta });
    base += delta;
  }

  // --- 6. Convert to the customer's currency ------------------------------------
  const totalUsd = Math.round(base * 100) / 100;
  return {
    currency,
    lines: lines.map((l) => ({ label: l.label, amount: fromUsd(l.usd, currency) })),
    total: fromUsd(totalUsd, currency),
    totalUsd,                                     // kept for reporting in one currency
    promo: promoCode ? (promo ? 'applied' : 'invalid') : 'none',
  };
}
