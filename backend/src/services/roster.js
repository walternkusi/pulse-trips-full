// =============================================================================
// ROSTER SERVICE (guides, drivers, vehicles)
// Generates the list of departures in a date window, shows who is assigned,
// and refuses assignments that would put one person or vehicle in two places
// at once, or squeeze more guests into a vehicle than it has seats.
//
// A departure id looks like "nairobi-giraffes-and-national-park~2026-10-20~06:30".
// =============================================================================
import { store } from '../data/store.js';
import { isOperatingDay, departureInstant } from './availability.js';
import { HttpError } from '../middleware/errors.js';

export const departureId = (slug, date, time) => `${slug}~${date}~${time}`;
export const parseDepartureId = (id) => { const [slug, date, time] = String(id).split('~'); return { slug, date, time }; };

// Adds `n` days to a YYYY-MM-DD string.
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// Start/end timestamps of a departure (end = start + tour duration).
function intervalFor(id) {
  const { slug, date, time } = parseDepartureId(id);
  const tour = store.getTour(slug);
  if (!tour) return null;
  const start = departureInstant(tour, date, time);
  return { start, end: start + tour.durationHours * 3600000 };
}

// Finds other departures that use the same resource during an overlapping time.
function conflictsFor(id, assignment) {
  const me = intervalFor(id);
  const out = [];
  for (const [otherId, other] of store.listAssignments()) {
    if (otherId === id) continue;
    const them = intervalFor(otherId);
    if (!them || them.start >= me.end || them.end <= me.start) continue; // no overlap
    for (const field of ['guideId', 'driverId', 'vehicleId']) {
      if (assignment[field] && assignment[field] === other[field]) out.push({ field, resourceId: assignment[field], departureId: otherId });
    }
  }
  return out;
}

// Departures between `from` and `to` (inclusive). By default only those with guests.
export function listDepartures({ from, to, includeEmpty = false }) {
  const res = store.resources();
  const vehicleSeats = Object.fromEntries(res.vehicles.map((v) => [v.id, v.seats]));
  const out = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    for (const tour of store.listAllTours()) { // hidden tours may still have bookings
      if (!isOperatingDay(tour, date)) continue;
      for (const time of tour.departures) {
        const bookings = store.bookingsOnDeparture(tour.slug, date, time).filter((b) => b.status === 'confirmed');
        if (!bookings.length && !includeEmpty) continue;
        const id = departureId(tour.slug, date, time);
        const assignment = store.getAssignment(id);
        const guests = bookings.reduce((s, b) => s + b.adults + b.children, 0);
        const warnings = [];
        if (!assignment.guideId) warnings.push('No guide assigned');
        if (assignment.vehicleId && vehicleSeats[assignment.vehicleId] < guests) warnings.push('Vehicle too small for guest count');
        out.push({
          id, slug: tour.slug, tourName: tour.name, date, time, durationLabel: tour.durationLabel,
          guests, capacity: tour.maxGuests,
          checkedIn: bookings.filter((b) => b.checkedInAt).length,
          // The ops manifest: who is coming and what they need.
          manifest: bookings.map((b) => ({ reference: b.reference, name: b.name, phone: b.phone, guests: b.adults + b.children, notes: b.notes, checkedIn: Boolean(b.checkedInAt), addonIds: b.addonIds })),
          assignment,
          conflicts: conflictsFor(id, assignment),
          warnings,
        });
      }
    }
  }
  return out;
}

// Assigns staff/vehicle to a departure after validating ids, conflicts and seats.
export function assign(id, { guideId = '', driverId = '', vehicleId = '' }) {
  const { slug, date, time } = parseDepartureId(id);
  const tour = store.getTour(slug);
  if (!tour || !date || !time) throw new HttpError(404, 'Departure not found.');

  const res = store.resources();
  const exists = (list, rid) => !rid || list.some((r) => r.id === rid);
  if (!exists(res.guides, guideId) || !exists(res.drivers, driverId) || !exists(res.vehicles, vehicleId)) {
    throw new HttpError(400, 'Unknown guide, driver or vehicle.');
  }

  const assignment = { guideId, driverId, vehicleId };
  const conflicts = conflictsFor(id, assignment);
  if (conflicts.length) {
    const c = conflicts[0];
    throw new HttpError(409, `Conflict: ${c.resourceId} is already assigned to ${c.departureId.replaceAll('~', ' ')}.`);
  }
  const guests = store.bookingsOnDeparture(slug, date, time).reduce((s, b) => s + b.adults + b.children, 0);
  const vehicle = res.vehicles.find((v) => v.id === vehicleId);
  if (vehicle && vehicle.seats < guests) throw new HttpError(409, `${vehicle.name} has ${vehicle.seats} seats but ${guests} guests are booked.`);

  return store.setAssignment(id, assignment);
}
