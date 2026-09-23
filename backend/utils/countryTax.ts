import { minor, requireCurrency, roundedRatio, type Currency } from '../../shared/money.js';

/** A null rate explicitly falls back to the market rate; zero means tax-free. */
export function normalizeCountryTaxRate(input: unknown): number | null {
  if (input === null || input === '') return null;
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0 || input > 10000) throw new Error('Country tax must be between 0 and 100%, with up to two decimal places');
  return input;
}
export function calculateCountryTax(countryRateBps: number | null | undefined, netMinor: number, currency: Currency, marketRateBps: number) {
  minor(netMinor);
  requireCurrency(currency);
  const taxRateBps = normalizeCountryTaxRate(countryRateBps ?? marketRateBps)!;
  return { taxMinor: roundedRatio(netMinor, BigInt(taxRateBps), 10000n), taxRateBps };
}
