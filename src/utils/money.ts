import { formatMoney, requireCurrency, toMinor, type Currency } from '../../shared/money';
export * from '../../shared/money';
export function moneyLabel(amountMinor: number, currency: Currency) {
  try { return `${formatMoney(amountMinor, currency)} ${currency}`; } catch { return 'Price requires review'; }
}
// Adapter for deprecated major-unit API fields. Currency is always mandatory.
export function formatMajor(amount: number, currency: Currency) {
  try { return (amount < 0 ? "−" : "") + moneyLabel(toMinor(String(Math.abs(amount)), requireCurrency(currency)), currency); } catch { return 'Price requires review'; }
}
export function salesByCurrency(orders: { currency: Currency; totalMinor: number; paymentStatus?: string }[]) {
  const sums: Partial<Record<Currency, number>> = {};
  for (const o of orders) if (['PAID','PARTIALLY_REFUNDED'].includes(o.paymentStatus || '') && Number.isSafeInteger(o.totalMinor)) sums[o.currency] = (sums[o.currency] || 0) + o.totalMinor;
  return Object.entries(sums).map(([c,n]) => moneyLabel(n!, c as Currency)).join(' · ') || 'No verified sales';
}
