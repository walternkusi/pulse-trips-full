// =============================================================================
// EXPRESS APP
// Builds the app (middleware + routes) without starting a server, which also
// makes it easy to test with supertest or similar.
// =============================================================================
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { tourRoutes } from './routes/tours.js';
import { bookingRoutes } from './routes/bookings.js';
import { paymentRoutes } from './routes/payments.js';
import { miscRoutes } from './routes/misc.js';
import { adminRoutes } from './routes/admin.js';
import { errorHandler } from './middleware/errors.js';
import { UPLOADS_DIR } from './data/catalog.js';

export const app = express();

// Behind a proxy/load balancer (Render, Railway, nginx) so req.ip is the real visitor IP.
app.set('trust proxy', 1);
app.disable('x-powered-by'); // don't advertise the framework

// --- Security headers (a lightweight version of the `helmet` package) --------
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  });
  next();
});

// Only our website may call the API from a browser.
app.use(cors({ origin: config.frontendOrigin }));

// --- Body parsing --------------------------------------------------------------
// 1. Payment webhooks need the RAW body to verify the provider's signature.
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
// 2. Reviews may include up to 3 small photos, so they get a bigger limit.
app.use('/api/reviews', express.json({ limit: '2mb' }));
// 3. Admin photo uploads (resized in the browser, still up to a few MB).
app.use('/api/admin/uploads', express.json({ limit: '9mb' }));
// 4. Everything else: small JSON bodies only.
app.use(express.json({ limit: '100kb' }));

// --- Routes ----------------------------------------------------------------------
// Uploaded tour photos. File names are random and never change, so browsers may cache them for a long time.
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', immutable: true, index: false, dotfiles: 'deny' }));

app.get('/health', (req, res) => res.json({ ok: true })); // for hosting health checks
app.use('/api', tourRoutes, bookingRoutes, paymentRoutes, miscRoutes, adminRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found.' })); // unknown URL
app.use(errorHandler);                                                 // must be LAST
