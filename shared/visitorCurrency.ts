import type { Currency } from './money.js';

// Storefront pricing regions, including European microstates and transcontinental countries.
const EUROPE = new Set([
  'AD', 'AL', 'AM', 'AT', 'AX', 'AZ', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY',
  'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FO', 'FR', 'GB', 'GE', 'GG', 'GI',
  'GR', 'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI', 'LT', 'LU', 'LV',
  'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU',
  'SE', 'SI', 'SJ', 'SK', 'SM', 'TR', 'UA', 'VA', 'XK',
]);

export function visitorCurrency(country: unknown): Currency {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : '';
  return code === 'JP' ? 'JPY' : EUROPE.has(code) ? 'EUR' : 'USD';
}

/** A best effort initial display while IP lookup runs; never infer country from substring matches. */
export function localeCurrency(locale: string): Currency {
  try {
    return visitorCurrency(new Intl.Locale(locale).maximize().region);
  } catch {
    return 'USD';
  }
}
