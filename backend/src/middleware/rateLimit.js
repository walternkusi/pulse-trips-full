// =============================================================================
// RATE LIMITING
// Stops bots from spamming forms or hammering the booking endpoint.
// Simple fixed-window counter per IP, kept in memory.
// For several servers, use a shared store (Redis) or your CDN's rate limiting.
// =============================================================================
import { HttpError } from './errors.js';

// rateLimit({ windowMs: 600000, max: 5 }) -> at most 5 requests per IP per 10 minutes.
export function rateLimit({ windowMs, max, message = 'Too many requests. Please wait a few minutes and try again.' }) {
  const hits = new Map(); // ip -> { count, resetAt }

  // Clean up old entries so memory doesn't grow forever.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.resetAt <= now) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const h = hits.get(req.ip);
    if (!h || h.resetAt <= now) {
      hits.set(req.ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    h.count += 1;
    if (h.count > max) {
      res.set('Retry-After', String(Math.ceil((h.resetAt - now) / 1000)));
      return next(new HttpError(429, message));
    }
    next();
  };
}
