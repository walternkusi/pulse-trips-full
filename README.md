<<<<<<< HEAD
# Pulse Trips

**Africa · Events · Travel · Vibes**: tour & event booking website.

- `backend/`  Express API: tours, live availability, bookings, payments, vouchers, reviews, CRM, roster, analytics
- `frontend/` Next.js website (server-rendered, mobile-first, EN/FR/SW, 9 currencies)

## Run locally (two terminals)

    cd backend  && npm install && cp .env.example .env && npm run dev        # http://localhost:4000
    cd frontend && npm install && cp .env.example .env.local && npm run dev  # http://localhost:3000

Everything works in **demo mode** with no API keys: payments confirm instantly
(no money taken), emails/SMS are printed to the backend console.
Team dashboard: http://localhost:3000/admin (token = `ADMIN_TOKEN` in `backend/.env`).

## Where each feature lives

| Requirement | Backend | Frontend |
|---|---|---|
| Real-time booking engine & availability calendar | `services/availability.js`, `services/realtime.js` (SSE), `services/bookings.js` (seat holds) | `components/AvailabilityCalendar.js`, `components/BookingPanel.js` |
| Secure multi-currency payments (cards, Apple/Google Pay, M-Pesa/MoMo) | `services/payments.js`, `routes/payments.js` (signed webhooks), `services/currency.js` | payment step in `BookingPanel.js` |
| Instant confirmation & QR vouchers (email + SMS) | `services/voucher.js`, `services/notifications.js` | `app/bookings/page.js` |
| Tiered / seasonal / private pricing, add-ons, promo codes | `services/pricing.js`, `data/tours.js` | live quote in `BookingPanel.js` |
| Detailed itinerary pages | `data/tours.js` | `app/tours/[slug]/page.js` |
| Photos, video preview, interactive route map | `data/tours.js` (`images`, `video`, `stops`) | `components/TourMedia.js` |
| Verified reviews with photos | `routes/misc.js` | `app/reviews/page.js`, `components/ReviewForm.js` |
| Cancellation & refund policy (one source of truth) | `services/policy.js` | `app/policies/page.js` |
| Mobile-first design | | `app/globals.css`, `components/TourClientBits.js` (sticky book bar) |
| Multilingual & multi-currency toggle (auto-detected) | `services/currency.js` | `lib/i18n.js`, `middleware.js`, `components/PrefsToggle.js` |
| Lead capture & promotions | `routes/misc.js` (`/newsletter`) | `components/PromoPopup.js`, `components/NewsletterForm.js`, `app/travel-guide` |
| Live chat & WhatsApp | `routes/misc.js` (`/contact`) | `components/ChatWidget.js` |
| CRM | `services/crm.js` | `/admin` → Guests |
| Guide / driver / vehicle roster | `services/roster.js`, `data/tours.js` (`resources`) | `/admin` → Roster, Check-in |
| SEO | | `app/sitemap.js`, `app/robots.js`, JSON-LD in layout/tour/FAQ pages |
| Analytics (GA4 + checkout funnel) | `services/analytics.js` | `components/Analytics.js`, `lib/analytics.js`, `/admin` → Overview |

## Before going live

1. Set `MONGODB_URI` (MongoDB Atlas) in `backend/.env` so bookings survive restarts. Run only one copy of the API. Tour photos uploaded in the admin still live on the server disk (`backend/storage/uploads`).
2. Set real prices, photos and copy in `backend/src/data/tours.js`.
3. Add Stripe / Flutterwave keys and register the webhook URLs (see `routes/payments.js`).
4. Add Resend (email) and Africa's Talking or Twilio (SMS) keys; set `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_WHATSAPP`.
5. Replace the static exchange rates in `services/currency.js` with a live FX feed.
=======

>>>>>>> 9121b27435726ebf0a00b9c9d37479c61815d26c
