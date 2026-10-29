// =============================================================================
// ADMIN AUTHENTICATION
// The admin API (CRM, roster, analytics) requires the header
//   Authorization: Bearer <ADMIN_TOKEN>
// The token is compared in constant time so it can't be guessed byte by byte.
//
// 🔐 For a team, replace this with real staff accounts (e.g. Auth0, Clerk or
//    your own users table with hashed passwords and roles).
// =============================================================================
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from './errors.js';

export function requireAdmin(req, res, next) {
  if (!config.adminToken) return next(new HttpError(503, 'Admin is disabled. Set ADMIN_TOKEN in backend/.env.'));
  const given = Buffer.from(String(req.get('authorization') || '').replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(config.adminToken);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return next(new HttpError(401, 'Invalid admin token.'));
  }
  next();
}
