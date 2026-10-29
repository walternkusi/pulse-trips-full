# Pulse Trips Backend (Express API)

    npm install
    cp .env.example .env
    npm run dev        # http://localhost:4000/health

## Endpoints (all under /api)
| Method | Path | Purpose |
|---|---|---|
| GET | /tours, /tours/:slug | Tour list (filters: category, country) and detail (+ add-ons, reviews) |
| GET | /availability?slug&date | Departure slots with live seats left |
| GET | /availability/calendar?slug&month | Month view for the calendar |
| GET | /availability/stream?slug | Server-Sent Events: real-time seat changes |
| POST | /quote | Itemised server-side price |
| POST | /bookings | Hold seats + start payment (returns redirectUrl in live mode) |
| GET | /bookings/lookup, /bookings/:ref/voucher | Guest lookup / e-voucher with QR (needs email) |
| POST | /bookings/:ref/cancel, /bookings/:ref/reschedule | Manage booking (policy-checked) |
| POST | /payments/stripe/webhook, /payments/flutterwave/webhook | Signed payment confirmations |
| GET/POST | /reviews | Verified reviews (with photos) |
| POST | /contact, /newsletter, /events | Messages & chat, lead capture, analytics |
| GET | /currencies, /policies, /payments/config | Reference data |
| * | /admin/* | Overview, bookings, check-in, CRM, roster (Bearer ADMIN_TOKEN) |

## Layout
- `routes/` thin HTTP handlers · `services/` business rules · `data/store.js` the only data access file · `data/tours.js` catalogue · `middleware/` validation, auth, rate limits, errors
