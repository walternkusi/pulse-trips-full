// =============================================================================
// MISC PUBLIC ROUTES
// reviews · contact & live chat · newsletter (lead capture) · currencies ·
// policies · analytics events
// =============================================================================
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { store } from '../data/store.js';
import { isEmail, parseReviewBody, cleanPhone } from '../middleware/validate.js';
import { HttpError, wrap } from '../middleware/errors.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { listRates } from '../services/currency.js';
import { POLICY } from '../services/policy.js';
import { recordEvent } from '../services/analytics.js';
import { sendEmail, emailLayout, escapeHtml } from '../services/notifications.js';

export const miscRoutes = Router();

// Form endpoints: 5 submissions per IP per 10 minutes is plenty for humans.
const formLimiter = rateLimit({ windowMs: 10 * 60000, max: 5 });
// Analytics: generous, just enough to stop floods.
const eventLimiter = rateLimit({ windowMs: 60000, max: 120 });

// -----------------------------------------------------------------------------
// REVIEWS
// -----------------------------------------------------------------------------

// GET /api/reviews?slug=optional -> verified reviews (optionally for one tour)
miscRoutes.get('/reviews', (req, res) => res.json({ reviews: store.listPublicReviews(req.query.slug) }));

// POST /api/reviews -> only guests who actually travelled can review ("Verified traveler").
miscRoutes.post('/reviews', formLimiter, (req, res) => {
  const input = parseReviewBody(req.body);
  const booking = store.findBookingByEmail(input.reference, input.email);
  if (!booking || booking.status !== 'confirmed') throw new HttpError(404, 'We could not find a confirmed booking with that reference and email.');
  if (booking.date > new Date().toISOString().slice(0, 10)) throw new HttpError(409, 'You can leave a review after your trip date.');
  if (store.reviewForBooking(booking.reference)) throw new HttpError(409, 'You have already reviewed this trip. Thank you!');

  // Public display name: "Amina K." (first name + last initial) to protect privacy.
  const [first, ...rest] = booking.name.split(/\s+/);
  const review = store.addReview({
    id: randomUUID(),
    tourSlug: booking.slug,
    tourName: booking.tourName,
    reference: booking.reference,   // never sent to the browser on its own; used for dedupe
    rating: input.rating,
    title: input.title,
    text: input.text,
    photos: input.photos,           // TODO (production): upload to S3/Cloudinary and store URLs instead
    name: `${first}${rest.length ? ` ${rest[rest.length - 1][0]}.` : ''}`,
    verified: true,
    travelDate: booking.date.slice(0, 7),
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ review: { ...review, reference: undefined } });
});

// -----------------------------------------------------------------------------
// CONTACT FORM & LIVE CHAT MESSAGES
// -----------------------------------------------------------------------------

// POST /api/contact  body: { name, email, phone?, message, tour?, source? }
miscRoutes.post('/contact', formLimiter, wrap(async (req, res) => {
  const { name, email, message, tour, source } = req.body || {};
  if (!name || !isEmail(email) || !message) throw new HttpError(400, 'Name, a valid email and a message are required.');
  const entry = store.saveMessage({
    name: String(name).slice(0, 100),
    email: String(email).trim(),
    phone: cleanPhone(req.body.phone).slice(0, 20),
    tour: String(tour || '').slice(0, 80),
    source: source === 'chat' ? 'chat' : 'contact', // live-chat widget or contact page
    message: String(message).slice(0, 2000),
    at: new Date().toISOString(),
  });

  // Forward to the team inbox so nobody has to check the admin panel for new leads.
  if (config.teamEmail) {
    await sendEmail({
      to: config.teamEmail,
      kind: 'team-notification',
      subject: `New ${entry.source} message from ${entry.name}`,
      html: emailLayout('New message', `<p><b>${escapeHtml(entry.name)}</b> &lt;${escapeHtml(entry.email)}&gt; ${escapeHtml(entry.phone)}</p><p>Tour: ${escapeHtml(entry.tour || '—')}</p><p style="white-space:pre-wrap">${escapeHtml(entry.message)}</p>`),
    });
  }
  res.status(201).json({ ok: true });
}));

// -----------------------------------------------------------------------------
// NEWSLETTER / LEAD CAPTURE
// Returns the welcome discount code + travel-guide link so the UI can show them
// instantly, and emails them too.
// TODO: also push the email to your mailing tool (Mailchimp, Brevo, ConvertKit...).
// -----------------------------------------------------------------------------
miscRoutes.post('/newsletter', formLimiter, wrap(async (req, res) => {
  if (!isEmail(req.body?.email)) throw new HttpError(400, 'Enter a valid email address.');
  const isNew = store.addSubscriber(req.body.email, String(req.body.source || 'popup').slice(0, 20));
  const offer = { code: 'WELCOME10', percent: 10, guideUrl: '/travel-guide' };
  if (isNew) {
    await sendEmail({
      to: req.body.email,
      kind: 'welcome',
      subject: 'Your 10% Pulse Trips welcome code 🎉',
      html: emailLayout('Welcome to the Pulse!', `
        <p style="line-height:1.6">Thanks for joining. Here is <b>10% off</b> your first trip:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:3px;color:#C2185B">${offer.code}</p>
        <p><a href="${config.siteUrl}${offer.guideUrl}" style="color:#C2185B">Download your free East & Southern Africa travel guide →</a></p>`),
    });
  }
  res.status(201).json({ ok: true, ...offer });
}));

// -----------------------------------------------------------------------------
// REFERENCE DATA
// -----------------------------------------------------------------------------

// GET /api/currencies -> exchange rates for the currency toggle
miscRoutes.get('/currencies', (req, res) => res.json(listRates()));

// GET /api/policies -> the cancellation/refund policy the booking logic uses
miscRoutes.get('/policies', (req, res) => res.json({ policy: POLICY }));

// POST /api/events -> anonymous funnel analytics (see services/analytics.js)
miscRoutes.post('/events', eventLimiter, (req, res) => {
  recordEvent(req.body || {});
  res.status(204).end();
});
