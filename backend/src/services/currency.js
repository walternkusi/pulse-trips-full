// =============================================================================
// CURRENCY SERVICE
// All prices are stored in USD (the base currency). This file converts them
// into the visitor's chosen currency for display and for checkout.
//
// TODO (production): refresh `rates` daily from an FX API (e.g. openexchangerates.org,
// exchangerate.host) and cache them, instead of using these static sample values.
// =============================================================================

// 1 USD = X units of each currency (sample rates, update regularly).
const rates = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  RWF: 1380,  // Rwandan franc
  KES: 129,   // Kenyan shilling
  TZS: 2600,  // Tanzanian shilling
  UGX: 3700,  // Ugandan shilling
  ZAR: 18.2,  // South African rand
  NGN: 1550,  // Nigerian naira
};

// Currencies with no minor unit (no cents). Amounts are rounded to whole units.
// Stripe also treats RWF and UGX as zero-decimal, so payments.js reuses this list.
export const ZERO_DECIMAL = ['RWF', 'UGX'];

export const SUPPORTED_CURRENCIES = Object.keys(rates);
export const BASE_CURRENCY = 'USD';

export const isSupportedCurrency = (c) => SUPPORTED_CURRENCIES.includes(c);

// Round to what a customer would actually pay: whole units for big-number
// currencies (no one pays 1,234.57 shillings), cents for USD/EUR/GBP/ZAR.
function roundFor(currency, amount) {
  if (ZERO_DECIMAL.includes(currency) || rates[currency] >= 100) return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

// Converts a USD amount into `currency`.
export function fromUsd(amountUsd, currency = BASE_CURRENCY) {
  const rate = rates[currency] ?? 1;
  return roundFor(currency, amountUsd * rate);
}

// Exposed to the frontend so it can format catalogue prices without a round-trip per card.
export const listRates = () => ({ base: BASE_CURRENCY, rates, updatedAt: 'static-sample' });
