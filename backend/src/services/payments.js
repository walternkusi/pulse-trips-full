// =============================================================================
// PAYMENT SERVICE
// Supports three ways to pay. Each one switches from DEMO to LIVE automatically
// as soon as its API key is present in .env:
//
//   method        provider      covers
//   ----------    -----------   -----------------------------------------------
//   'card'        Stripe        Visa, Mastercard, Amex + Apple Pay & Google Pay
//   'wallet'      Stripe        (same hosted Checkout page, wallets shown first)
//   'mobile_money' MoMo QR      MTN MoMo pay code (MOMO_PAY_CODE), confirmed by staff
//                  Flutterwave  M-Pesa, MTN MoMo, Airtel Money (when MOMO_PAY_CODE is empty), local cards
//
// 🔒 Card numbers never touch our server: guests pay on the provider's hosted,
//    PCI-compliant page, and the provider tells us the result through a signed
//    webhook (see routes/payments.js). Only then is a booking marked confirmed.
//
// We call the providers' REST APIs with fetch, so no SDK packages are needed.
// =============================================================================
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config, isDemoPayments } from '../config.js';
import { ZERO_DECIMAL, fromUsd } from './currency.js';
import { HttpError } from '../middleware/errors.js';

export const PAYMENT_METHODS = ['card', 'wallet', 'mobile_money'];

// Stripe and Flutterwave expect amounts in the smallest unit (cents) except
// for zero-decimal currencies such as RWF and UGX.
const toMinorUnits = (amount, currency) => (ZERO_DECIMAL.includes(currency) ? Math.round(amount) : Math.round(amount * 100));

// Turns { a: { b: 1 } } into "a[b]=1" form encoding, which Stripe's API requires.
function formEncode(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && typeof v === 'object') formEncode(v, key, out);
    else if (v !== undefined) out.append(key, String(v));
  }
  return out;
}

