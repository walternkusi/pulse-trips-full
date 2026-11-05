// =============================================================================
// MOCK DATA (the ONLY place sample data lives)
// The backend has no endpoints yet for announcements or for payout history, so those two
// admin screens use these samples. Everything else in the admin reads real data.
// Announcements are kept in this browser's localStorage so you can try the screen.
// =============================================================================
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString();

export const MOCK_ANNOUNCEMENTS = [
  { id: 'a1', title: 'Great Migration season is open', body: 'River-crossing departures on the Serengeti safari are now on sale for July to October. Seats are limited to 6 per vehicle.', status: 'published', date: day(-6) },
  { id: 'a2', title: 'Pay with the MTN MoMo QR code', body: 'Guests in Rwanda can now scan our pay code and send the transaction ID. Staff confirm payments in the Bookings page.', status: 'published', date: day(-2) },
  { id: 'a3', title: 'Extra Kilimanjaro departures in December', body: 'Two more Machame-route departures added for the holiday period. Announce to the newsletter once the guides are assigned.', status: 'scheduled', date: day(5) },
  { id: 'a4', title: 'Public holiday opening hours', body: 'WhatsApp and live chat will reply from 9:00 to 15:00 on public holidays. Draft until the dates are confirmed.', status: 'draft', date: day(-1) },
  { id: 'a5', title: 'Welcome code reminder', body: 'WELCOME10 gives 10% off the first trip. Retired after the summer campaign.', status: 'archived', date: day(-40) },
];

// Sample Stripe payout history (no payout endpoint exists yet).
export const MOCK_PAYOUTS = [
  { id: 'po_1', date: day(-3), amountUsd: 842.5, status: 'paid' },
  { id: 'po_2', date: day(-10), amountUsd: 1260, status: 'paid' },
  { id: 'po_3', date: day(-17), amountUsd: 410.75, status: 'paid' },
  { id: 'po_4', date: day(2), amountUsd: 530, status: 'in transit' },
];
