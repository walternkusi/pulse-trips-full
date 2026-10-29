// =============================================================================
// CONFIGURATION
// Central place for every setting read from environment variables.
// The rest of the code never touches process.env directly, so you can see at a
// glance which knobs exist and what their defaults are.
// =============================================================================
export const config = {
  // --- Server -----------------------------------------------------------------
  port: Number(process.env.PORT) || 4000,
  // Website origin allowed to call this API from a browser (CORS).
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  // Public URL of the website: used in emails, QR codes and payment redirects.
  siteUrl: process.env.SITE_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:3000',

  // Public URL of THIS API: used to build links to uploaded photos (/uploads/...).
  apiPublicUrl: (process.env.API_PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 4000}`).replace(/\/$/, ''),

  // --- Real photo search for the tour editor ----------------------------------
  // Free key from https://unsplash.com/developers (Access Key). Empty = search disabled,
  // admins can still upload their own photos or paste image links.
  unsplashKey: process.env.UNSPLASH_ACCESS_KEY || '',

  // --- Admin dashboard (CRM, roster, analytics) -------------------------------
  // Long random string. If empty, the admin API is disabled entirely.
  adminToken: process.env.ADMIN_TOKEN || '',

  // --- Database ---------------------------------------------------------------
  // MongoDB Atlas connection string (mongodb+srv://...). Empty = in-memory demo mode.
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDb: process.env.MONGODB_DB || 'pulse_trips',

  // --- Payments ---------------------------------------------------------------
  // Stripe: cards, Apple Pay, Google Pay, multi-currency. Empty = demo mode.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  // MTN MoMo "scan to pay" code. Guests scan our QR, pay the trip price, then send us the
  // MoMo transaction ID; staff confirm it in /admin. Empty = this option is off.
  momoPayCode: process.env.MOMO_PAY_CODE || '',
  // How long a MoMo booking holds its seats while the guest pays (minutes).
  momoHoldMinutes: Number(process.env.MOMO_HOLD_MINUTES) || 120,
  // Flutterwave: African mobile money (M-Pesa, MTN MoMo, Airtel Money). Empty = demo mode.
  flutterwaveSecretKey: process.env.FLW_SECRET_KEY || '',
  flutterwaveWebhookHash: process.env.FLW_WEBHOOK_HASH || '',

  // --- Notifications ----------------------------------------------------------
  // Resend (https://resend.com) for transactional email. Empty = log to console.
  emailApiKey: process.env.EMAIL_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Pulse Trips <bookings@example.com>',
  // Inbox that receives contact-form messages.
  teamEmail: process.env.TEAM_EMAIL || '',
  // Africa's Talking for SMS (https://africastalking.com). Username "sandbox" sends nothing real.
  // Empty key = log to console (or use Twilio below).
  atUsername: process.env.AT_USERNAME || 'sandbox',
  atApiKey: process.env.AT_API_KEY || '',
  atSenderId: process.env.AT_SENDER_ID || '',
  // Twilio for SMS (fallback). Empty = log to console.
  twilioSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFrom: process.env.TWILIO_FROM || '',

  // --- Booking rules ----------------------------------------------------------
  // Minutes an unpaid booking holds its seats before they are released again.
  holdMinutes: Number(process.env.HOLD_MINUTES) || 30,
};

// Demo mode = no real payment provider configured. The UI shows a notice so
// nobody mistakes a test booking for a real charge.
export const isDemoPayments = !config.stripeSecretKey && !config.flutterwaveSecretKey;
