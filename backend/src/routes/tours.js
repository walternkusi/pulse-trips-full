// =============================================================================
// TOUR & AVAILABILITY ROUTES (read-only, public)
// =============================================================================
import { Router } from 'express';
import { store } from '../data/store.js';
import { destinations } from '../data/tours.js';
import { slotsFor, calendarFor } from '../services/availability.js';
import { subscribe } from '../services/realtime.js';
import { HttpError } from '../middleware/errors.js';
import { isDate, isMonth } from '../middleware/validate.js';

export const tourRoutes = Router();

// Looks up a tour from ?slug= or :slug, or answers 404.
function tourOr404(slug) {
  const tour = store.getTour(String(slug || ''));
  if (!tour) throw new HttpError(404, 'Tour not found.');
  return tour;
}

// GET /api/tours?category=safari&country=Kenya -> tour cards (filters are optional)
tourRoutes.get('/tours', (req, res) => {
  const { category, country } = req.query;
  const all = store.listTours();
  const tours = all.filter((t) => (!category || t.category === category) && (!country || t.country === country));
  // Destinations for the search dropdowns: the fixed list + any country that has tours.
  const countries = [...new Set([...destinations, ...all.map((t) => t.country)])].sort();
  res.json({ tours, destinations: countries });
});

// GET /api/tours/:slug -> one tour + its add-ons + latest reviews (tour detail page)
tourRoutes.get('/tours/:slug', (req, res) => {
  const tour = tourOr404(req.params.slug);
  // Hidden (unpublished) tours are invisible to the public, but keep working for existing bookings.
  if (tour.published === false) throw new HttpError(404, 'Tour not found.');
  res.json({ tour, addons: store.listAddons(tour.addonIds), reviews: store.listPublicReviews(tour.slug).slice(0, 6) });
});

// GET /api/availability?slug=...&date=YYYY-MM-DD -> departure slots with seats left
tourRoutes.get('/availability', (req, res) => {
  const tour = tourOr404(req.query.slug);
  if (!isDate(req.query.date)) throw new HttpError(400, 'Choose a valid date.');
  store.expireHolds();
  res.json({ date: req.query.date, slots: slotsFor(tour, req.query.date) });
});

// GET /api/availability/calendar?slug=...&month=YYYY-MM -> one status per day (calendar view)
tourRoutes.get('/availability/calendar', (req, res) => {
  const tour = tourOr404(req.query.slug);
  if (!isMonth(req.query.month)) throw new HttpError(400, 'Month must look like 2026-10.');
  res.json({ month: req.query.month, days: calendarFor(tour, req.query.month) });
});

// GET /api/availability/stream?slug=... -> Server-Sent Events: "seats changed, refresh"
tourRoutes.get('/availability/stream', (req, res) => {
  const tour = tourOr404(req.query.slug);
  subscribe(req, res, tour.slug);
});
