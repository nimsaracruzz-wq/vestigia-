export const SUPPORTED_CURRENCIES = ['JPY', 'EUR', 'USD', 'GBP'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];
export const MARKETS = {
  JP: { name: 'Japan', currency: 'JPY', priceListId: 'JP_RETAIL' },
  EU: { name: 'European Union', currency: 'EUR', priceListId: 'EU_RETAIL' },
  US: { name: 'United States', currency: 'USD', priceListId: 'US_RETAIL' },
  UK: { name: 'United Kingdom', currency: 'GBP', priceListId: 'UK_RETAIL' },
} as const;
export type Market = keyof typeof MARKETS;
export type Money = { amountMinor: number; currency: Currency };
export function requireCurrency(value: unknown): Currency {
  if (!SUPPORTED_CURRENCIES.includes(value as Currency)) throw new Error('Unsupported currency');
  return value as Currency;
}
export function exponent(currency: Currency) { requireCurrency(currency); return currency === 'JPY' ? 0 : 2; }
export function minor(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Money must be a nonnegative safe integer in minor units');
  return value;
}
// Round nonnegative rational values half up. Never multiply monetary values using floats.
export function roundedRatio(amount: number, numerator: bigint, denominator: bigint): number {
  minor(amount);
  if (numerator < 0n || denominator <= 0n) throw new Error('Invalid ratio');
  return minor(Number((BigInt(amount) * numerator * 2n + denominator) / (denominator * 2n)));
}
export function decimalRatio(value: string): [bigint, bigint] {
  if (!/^\d+(\.\d{1,12})?$/.test(value)) throw new Error('Invalid decimal');
  const [whole, fraction = ''] = value.split('.');
  return [BigInt(whole + fraction), 10n ** BigInt(fraction.length)];
}
export function toMinor(value: string | number, currency: Currency): number {
  const [n, d] = decimalRatio(String(value));
  const scaled = n * 10n ** BigInt(exponent(currency));
  if (scaled % d !== 0n) throw new Error(`Too many decimal places for ${currency}`);
  return minor(Number(scaled / d));
}
export function toMajor(amount: number, currency: Currency): number { return minor(amount) / 10 ** exponent(currency); }
export function formatMoney(amount: number, currency: Currency, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: exponent(currency), maximumFractionDigits: exponent(currency) }).format(toMajor(amount, currency));
}
export function marketForCurrency(currency: Currency): Market {
  requireCurrency(currency);
  return ({ JPY: 'JP', EUR: 'EU', USD: 'US', GBP: 'UK' } as const)[currency];
}
export function resolveMarket(market: unknown, currency: unknown, priceListId?: unknown) {
  const code = requireCurrency(currency);
  if (typeof market !== 'string' || !(market in MARKETS)) throw new Error('A supported market is required');
  const config = MARKETS[market as Market];
  if (config.currency !== code || (priceListId !== undefined && priceListId !== config.priceListId)) throw new Error('Market, currency and price list do not match');
  return { market: market as Market, currency: code, priceListId: config.priceListId };
}
export function allocate(amount: number, weights: number[]): number[] {
  minor(amount); weights.forEach(minor);
  const total = weights.reduce((s, w) => s + BigInt(w), 0n);
  if (!total) { if (amount) throw new Error('Cannot allocate amount to empty lines'); return weights.map(() => 0); }
  const rows = weights.map((w, i) => ({ i, value: Number(BigInt(amount) * BigInt(w) / total), remainder: BigInt(amount) * BigInt(w) % total }));
  let remaining = amount - rows.reduce((s, r) => s + r.value, 0);
  [...rows].sort((a, b) => a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1).forEach(r => { if (remaining > 0) { r.value++; remaining--; } });
  return rows.map(r => r.value);
}
