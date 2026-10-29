// =============================================================================
// MIDDLEWARE: automatic language & currency detection
// Runs before every page request. On a visitor's FIRST visit (no cookies yet)
// it guesses:
//   language <- the browser's Accept-Language header
//   currency <- the visitor's country (header added by Vercel / Cloudflare),
//               or the region in Accept-Language (e.g. "sw-KE" -> KES)
// It passes the guess to the page through request headers and saves it in
// cookies. Visitors can always override it with the toggle in the header.
// =============================================================================
import { NextResponse } from 'next/server';

const LANGS = ['en', 'fr', 'sw'];
const YEAR = 60 * 60 * 24 * 365;

// Country code -> currency.
const COUNTRY_CURRENCY = {
  KE: 'KES', TZ: 'TZS', RW: 'RWF', UG: 'UGX', ZA: 'ZAR', NG: 'NGN', GB: 'GBP',
  FR: 'EUR', DE: 'EUR', BE: 'EUR', NL: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR',
  IE: 'EUR', AT: 'EUR', FI: 'EUR', LU: 'EUR', GR: 'EUR',
};

function detectLang(acceptLanguage = '') {
  // "fr-RW,fr;q=0.9,en;q=0.8" -> ['fr', 'fr', 'en'] in order of preference.
  const prefs = acceptLanguage.split(',').map((p) => p.trim().split(';')[0].slice(0, 2).toLowerCase());
  return prefs.find((p) => LANGS.includes(p)) || 'en';
}

function detectCurrency(req) {
  const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry')
    || (req.headers.get('accept-language') || '').match(/^[a-z]{2}-([A-Z]{2})/)?.[1];
  return COUNTRY_CURRENCY[country] || 'USD';
}

export function middleware(req) {
  const hasLang = req.cookies.has('lang');
  const hasCurrency = req.cookies.has('currency');
  if (hasLang && hasCurrency) return NextResponse.next();

  const lang = hasLang ? req.cookies.get('lang').value : detectLang(req.headers.get('accept-language') || '');
  const currency = hasCurrency ? req.cookies.get('currency').value : detectCurrency(req);

  // Pass the guess to server components for THIS request (cookies only apply from the next one).
  const headers = new Headers(req.headers);
  headers.set('x-pt-lang', lang);
  headers.set('x-pt-currency', currency);
  const res = NextResponse.next({ request: { headers } });
  if (!hasLang) res.cookies.set('lang', lang, { path: '/', maxAge: YEAR, sameSite: 'lax' });
  if (!hasCurrency) res.cookies.set('currency', currency, { path: '/', maxAge: YEAR, sameSite: 'lax' });
  return res;
}

// Skip static files, images and Next internals.
export const config = { matcher: ['/((?!_next/|favicon|icon|apple-icon|logo|.*\\.[a-z0-9]+$).*)'] };
