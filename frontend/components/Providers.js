'use client'; // context + cookies + router: browser-side
// =============================================================================
// PREFERENCES PROVIDER
// Makes language, currency, exchange rates and the translate function
// available to every client component through usePrefs().
//
// Changing language/currency writes a cookie and calls router.refresh(), so the
// server re-renders the page in the new language without a full reload.
// =============================================================================
import { createContext, useContext, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { makeT } from '@/lib/i18n';
import { formatUsd, formatAmount } from '@/lib/money';

const PrefsContext = createContext(null);
const YEAR = 60 * 60 * 24 * 365;

export function PrefsProvider({ lang, currency, rates, dict, children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const value = useMemo(() => {
    // Saves a preference cookie and re-renders server components.
    const save = (name, v) => {
      document.cookie = `${name}=${v}; path=/; max-age=${YEAR}; samesite=lax`;
      startTransition(() => router.refresh());
    };
    return {
      lang, currency, rates, isPending,
      t: makeT(dict),
      setLang: (l) => save('lang', l),
      setCurrency: (c) => save('currency', c),
      // Price helpers bound to the current currency & language.
      priceUsd: (usd) => formatUsd(usd, currency, rates, lang),
      money: (amount, cur = currency) => formatAmount(amount, cur, lang),
    };
  }, [lang, currency, rates, dict, isPending, router]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return ctx;
}
