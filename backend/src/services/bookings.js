// =============================================================================
// BOOKING SERVICE
// Business rules for creating, confirming, cancelling and rescheduling
// bookings live here, NOT in route handlers (routes stay thin; rules stay testable).
//
// HOW DOUBLE-BOOKING IS PREVENTED
//   1. Seats are checked and the booking is saved as 'pending' in the SAME
//      synchronous step (no `await` in between). Node runs one piece of JS at a
//      time, so two guests can never both grab the last seat.
//   2. The pending booking HOLDS its seats while the guest pays. If they abandon
//      the payment page, the hold expires (config.holdMinutes) and seats free up.
//   3. Only a verified payment (demo, or a signed provider webhook) turns the
//      booking 'confirmed'.
//   With MongoDB the bookings are still held in memory while the server runs
//   (store.js saves each change to the database), so run ONE copy of the API.
// =============================================================================
import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { store } from '../data/store.js';
import { calculatePrice } from './pricing.js';
import { slotsFor, seatsLeftFor, departureInstant } from './availability.js';
import { createPayment, refundPayment } from './payments.js';
import { sendConfirmation, sendCancellation, sendReschedule } from './voucher.js';
import { sendEmail, escapeHtml, emailLayout } from './notifications.js';
import { refundPercent, canReschedule, hoursUntil } from './policy.js';
import { publishAvailability } from './realtime.js';
import { ZERO_DECIMAL } from './currency.js';
import { HttpError } from '../middleware/errors.js';

// Human-friendly unique reference like "PT-4F9A2C" (no ambiguous characters needed: hex only).
function makeReference() {
  let ref;
  do { ref = 'PT-' + randomBytes(3).toString('hex').toUpperCase(); } while (store.getBooking(ref));
  return ref;
}

// Rounds a refund the same way the currency is charged.
const roundMoney = (amount, currency) => (ZERO_DECIMAL.includes(currency) ? Math.round(amount) : Math.round(amount * 100) / 100);

// Shared checks: does this departure exist, is it open, are there enough seats?
function assertBookable(tour, { date, time, adults, children, isPrivate }) {
  const slot = slotsFor(tour, date).find((s) => s.time === time);
  if (!slot || slot.status === 'closed') throw new HttpError(409, 'This departure is no longer available. Please choose another date or time.');
  const guests = adults + children;
  if (guests > tour.maxGuests) throw new HttpError(400, `This tour takes up to ${tour.maxGuests} guests per departure.`);
  if (isPrivate && slot.seatsLeft < tour.maxGuests) {
    throw new HttpError(409, 'Private tours need an empty departure. Please pick another time or date.');
  }
  if (guests > slot.seatsLeft) throw new HttpError(409, `Only ${slot.seatsLeft} seat(s) left on that departure.`);
}

// -----------------------------------------------------------------------------
// QUOTE (no side effects): used by the checkout to show a live price breakdown.
// -----------------------------------------------------------------------------
export function quote(input) {
  const tour = store.getTour(input.slug);
  if (!tour) throw new HttpError(404, 'Tour not found.');
  return calculatePrice(tour, input);
}

