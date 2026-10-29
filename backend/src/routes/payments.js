// =============================================================================
// PAYMENT ROUTES
// Webhooks are how Stripe / Flutterwave tell us a payment really succeeded.
// They are the ONLY way a live booking becomes 'confirmed' (never the browser).
//
// Set these webhook URLs in the provider dashboards:
//   Stripe:      https://YOUR-API/api/payments/stripe/webhook
//                events: checkout.session.completed, checkout.session.async_payment_succeeded,
//                        checkout.session.expired
//   Flutterwave: https://YOUR-API/api/payments/flutterwave/webhook
// =============================================================================
import { Router } from 'express';
import { store } from '../data/store.js';
import { confirmBooking } from '../services/bookings.js';
import { publishAvailability } from '../services/realtime.js';
import { verifyStripeSignature, verifyFlutterwaveHash, verifyFlutterwaveTransaction } from '../services/payments.js';
import { config, isDemoPayments } from '../config.js';
import { wrap } from '../middleware/errors.js';

export const paymentRoutes = Router();

// GET /api/payments/config -> tells the checkout which mode we're in.
paymentRoutes.get('/payments/config', (req, res) => {
  res.json({ demo: isDemoPayments, methods: ['card', 'wallet', 'mobile_money'], momoQr: Boolean(config.momoPayCode) });
});

// POST /api/payments/stripe/webhook  (raw body: needed to check the signature)
paymentRoutes.post('/payments/stripe/webhook', wrap(async (req, res) => {
  const raw = req.body instanceof Buffer ? req.body.toString('utf8') : '';
  if (!verifyStripeSignature(raw, req.get('stripe-signature'))) return res.status(400).send('Bad signature');

  const event = JSON.parse(raw);
  const session = event.data?.object || {};
  const booking = store.getBooking(session.client_reference_id || session.metadata?.reference);

  if (booking) {
    const paid = (event.type === 'checkout.session.completed' && session.payment_status === 'paid')
      || event.type === 'checkout.session.async_payment_succeeded';
    if (paid) await confirmBooking(booking, { intentId: session.payment_intent });

    // Guest closed the payment page and the session timed out: release seats now.
    if (event.type === 'checkout.session.expired' && booking.status === 'pending') {
      booking.status = 'expired';
      store.saveBooking(booking);
      publishAvailability(booking.slug, booking.date, booking.time);
    }
  }
  res.json({ received: true }); // always 200 for valid signatures so Stripe stops retrying
}));

// POST /api/payments/flutterwave/webhook
paymentRoutes.post('/payments/flutterwave/webhook', wrap(async (req, res) => {
  if (!verifyFlutterwaveHash(req.get('verif-hash'))) return res.status(401).send('Bad hash');
  const data = req.body?.data || {};

  if (req.body?.event === 'charge.completed' && data.status === 'successful') {
    // Re-check with Flutterwave and make sure amount + currency match what we charged.
    const tx = await verifyFlutterwaveTransaction(data.id);
    const booking = store.getBooking(tx.tx_ref);
    if (booking && tx.status === 'successful' && tx.currency === booking.currency && Number(tx.amount) >= booking.total) {
      await confirmBooking(booking, { transactionId: tx.id });
    }
  }
  res.json({ received: true });
}));
