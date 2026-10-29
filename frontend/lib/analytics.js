// =============================================================================
// ANALYTICS HELPERS (browser only)
// track('begin_checkout', { slug, value, currency }) sends the event to:
//   1. Google Analytics 4 (if NEXT_PUBLIC_GA_ID is set AND the visitor consented)
//   2. Our own backend (anonymous funnel for the admin dashboard)
// Event names follow GA4's recommended e-commerce events so GA reports
// (checkout funnel, conversions, top items) work out of the box.
// =============================================================================
import { api } from './api';

const CONSENT_KEY = 'pt_consent'; // 'granted' | 'denied'

// Safe storage access: private browsing modes can throw on localStorage.
const read = (store, key) => { try { return window[store].getItem(key); } catch { return null; } };
const write = (store, key, value) => { try { window[store].setItem(key, value); } catch { /* ignore */ } };

export const getConsent = () => read('localStorage', CONSENT_KEY);
export function setConsent(value) {
  write('localStorage', CONSENT_KEY, value);
  // Google Consent Mode v2: tells GA whether it may use cookies.
  window.gtag?.('consent', 'update', { analytics_storage: value, ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
}

// Random id per browser tab: lets us count funnel steps without identifying anyone.
function sessionId() {
  let id = read('sessionStorage', 'pt_sid');
  if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); write('sessionStorage', 'pt_sid', id); }
  return id;
}

// Where did this visit come from? utm_source wins, then the referring site, else "direct".
// Remembered for the whole tab session so later events keep the original source.
function trafficSource() {
  let src = read('sessionStorage', 'pt_src');
  if (!src) {
    const utm = new URLSearchParams(window.location.search).get('utm_source');
    let ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* ignore */ }
    src = utm || (ref && ref !== window.location.hostname ? ref.replace(/^www\./, '') : 'direct');
    write('sessionStorage', 'pt_src', src);
  }
  return src;
}

export function track(name, params = {}) {
  if (typeof window === 'undefined') return;
  // 1. GA4 (gtag queues events until consent is granted, then honours Consent Mode).
  window.gtag?.('event', name, params);
  // 2. First-party anonymous funnel. Failures are ignored: analytics must never break the site.
  api.track({ name, sessionId: sessionId(), slug: params.slug, source: trafficSource() }).catch(() => {});
}
