import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkoutQuoteSignature } from '../src/utils/checkoutQuote.ts';

const payload = { currency: 'JPY', market: 'JP', priceListId: 'JP_RETAIL', email: 'customer@example.com', shippingCountry: 'Japan', shippingCountryCode: 'JP', shippingMethodId: 1, items: [{ productId: 1, quantity: 1, size: 'M', color: 'black', unitPriceMinor: 7999, priceVersion: 1 }] };
test('accepting authoritative price snapshots does not invalidate the payment quote', () => {
  assert.equal(checkoutQuoteSignature(payload), checkoutQuoteSignature({ ...payload, items: [{ ...payload.items[0], unitPriceMinor: 8499, priceVersion: 2, currency: 'JPY', priceListId: 'JP_RETAIL' }] }));
});
test('purchase changes invalidate the payment quote', () => {
  for (const change of [{ currency: 'EUR', market: 'EU', priceListId: 'EU_RETAIL' }, { email: 'another@example.com' }, { shippingCountryCode: 'FR' }, { shippingMethodId: 2 }, { promoCode: 'SAVE' }, { items: [{ ...payload.items[0], quantity: 2 }] }, { items: [{ ...payload.items[0], size: 'L' }] }]) {
    assert.notEqual(checkoutQuoteSignature(payload), checkoutQuoteSignature({ ...payload, ...change }));
  }
});