// -----------------------------------------------------------------------------
// CREATE: validate -> hold seats -> start payment -> (confirm in demo mode)
// Returns { booking, redirectUrl } — redirectUrl is set when the guest must pay
// on Stripe / Flutterwave's hosted page.
// -----------------------------------------------------------------------------
export async function createBooking(input) {
  const tour = store.getTour(input.slug);
  if (!tour) throw new HttpError(404, 'Tour not found.');
  store.expireHolds();

  // --- Steps 1 & 2: check + hold seats atomically (no await until saveBooking) ---
  assertBookable(tour, input);
  const price = calculatePrice(tour, input);
  const now = Date.now();
  const booking = store.saveBooking({
    reference: makeReference(),
    status: 'pending',
    slug: tour.slug,
    tourName: tour.name,
    date: input.date,
    time: input.time,
    adults: input.adults,
    children: input.children,
    isPrivate: input.isPrivate,
    addonIds: input.addonIds,
    promoCode: price.promo === 'applied' ? input.promoCode.toUpperCase() : '',
    name: input.name,
    email: input.email,
    phone: input.phone,
    notes: input.notes,                 // dietary / accessibility needs -> CRM
    language: input.language,
    currency: price.currency,
    price,
    total: price.total,
    totalUsd: price.totalUsd,
    payment: { method: input.method, provider: '', status: 'pending' },
    // Hold slightly longer than Stripe's minimum 30-minute checkout session.
    holdExpiresAt: new Date(now + Math.max(config.holdMinutes, 35) * 60000).toISOString(),
    rescheduleCount: 0,
    history: [{ at: new Date(now).toISOString(), event: 'created' }],
    createdAt: new Date(now).toISOString(),
  });
  publishAvailability(tour.slug, booking.date, booking.time); // other visitors see the seats go

  // Newsletter opt-in ticked at checkout -> lead list.
  if (input.marketingOptIn) store.addSubscriber(input.email, 'checkout');

  // --- Step 3: start payment ---------------------------------------------------
  let payment;
  try {
    payment = await createPayment(booking, input.method);
  } catch (err) {
    // Payment provider failed: release the seats immediately.
    booking.status = 'cancelled';
    booking.history.push({ at: new Date().toISOString(), event: 'payment_failed' });
    store.saveBooking(booking);
    publishAvailability(tour.slug, booking.date, booking.time);
    throw err;
  }
  booking.payment = { ...booking.payment, provider: payment.provider, id: payment.id, ...(payment.momo && { momo: payment.momo }) };
  // Paying by MoMo QR takes longer than a card: hold the seats for MOMO_HOLD_MINUTES.
  if (payment.provider === 'momo_qr') booking.holdExpiresAt = new Date(Date.now() + config.momoHoldMinutes * 60000).toISOString();
  store.saveBooking(booking);

  // Demo mode pays instantly; real providers confirm later through the webhook.
  if (payment.status === 'succeeded') await confirmBooking(booking);
  return { booking, redirectUrl: payment.redirectUrl || null };
}

// -----------------------------------------------------------------------------
// CONFIRM: called after a verified payment (demo or webhook).
// `details` can carry provider ids needed later for refunds.
// -----------------------------------------------------------------------------
export async function confirmBooking(booking, details = {}) {
  if (booking.status === 'confirmed') return booking; // webhooks can arrive twice: stay idempotent
  Object.assign(booking.payment, details, { status: 'paid' });

  // Rare case: guest paid after their hold expired AND someone else took the seats.
  if (booking.status !== 'pending') {
    const free = seatsLeftFor(store.getTour(booking.slug), booking.date, booking.time);
    if (free < booking.adults + booking.children) {
      booking.status = 'cancelled';
      booking.cancelReason = 'hold_expired';
      booking.refund = { percent: 100, amount: booking.total, ...(await refundPayment(booking, booking.total)) };
      store.saveBooking(booking);
      await sendCancellation(booking);
      return booking;
    }
  }

  booking.status = 'confirmed';
  booking.confirmedAt = new Date().toISOString();
  booking.history.push({ at: booking.confirmedAt, event: 'confirmed' });
  store.saveBooking(booking); // paid: must survive a restart even if the email below fails
  publishAvailability(booking.slug, booking.date, booking.time);
  await sendConfirmation(booking); // instant voucher by email + SMS
  return booking;
}

