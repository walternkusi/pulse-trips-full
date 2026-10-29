// =============================================================================
// CANCELLATION, RESCHEDULING & REFUND POLICY
// ONE source of truth: the policies page renders this object (GET /api/policies)
// and the booking service uses the same numbers to compute refunds. The words
// customers read and the money they get back can never drift apart.
//
// ✏️  Change the numbers here and both the website text and the logic update.
// =============================================================================

export const POLICY = {
  // Refund tiers, checked top to bottom: first tier whose `hoursBefore` is met wins.
  refundTiers: [
    { hoursBefore: 48, percent: 100, label: '48 hours or more before departure' },
    { hoursBefore: 24, percent: 50, label: '24 to 48 hours before departure' },
    { hoursBefore: 0, percent: 0, label: 'Less than 24 hours before departure, or no-show' },
  ],
  reschedule: {
    freeChanges: 1,          // number of free date changes per booking
    minHoursBefore: 24,      // must be requested at least this long before departure
  },
  weather: {
    // If WE cancel for weather or safety, the guest always chooses between these.
    options: ['Full 100% refund', 'Free move to any other available date'],
    noticeHours: 12,         // we decide and notify at least this long before departure when possible
  },
  refundTimeline: [
    { method: 'Card, Apple Pay, Google Pay', days: '5–10 business days' },
    { method: 'Mobile money (M-Pesa, MTN MoMo, Airtel)', days: '1–3 business days' },
  ],
  contactNote: 'Questions about a refund? Reply to your confirmation email or message us on WhatsApp.',
};

// Hours between now and departure (negative once the trip has started).
export const hoursUntil = (startMs, now = Date.now()) => (startMs - now) / 3600000;

// Percentage refundable if the GUEST cancels `hours` before departure.
export function refundPercent(hours) {
  const tier = POLICY.refundTiers.find((t) => hours >= t.hoursBefore);
  return tier ? tier.percent : 0;
}

// Can the guest still move their booking to another date for free?
export function canReschedule(booking, hours) {
  return (booking.rescheduleCount || 0) < POLICY.reschedule.freeChanges && hours >= POLICY.reschedule.minHoursBefore;
}