// Small wrapper: calls a provider API, throws a friendly 502 if it fails.
async function callProvider(url, init, providerName) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[payments] ${providerName} error`, res.status, data);
    throw new HttpError(502, `${providerName} is unavailable right now. Please try again or choose another payment method.`);
  }
  return data;
}

// -----------------------------------------------------------------------------
// START A PAYMENT
// Returns { provider, status, redirectUrl?, id? }
//   status 'succeeded'       -> demo mode, booking can be confirmed immediately
//   status 'requires_action' -> send the browser to redirectUrl to pay
// -----------------------------------------------------------------------------
export async function createPayment(booking, method) {
  const { reference, currency, total, email } = booking;
  const successUrl = `${config.siteUrl}/bookings?ref=${reference}&email=${encodeURIComponent(email)}&paid=1`;

  // --- MTN MoMo pay code: guest scans our QR and pays in Rwandan francs ----------
  // Nothing tells us when they pay, so the booking stays pending until staff confirm it.
  if (method === 'mobile_money' && config.momoPayCode) {
    return {
      provider: 'momo_qr', status: 'awaiting_proof', id: `momo_${reference}`,
      momo: { payCode: config.momoPayCode, amountRwf: fromUsd(booking.totalUsd, 'RWF') },
    };
  }

  // --- Mobile money via Flutterwave -------------------------------------------
  if (method === 'mobile_money' && config.flutterwaveSecretKey) {
    const data = await callProvider('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.flutterwaveSecretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: reference,
        amount: total,
        currency,
        redirect_url: successUrl,
        customer: { email, name: booking.name, phonenumber: booking.phone || undefined },
        customizations: { title: 'Pulse Trips', description: booking.tourName },
        // Shows the right wallet for the guest's country on Flutterwave's page.
        payment_options: 'mpesa,mobilemoneyrwanda,mobilemoneyuganda,mobilemoneytanzania,mobilemoneyghana,mobilemoneyfranco,card',
      }),
    }, 'Flutterwave');
    return { provider: 'flutterwave', status: 'requires_action', redirectUrl: data.data.link, id: reference };
  }

  // --- Cards, Apple Pay, Google Pay via Stripe Checkout ------------------------
  if (method !== 'mobile_money' && config.stripeSecretKey) {
    const body = formEncode({
      mode: 'payment',
      client_reference_id: reference,
      customer_email: email,
      success_url: successUrl,
      cancel_url: `${config.siteUrl}/tours/${booking.slug}?payment=cancelled`,
      // Stripe's minimum session lifetime is 30 minutes; our seat hold lasts slightly longer.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      line_items: { 0: {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toMinorUnits(total, currency),
          product_data: { name: booking.tourName, description: `${booking.date} ${booking.time} · ${booking.adults + booking.children} guest(s) · Ref ${reference}` },
        },
      } },
      metadata: { reference },
      payment_intent_data: { metadata: { reference } },
    });
    const session = await callProvider('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.stripeSecretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }, 'Stripe');
    return { provider: 'stripe', status: 'requires_action', redirectUrl: session.url, id: session.id };
  }

  // A live provider is configured but not for this method: never "pay" for free.
  if (!isDemoPayments) throw new HttpError(400, 'This payment method is not available right now. Please choose another one.');

  // --- Demo mode -----------------------------------------------------------------
  // No keys configured: pretend the payment succeeded so the whole flow is testable.
  return { provider: 'demo', status: 'succeeded', id: `demo_${reference}` };
}

// -----------------------------------------------------------------------------
// REFUNDS
// `amount` is in the booking's currency. Returns { status, amount }.
// -----------------------------------------------------------------------------
export async function refundPayment(booking, amount) {
  if (amount <= 0) return { status: 'none', amount: 0 };
  const p = booking.payment || {};

  if (p.provider === 'stripe' && p.intentId && config.stripeSecretKey) {
    await callProvider('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.stripeSecretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formEncode({ payment_intent: p.intentId, amount: toMinorUnits(amount, booking.currency), metadata: { reference: booking.reference } }),
    }, 'Stripe');
    return { status: 'requested', amount };
  }

  if (p.provider === 'flutterwave' && p.transactionId && config.flutterwaveSecretKey) {
    await callProvider(`https://api.flutterwave.com/v3/transactions/${p.transactionId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.flutterwaveSecretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }, 'Flutterwave');
    return { status: 'requested', amount };
  }

  // Demo bookings (or unpaid holds): nothing to send back to a provider.
  return { status: p.provider === 'demo' ? 'simulated' : 'manual', amount };
}

// -----------------------------------------------------------------------------
// WEBHOOK VERIFICATION
// Providers sign their webhooks so attackers can't fake "payment succeeded".
// -----------------------------------------------------------------------------

// Stripe: header "t=TIMESTAMP,v1=SIGNATURE". Signature = HMAC-SHA256(secret, `${t}.${rawBody}`).
export function verifyStripeSignature(rawBody, header) {
  if (!config.stripeWebhookSecret || !header) return false;
  const parts = Object.fromEntries(String(header).split(',').map((kv) => kv.split('=')));
  const signatures = String(header).split(',').filter((kv) => kv.startsWith('v1=')).map((kv) => kv.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false; // reject replays older than 5 min
  const expected = createHmac('sha256', config.stripeWebhookSecret).update(`${t}.${rawBody}`).digest('hex');
  return signatures.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

// Flutterwave: header "verif-hash" must equal the secret hash set in your dashboard.
export function verifyFlutterwaveHash(header) {
  if (!config.flutterwaveWebhookHash || !header) return false;
  const a = Buffer.from(String(header));
  const b = Buffer.from(config.flutterwaveWebhookHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Flutterwave recommends re-fetching the transaction instead of trusting the webhook body.
export async function verifyFlutterwaveTransaction(id) {
  const data = await callProvider(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(id)}/verify`, {
    headers: { Authorization: `Bearer ${config.flutterwaveSecretKey}` },
  }, 'Flutterwave');
  return data.data; // { status, tx_ref, amount, currency, id }
}
