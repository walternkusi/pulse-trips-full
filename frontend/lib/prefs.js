// =============================================================================
// VISITOR PREFERENCES (server side)
// Reads the language & currency the visitor chose (cookies set by the toggle)
// or, on a first visit, what middleware.js detected from their browser/country.
// Used by server components so pages render in the right language from the
// first byte: good for users AND for search engines.
// =============================================================================
// NOTE: server components only (uses next/headers); never import this in a 'use client' file.
import { cookies, headers } from 'next/headers';
import { isLang, DEFAULT_LANG, CURRENCIES, DEFAULT_CURRENCY, getDictionary, makeT } from './i18n';
import { api } from './api';

export async function getPrefs() {
  const c = await cookies();
  const h = await headers();
  const lang = [c.get('lang')?.value, h.get('x-pt-lang')].find(isLang) || DEFAULT_LANG;
  const currency = [c.get('currency')?.value, h.get('x-pt-currency')].find((x) => CURRENCIES.includes(x)) || DEFAULT_CURRENCY;
  return { lang, currency };
}

// Everything a server component needs to render text and prices.
export async function getServerContext() {
  const { lang, currency } = await getPrefs();
  // If the API is down we still render the page, just in USD.
  const { rates } = await api.getCurrencies().catch(() => ({ rates: { USD: 1 } }));
  const dict = getDictionary(lang);
  return { lang, currency, rates, dict, t: makeT(dict) };
}
