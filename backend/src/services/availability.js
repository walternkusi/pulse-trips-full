// =============================================================================
// AVAILABILITY SERVICE
// Answers "which departures run on this date and how many seats are left?"
// and builds the month view for the availability calendar.
//
// 🔌 REAL BOOKING ENGINE: when you connect FareHarbor / Checkfront / Rezdy,
//    replace `seatsLeftFor` with a call to their availability API. Nothing
//    else in the app needs to change.
// =============================================================================
import { store } from '../data/store.js';

// Local UTC offsets of the countries we operate in (none observe daylight saving).
// Departure times in tours.js are LOCAL times, so we need this to compare with "now".
export const UTC_OFFSET_HOURS = { Tanzania: 3, Kenya: 3, Rwanda: 2, Uganda: 3, 'South Africa': 2 };

const MAX_DAYS_AHEAD = 365; // how far into the future guests may book

// Exact moment a departure starts, as a JS timestamp (ms).
export function departureInstant(tour, date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const offset = UTC_OFFSET_HOURS[tour.country] ?? 0;
  return Date.UTC(y, m - 1, d, hh - offset, mm);
}

// Does the tour run on this calendar date? (weekday check)
export function isOperatingDay(tour, date) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return tour.daysOfWeek.includes(weekday);
}

// Seats still free on one departure. A private booking takes the whole departure.
export function seatsLeftFor(tour, date, time) {
  if (store.hasPrivateBooking(tour.slug, date, time)) return 0;
  return Math.max(0, tour.maxGuests - store.seatsTaken(tour.slug, date, time));
}

// Status label the UI turns into colours: available / limited / soldout / closed.
function statusFor(seatsLeft, capacity) {
  if (seatsLeft <= 0) return 'soldout';
  if (seatsLeft <= Math.max(2, Math.ceil(capacity * 0.25))) return 'limited';
  return 'available';
}

// All departure slots on one date, with live seat counts.
export function slotsFor(tour, date, now = Date.now()) {
  if (!isOperatingDay(tour, date)) return [];
  const horizon = now + MAX_DAYS_AHEAD * 86400000;
  return tour.departures.map((time) => {
    const start = departureInstant(tour, date, time);
    // Booking closes `cutoffHours` before departure (time for guides to prepare).
    const bookable = start - tour.cutoffHours * 3600000 > now && start < horizon;
    const seatsLeft = bookable ? seatsLeftFor(tour, date, time) : 0;
    return {
      time,
      capacity: tour.maxGuests,
      seatsLeft,
      status: bookable ? statusFor(seatsLeft, tour.maxGuests) : 'closed',
    };
  });
}

// Month view for the calendar: one entry per day of `month` (YYYY-MM).
export function calendarFor(tour, month, now = Date.now()) {
  store.expireHolds(now); // release abandoned checkouts before counting
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const slots = slotsFor(tour, date, now);
    const open = slots.filter((s) => s.status !== 'closed');
    const seatsLeft = open.reduce((sum, s) => sum + s.seatsLeft, 0);
    let status = 'closed';
    if (open.length) {
      if (open.every((s) => s.status === 'soldout')) status = 'soldout';
      else if (open.some((s) => s.status === 'available')) status = 'available';
      else status = 'limited';
    }
    days.push({ date, status, seatsLeft });
  }
  return days;
}
