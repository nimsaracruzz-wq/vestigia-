import { minor, requireCurrency, toMinor } from './money.js';

/** Historical amounts come from the order snapshot, never today's catalog. */
export function orderAmountMinor(record: Record<string, unknown>, field: string, currency: unknown): number {
  try {
    const code = requireCurrency(currency);
    const saved = record[`${field}Minor`];
    if (saved !== undefined && saved !== null) return minor(saved as number);
    const legacy = record[field === 'unitPrice' ? 'price' : field];
    if (typeof legacy !== 'number' || !Number.isFinite(legacy)) return NaN;
    return toMinor(legacy, code);
  } catch { return NaN; }
}

export function orderLineSubtotalMinor(item: Record<string, unknown>, currency: unknown): number {
  if (item.subtotalMinor !== undefined && item.subtotalMinor !== null) return orderAmountMinor(item, 'subtotal', currency);
  if (!Number.isSafeInteger(item.quantity) || Number(item.quantity) < 1) return NaN;
  try { return minor(orderAmountMinor(item, 'unitPrice', currency) * Number(item.quantity)); }
  catch { return NaN; }
}