// -----------------------------------------------------------------------------
// MOMO PROOF: the guest paid our MoMo QR and sends the transaction ID.
// The booking stays pending; staff compare it with the MoMo statement and confirm
// it in /admin. The hold is extended so the seats aren't released while we check.
// -----------------------------------------------------------------------------
export async function submitMomoProof(booking, { transactionId, payerPhone }) {
  if (booking.payment?.provider !== 'momo_qr') throw new HttpError(400, 'This booking is not paid with a MoMo QR code.');
  if (booking.status === 'confirmed') throw new HttpError(409, 'This booking is already confirmed.');
  if (booking.status !== 'pending' && booking.status !== 'expired') throw new HttpError(409, 'This booking was cancelled. Please contact us if you already paid.');
  // One MoMo payment can only ever pay for one booking.
  const reused = store.listBookings().some((b) => b.reference !== booking.reference && b.payment?.proof?.transactionId?.toUpperCase() === transactionId.toUpperCase());
  if (reused) throw new HttpError(409, 'That transaction ID was already used for another booking. Please check it and try again.');

  booking.payment.proof = { transactionId, payerPhone, at: new Date().toISOString() };
  booking.payment.status = 'submitted';
  if (booking.status === 'pending') booking.holdExpiresAt = new Date(Date.now() + 48 * 3600000).toISOString();
  booking.history.push({ at: booking.payment.proof.at, event: `momo_proof_submitted (${transactionId})` });
  store.saveBooking(booking);

  if (config.teamEmail) {
    const rows = [['Booking', booking.reference], ['Guest', `${booking.name} (${booking.email})`], ['Tour', `${booking.tourName}, ${booking.date} ${booking.time}`],
      ['Amount due', `RWF ${booking.payment.momo.amountRwf.toLocaleString('en')}`], ['MoMo transaction ID', transactionId], ['Paid from', payerPhone || 'not given']];
    await sendEmail({
      to: config.teamEmail, kind: 'team', subject: `MoMo payment to check: ${booking.reference}`,
      html: emailLayout('MoMo payment to check', `<table>${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6B7385">${escapeHtml(k)}</td><td><b>${escapeHtml(v)}</b></td></tr>`).join('')}</table><p>Check it in your MoMo statement, then confirm the booking in the admin dashboard.</p>`),
    });
  }
  return booking;
}

// -----------------------------------------------------------------------------
// CANCEL: guest-initiated (refund per policy) or operator weather cancellation (100%).
// -----------------------------------------------------------------------------
export async function cancelBooking(reference, email, { reason = 'guest', skipEmailCheck = false } = {}) {
  // Email must match so strangers can't cancel other people's trips (admin skips this).
  const booking = skipEmailCheck ? store.getBooking(reference) : store.findBookingByEmail(reference, email);
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (booking.status === 'cancelled' || booking.status === 'expired') throw new HttpError(409, 'This booking is already cancelled.');

  const tour = store.getTour(booking.slug);
  const hours = hoursUntil(departureInstant(tour, booking.date, booking.time));
  if (hours < 0 && reason === 'guest') throw new HttpError(409, 'This trip has already started and can no longer be cancelled online.');

  // Unpaid holds have nothing to refund.
  const paid = booking.status === 'confirmed';
  const percent = !paid ? 0 : reason === 'weather' ? 100 : refundPercent(hours);
  const amount = roundMoney((booking.total * percent) / 100, booking.currency);
  const result = await refundPayment(booking, amount);

  booking.status = 'cancelled';
  booking.cancelReason = reason;
  booking.cancelledAt = new Date().toISOString();
  booking.refund = { percent, amount, status: result.status };
  booking.history.push({ at: booking.cancelledAt, event: `cancelled (${reason}), refund ${percent}%` });
  store.saveBooking(booking);
  publishAvailability(booking.slug, booking.date, booking.time);
  if (paid) await sendCancellation(booking);
  return booking;
}

// -----------------------------------------------------------------------------
// RESCHEDULE: one free date change, at least 24 h before departure (see policy.js).
// -----------------------------------------------------------------------------
export async function rescheduleBooking(reference, email, { date, time }) {
  const booking = store.findBookingByEmail(reference, email);
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (booking.status !== 'confirmed') throw new HttpError(409, 'Only confirmed bookings can be rescheduled.');
  if (booking.date === date && booking.time === time) throw new HttpError(400, 'That is already your departure.');

  const tour = store.getTour(booking.slug);
  const hours = hoursUntil(departureInstant(tour, booking.date, booking.time));
  if (!canReschedule(booking, hours)) throw new HttpError(409, 'This booking can no longer be rescheduled online. Please contact us.');

  // Same seat rules as a new booking (our own seats are on another departure, so not counted).
  assertBookable(tour, { ...booking, date, time });

  const old = { date: booking.date, time: booking.time };
  // Price differences between seasons are waived on a free reschedule (keeps it simple for guests).
  Object.assign(booking, { date, time, rescheduleCount: (booking.rescheduleCount || 0) + 1 });
  booking.history.push({ at: new Date().toISOString(), event: `rescheduled from ${old.date} ${old.time}` });
  store.saveBooking(booking);
  publishAvailability(booking.slug, old.date, old.time);
  publishAvailability(booking.slug, date, time);
  await sendReschedule(booking);
  return booking;
}
