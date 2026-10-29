// =============================================================================
// VOUCHER SERVICE
// Builds the e-voucher (booking reference, QR code, meeting point, what to
// bring, price breakdown) and sends the instant confirmation by email + SMS
// right after payment succeeds.
//
// The QR code encodes a check-in link. Guides scan it with their phone camera
// on the day; it opens the admin check-in screen for that booking.
// =============================================================================
import QRCode from 'qrcode';
import { config } from '../config.js';
import { store } from '../data/store.js';
import { sendEmail, sendSms, emailLayout, escapeHtml } from './notifications.js';
import { POLICY } from './policy.js';

// Same colours as the logo, so the QR fits the brand on the voucher.
const QR_OPTIONS = { margin: 1, width: 320, color: { dark: '#151A24', light: '#FFFFFF' } };

const checkinUrl = (ref) => `${config.siteUrl}/admin?checkin=${ref}`;
export const voucherUrl = (b) => `${config.siteUrl}/bookings?ref=${b.reference}&email=${encodeURIComponent(b.email)}`;

// Formats money for emails (the website formats its own amounts in the browser).
const money = (amount, currency) => new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);

// Everything the voucher screen needs, in one object (GET /api/bookings/:ref/voucher).
export async function buildVoucher(booking) {
  const tour = store.getTour(booking.slug);
  return {
    booking,
    tour: tour && {
      name: tour.name, slug: tour.slug, durationLabel: tour.durationLabel,
      meetingPoint: tour.meetingPoint, whatToBring: tour.whatToBring, image: tour.images[0],
    },
    qr: await QRCode.toDataURL(checkinUrl(booking.reference), QR_OPTIONS),
    // Preparation instructions shown on every voucher.
    prepTips: [
      'Arrive at the meeting point 15 minutes before departure.',
      'Show this QR code (on your phone or printed) to your guide.',
      `Free cancellation up to ${POLICY.refundTiers[0].hoursBefore} hours before departure.`,
    ],
  };
}

// Instant confirmation: email with QR attachment + short SMS.
export async function sendConfirmation(booking) {
  const tour = store.getTour(booking.slug);
  const qrPng = await QRCode.toBuffer(checkinUrl(booking.reference), QR_OPTIONS);
  const mp = tour.meetingPoint;
  const rows = booking.price.lines.map((l) => `<tr><td style="padding:4px 0">${escapeHtml(l.label)}</td><td align="right">${money(l.amount, booking.currency)}</td></tr>`).join('');

  const html = emailLayout(`You're booked, ${booking.name.split(' ')[0]}!`, `
    <p style="font-size:15px;line-height:1.6">Your booking for <b>${escapeHtml(tour.name)}</b> is confirmed.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#F4F5F9;border-radius:12px;padding:16px;margin:16px 0">
      <tr><td style="padding:16px">
        <div style="font-size:12px;color:#6B7385">BOOKING REFERENCE</div>
        <div style="font-size:26px;font-weight:bold;letter-spacing:2px;color:#C2185B">${booking.reference}</div>
        <div style="margin-top:12px">📅 ${booking.date} at ${booking.time} (local time)</div>
        <div>👥 ${booking.adults} adult(s)${booking.children ? `, ${booking.children} child(ren)` : ''}${booking.isPrivate ? ' · Private tour' : ''}</div>
        <div>📍 ${escapeHtml(mp.name)} — <a href="https://www.google.com/maps?q=${mp.lat},${mp.lng}">open map</a></div>
        <div style="color:#6B7385;font-size:13px">${escapeHtml(mp.note)}</div>
      </td></tr>
    </table>
    <table role="presentation" width="100%" style="font-size:14px">${rows}
      <tr><td style="padding-top:8px;border-top:1px solid #E3E6EE"><b>Total paid</b></td><td align="right" style="padding-top:8px;border-top:1px solid #E3E6EE"><b>${money(booking.total, booking.currency)}</b></td></tr>
    </table>
    <h3 style="margin:24px 0 8px;font-size:16px">What to bring</h3>
    <ul style="padding-left:20px;line-height:1.6">${tour.whatToBring.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
    <p style="line-height:1.6">Your QR code is attached. Show it to your guide at check-in.</p>
    <p><a href="${voucherUrl(booking)}" style="display:inline-block;background:#C2185B;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">View e-voucher</a></p>
  `);

  await sendEmail({ to: booking.email, subject: `Confirmed: ${tour.name} on ${booking.date} (${booking.reference})`, html, attachments: [{ filename: `${booking.reference}.png`, content: qrPng }], kind: 'confirmation' });
  await sendSms({ to: booking.phone, email: booking.email, kind: 'confirmation', body: `Pulse Trips: ${tour.name} confirmed for ${booking.date} ${booking.time}. Ref ${booking.reference}. Meet at ${mp.name}. Voucher: ${voucherUrl(booking)}` });
}

// Cancellation notice with refund amount.
export async function sendCancellation(booking) {
  const html = emailLayout('Your booking was cancelled', `
    <p style="line-height:1.6">Booking <b>${booking.reference}</b> for ${escapeHtml(booking.tourName)} on ${booking.date} has been cancelled.</p>
    <p style="line-height:1.6">${booking.cancelReason === 'weather'
      ? 'We cancelled this departure for weather or safety reasons. You will receive a <b>full refund</b>, or reply to this email to move to another date for free.'
      : `Refund: <b>${money(booking.refund.amount, booking.currency)}</b> (${booking.refund.percent}% under our cancellation policy).`}</p>
    <p style="line-height:1.6;color:#6B7385">Refunds usually arrive in 5–10 business days for cards and 1–3 days for mobile money.</p>`);
  await sendEmail({ to: booking.email, subject: `Cancelled: ${booking.reference}`, html, kind: 'cancellation' });
  await sendSms({ to: booking.phone, email: booking.email, kind: 'cancellation', body: `Pulse Trips: booking ${booking.reference} cancelled. Refund ${money(booking.refund.amount, booking.currency)}.` });
}

// Date-change notice.
export async function sendReschedule(booking) {
  const html = emailLayout('Your new date is confirmed', `
    <p style="line-height:1.6">Booking <b>${booking.reference}</b> (${escapeHtml(booking.tourName)}) now departs on <b>${booking.date} at ${booking.time}</b>.</p>
    <p><a href="${voucherUrl(booking)}" style="color:#C2185B">View your updated e-voucher</a></p>`);
  await sendEmail({ to: booking.email, subject: `Rescheduled: ${booking.reference} → ${booking.date}`, html, kind: 'reschedule' });
}
