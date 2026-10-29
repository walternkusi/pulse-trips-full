// =============================================================================
// BOOKING ROUTES
// Quote -> book -> (pay) -> voucher -> manage (cancel / reschedule).
// Guests manage bookings with reference + email: no account needed.
// =============================================================================
import { Router } from 'express';
import { createBooking, cancelBooking, rescheduleBooking, submitMomoProof, quote } from '../services/bookings.js';
import { buildVoucher } from '../services/voucher.js';
import { store } from '../data/store.js';
import { parseBookingBody, parseQuoteBody, parseMomoProofBody, isEmail, isDate, isTime } from '../middleware/validate.js';
import { HttpError, wrap } from '../middleware/errors.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const bookingRoutes = Router();

// Max 20 booking attempts per IP per 10 minutes (stops seat-hoarding bots).
const bookingLimiter = rateLimit({ windowMs: 10 * 60000, max: 20 });

// Finds a booking by :reference + ?email= (or body.email), or answers 404.
// Same message for "not found" and "wrong email" so nobody can guess valid references.
function ownBooking(reference, email) {
  if (!reference || !isEmail(email)) throw new HttpError(400, 'Enter your booking reference and email.');
  const booking = store.findBookingByEmail(String(reference).toUpperCase(), String(email));
  if (!booking) throw new HttpError(404, 'We could not find that booking.');
  return booking;
}

// POST /api/quote -> itemised price for the checkout (no booking is created)
bookingRoutes.post('/quote', (req, res) => {
  res.json({ quote: quote(parseQuoteBody(req.body)) });
});

// POST /api/bookings -> hold seats, start payment. Returns { booking, redirectUrl }.
// redirectUrl is null in demo mode (booking is already confirmed).
bookingRoutes.post('/bookings', bookingLimiter, wrap(async (req, res) => {
  const result = await createBooking(parseBookingBody(req.body));
  res.status(201).json(result);
}));

// POST /api/bookings/:reference/momo-proof  body: { email, transactionId, payerPhone? }
bookingRoutes.post('/bookings/:reference/momo-proof', bookingLimiter, wrap(async (req, res) => {
  const booking = ownBooking(req.params.reference, req.body?.email);
  res.json({ booking: await submitMomoProof(booking, parseMomoProofBody(req.body)) });
}));

// GET /api/bookings/lookup?reference=PT-XXXX&email=... -> guest lookup
bookingRoutes.get('/bookings/lookup', (req, res) => {
  res.json({ booking: ownBooking(req.query.reference, req.query.email) });
});

// GET /api/bookings/:reference/voucher?email=... -> e-voucher with QR code
bookingRoutes.get('/bookings/:reference/voucher', wrap(async (req, res) => {
  const booking = ownBooking(req.params.reference, req.query.email);
  res.json({ voucher: await buildVoucher(booking) });
}));

// POST /api/bookings/:reference/cancel  body: { email } -> refund per policy
bookingRoutes.post('/bookings/:reference/cancel', bookingLimiter, wrap(async (req, res) => {
  ownBooking(req.params.reference, req.body?.email); // validates input first
  const booking = await cancelBooking(req.params.reference.toUpperCase(), String(req.body.email));
  res.json({ booking });
}));

// POST /api/bookings/:reference/reschedule  body: { email, date, time }
bookingRoutes.post('/bookings/:reference/reschedule', bookingLimiter, wrap(async (req, res) => {
  const { email, date, time } = req.body || {};
  ownBooking(req.params.reference, email);
  if (!isDate(date) || !isTime(time)) throw new HttpError(400, 'Choose a new date and departure time.');
  const booking = await rescheduleBooking(req.params.reference.toUpperCase(), email, { date, time });
  res.json({ booking });
}));
