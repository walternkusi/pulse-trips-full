// =============================================================================
// INPUT VALIDATION
// Never trust data from the browser. These helpers check and clean it before
// it reaches the services. Each parser returns clean data or throws a 400.
// =============================================================================
import { HttpError } from './errors.js';
import { isSupportedCurrency } from '../services/currency.js';
import { PAYMENT_METHODS } from '../services/payments.js';

// --- Primitive checks ---------------------------------------------------------
export const isEmail = (v) => typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
export const isTime = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export const isMonth = (v) => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
// International phone format: + then 8 to 15 digits (spaces and dashes are stripped first).
export const cleanPhone = (v) => String(v || '').replace(/[\s()-]/g, '');
export const isPhone = (v) => /^\+\d{8,15}$/.test(v);

// Trims a string and cuts it to `max` characters.
const text = (v, max) => String(v ?? '').trim().slice(0, max);

// Fields shared by the quote and the booking request.
function parseTrip(body) {
  const adults = Number(body.adults);
  const children = Number(body.children || 0);
  if (!body.slug) throw new HttpError(400, 'Choose a tour.');
  if (!isDate(body.date)) throw new HttpError(400, 'Choose a valid date.');
  if (!Number.isInteger(adults) || adults < 1 || adults > 50) throw new HttpError(400, 'At least one adult is required.');
  if (!Number.isInteger(children) || children < 0 || children > 50) throw new HttpError(400, 'Children must be 0 or more.');
  const currency = String(body.currency || 'USD').toUpperCase();
  if (!isSupportedCurrency(currency)) throw new HttpError(400, 'Unsupported currency.');
  return {
    slug: text(body.slug, 80),
    date: body.date,
    adults,
    children,
    isPrivate: Boolean(body.isPrivate),
    addonIds: Array.isArray(body.addonIds) ? body.addonIds.slice(0, 10).map(String) : [],
    promoCode: text(body.promoCode, 20),
    currency,
  };
}

// POST /api/quote
export const parseQuoteBody = (body = {}) => parseTrip(body);

// POST /api/bookings
export function parseBookingBody(body = {}) {
  const trip = parseTrip(body);
  if (!isTime(body.time)) throw new HttpError(400, 'Choose a departure time.');
  if (!isEmail(body.email)) throw new HttpError(400, 'Enter a valid email address.');
  if (!body.name || text(body.name, 100).length < 2) throw new HttpError(400, 'Enter your full name.');
  const phone = cleanPhone(body.phone);
  if (phone && !isPhone(phone)) throw new HttpError(400, 'Enter your phone in international format, e.g. +254 700 000 000.');
  const method = PAYMENT_METHODS.includes(body.method) ? body.method : 'card';
  if (!body.acceptPolicy) throw new HttpError(400, 'Please accept the cancellation policy.');
  return {
    ...trip,
    time: body.time,
    method,
    name: text(body.name, 100),
    email: body.email.trim(),
    phone,
    // Special requirements are stored for the CRM (dietary, accessibility, mobility).
    notes: text(body.notes, 500),
    language: text(body.language, 5) || 'en',
    marketingOptIn: Boolean(body.marketingOptIn),
  };
}

// POST /api/bookings/:reference/momo-proof: the guest's MoMo transaction ID after paying.
export function parseMomoProofBody(body = {}) {
  const transactionId = String(body.transactionId || '').replace(/\s/g, '');
  if (!/^[A-Za-z0-9]{6,24}$/.test(transactionId)) throw new HttpError(400, 'Enter the transaction ID from your MTN MoMo confirmation message (6 to 24 letters or digits).');
  const payerPhone = cleanPhone(body.payerPhone);
  if (payerPhone && !isPhone(payerPhone)) throw new HttpError(400, 'Enter the phone you paid from in international format, e.g. +250 788 000 000.');
  return { transactionId, payerPhone };
}

// POST /api/reviews — photos arrive as small data-URL JPEGs resized in the browser.
export function parseReviewBody(body = {}) {
  const rating = Number(body.rating);
  if (!body.reference || !isEmail(body.email)) throw new HttpError(400, 'Enter your booking reference and email.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Choose a rating from 1 to 5 stars.');
  const reviewText = text(body.text, 2000);
  if (reviewText.length < 20) throw new HttpError(400, 'Please write at least 20 characters.');
  const photos = (Array.isArray(body.photos) ? body.photos : []).slice(0, 3);
  for (const p of photos) {
    // Only small JPEG/PNG/WebP data URLs (~400 KB max each) are accepted.
    if (typeof p !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(p) || p.length > 550000) {
      throw new HttpError(400, 'Photos must be JPEG, PNG or WebP images under 400 KB.');
    }
  }
  return { reference: text(body.reference, 12).toUpperCase(), email: body.email.trim(), rating, title: text(body.title, 120), text: reviewText, photos };
}
