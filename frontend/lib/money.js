// =============================================================================
// MONEY FORMATTING (multi-currency)
// Works on the server and in the browser. Catalogue prices are stored in USD;
// `rates` comes from the backend (GET /api/currencies).
// =============================================================================

// Locale used to format numbers for each UI language.
const LOCALES = { en: 'en-GB', fr: 'fr-FR', sw: 'sw-KE' };

// Formats an amount that is ALREADY in `currency` (e.g. a server quote).
export function formatAmount(amount, currency = 'USD', lang = 'en') {
  const whole = Math.abs(amount % 1) < 0.005;
  try {
    return new Intl.NumberFormat(LOCALES[lang] || 'en-GB', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`; // very old browsers
  }
}

// Converts a USD catalogue price into `currency` and formats it.
// Big-unit currencies (KES, TZS, RWF...) are rounded to whole units for display.
export function formatUsd(amountUsd, currency, rates, lang) {
  const rate = rates?.[currency] ?? 1;
  const value = amountUsd * rate;
  const rounded = rate >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return formatAmount(rounded, rates?.[currency] ? currency : 'USD', lang);
}
