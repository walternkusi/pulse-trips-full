// =============================================================================
// ADMIN ROUTES (protected by ADMIN_TOKEN)
// Powers the /admin dashboard: analytics, bookings, check-in, CRM and roster.
// =============================================================================
import { Router } from 'express';
import { store } from '../data/store.js';
import { requireAdmin } from '../middleware/auth.js';
import { HttpError, wrap } from '../middleware/errors.js';
import { isDate } from '../middleware/validate.js';
import { overview } from '../services/analytics.js';
import { listGuests, getGuest } from '../services/crm.js';
import { listDepartures, assign, parseDepartureId } from '../services/roster.js';
import { cancelBooking, confirmBooking } from '../services/bookings.js';
import { createTourFrom, updateTourFrom, saveUpload, searchPhotos, trackPhotoUse, COUNTRIES, CATEGORIES, LEVELS } from '../services/tourAdmin.js';

export const adminRoutes = Router();
adminRoutes.use('/admin', requireAdmin); // every route below needs the token

// --- Dashboard ----------------------------------------------------------------
// GET /api/admin/overview -> KPIs, funnel, abandonment, top tours, traffic sources
adminRoutes.get('/admin/overview', (req, res) => res.json(overview()));

// --- Bookings -----------------------------------------------------------------
// GET /api/admin/bookings?status=confirmed&q=amina
adminRoutes.get('/admin/bookings', (req, res) => {
  const { status, slug, q } = req.query;
  res.json({ bookings: store.listBookings({ status, slug, q }).slice(0, 500) });
});

// POST /api/admin/bookings/:reference/checkin -> guide scanned the QR code
adminRoutes.post('/admin/bookings/:reference/checkin', (req, res) => {
  const booking = store.getBooking(req.params.reference.toUpperCase());
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (booking.status !== 'confirmed') throw new HttpError(409, `Booking is ${booking.status}, not confirmed.`);
  booking.checkedInAt = booking.checkedInAt || new Date().toISOString();
  store.saveBooking(booking);
  res.json({ booking });
});

// POST /api/admin/bookings/:reference/confirm-payment -> staff saw the MoMo payment: confirm and send the voucher
adminRoutes.post('/admin/bookings/:reference/confirm-payment', wrap(async (req, res) => {
  const booking = store.getBooking(req.params.reference.toUpperCase());
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (booking.payment?.provider !== 'momo_qr') throw new HttpError(400, 'Only MoMo QR bookings are confirmed by hand.');
  if (booking.status === 'cancelled') throw new HttpError(409, 'This booking was cancelled.');
  await confirmBooking(booking, { transactionId: booking.payment.proof?.transactionId || '', confirmedBy: 'admin' });
  res.json({ booking });
}));

// POST /api/admin/bookings/:reference/reject-payment -> no payment found: cancel and free the seats
adminRoutes.post('/admin/bookings/:reference/reject-payment', wrap(async (req, res) => {
  const booking = store.getBooking(req.params.reference.toUpperCase());
  if (!booking) throw new HttpError(404, 'Booking not found.');
  if (booking.payment?.provider !== 'momo_qr' || booking.status === 'confirmed') throw new HttpError(409, 'Only unconfirmed MoMo QR bookings can be rejected.');
  res.json({ booking: await cancelBooking(booking.reference, null, { reason: 'payment_not_received', skipEmailCheck: true }) });
}));

// --- CRM ----------------------------------------------------------------------
// GET /api/admin/guests?q=...
adminRoutes.get('/admin/guests', (req, res) => res.json({ guests: listGuests(req.query.q) }));

// GET /api/admin/guests/:email -> profile, bookings, communication timeline
adminRoutes.get('/admin/guests/:email', (req, res) => {
  const guest = getGuest(req.params.email);
  if (!guest) throw new HttpError(404, 'Guest not found.');
  res.json(guest);
});

// POST /api/admin/guests/:email/notes  body: { text } -> internal staff note
adminRoutes.post('/admin/guests/:email/notes', (req, res) => {
  const text = String(req.body?.text || '').trim().slice(0, 1000);
  if (!text) throw new HttpError(400, 'Write a note first.');
  res.status(201).json({ note: store.addGuestNote(req.params.email, text) });
});

// --- Roster -------------------------------------------------------------------
// GET /api/admin/resources -> guides, drivers, vehicles
adminRoutes.get('/admin/resources', (req, res) => res.json(store.resources()));

// GET /api/admin/roster?from=YYYY-MM-DD&to=YYYY-MM-DD&all=1
adminRoutes.get('/admin/roster', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const from = isDate(req.query.from) ? req.query.from : today;
  const to = isDate(req.query.to) ? req.query.to : new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);
  if (Date.parse(to) - Date.parse(from) > 62 * 86400000) throw new HttpError(400, 'Choose a window of 2 months or less.');
  res.json({ from, to, departures: listDepartures({ from, to, includeEmpty: req.query.all === '1' }) });
});

// PUT /api/admin/roster/:id  body: { guideId, driverId, vehicleId }
adminRoutes.put('/admin/roster/:id', (req, res) => {
  res.json({ assignment: assign(req.params.id, req.body || {}) });
});

// POST /api/admin/roster/:id/weather-cancel -> cancel every booking on a departure, 100% refund
adminRoutes.post('/admin/roster/:id/weather-cancel', wrap(async (req, res) => {
  const { slug, date, time } = parseDepartureId(req.params.id);
  const affected = store.bookingsOnDeparture(slug, date, time);
  for (const b of affected) await cancelBooking(b.reference, b.email, { reason: 'weather', skipEmailCheck: true });
  res.json({ cancelled: affected.length });
}));

// --- Tours (catalogue editor) ------------------------------------------------
// GET /api/admin/tours -> every tour (published or hidden) + the options the editor needs
adminRoutes.get('/admin/tours', (req, res) => {
  res.json({ tours: store.listAllTours(), addons: store.listAddons(), options: { countries: COUNTRIES, categories: CATEGORIES, levels: LEVELS } });
});

// POST /api/admin/tours -> create a new tour (body: full tour fields)
adminRoutes.post('/admin/tours', (req, res) => {
  res.status(201).json({ tour: createTourFrom(req.body) });
});

// PUT /api/admin/tours/:slug -> save edits (card text, photos, prices, schedule...)
adminRoutes.put('/admin/tours/:slug', (req, res) => {
  res.json({ tour: updateTourFrom(req.params.slug, req.body) });
});

// POST /api/admin/uploads  body: { dataUrl } -> { src } (photo stored in storage/uploads)
adminRoutes.post('/admin/uploads', (req, res) => {
  res.status(201).json(saveUpload(req.body?.dataUrl));
});

// GET /api/admin/photos/search?q=Serengeti+wildebeest&page=1 -> real photos of the place (Unsplash)
adminRoutes.get('/admin/photos/search', wrap(async (req, res) => {
  res.json(await searchPhotos(req.query.q, req.query.page));
}));

// POST /api/admin/photos/track  body: { downloadLocation } -> Unsplash usage ping (licence terms)
adminRoutes.post('/admin/photos/track', wrap(async (req, res) => {
  await trackPhotoUse(req.body?.downloadLocation);
  res.status(204).end();
}));
