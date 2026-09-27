import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProductPrices } from '../utils/productPrices.js';
import { syncPrices } from '../utils/pricing.js';

test('multipart photo edits preserve unchanged market prices without price writes', async () => {
  const prices = { EUR: { priceMinor: 5000, compareAtMinor: null, isActive: true, mode: 'FIXED' } };
  const db = {
    priceList: { findUnique: async () => ({ id: 'eur' }) },
    productPrice: { findUnique: async () => ({ ...prices.EUR, priceListId: 'eur' }) },
  };
  const parsed = parseProductPrices(JSON.stringify(prices));
  assert.deepEqual(parsed, prices);
  await syncPrices(db, 1, parsed, 'test', '');
});
test('price parser supports JSON requests and omitted fields, rejecting malformed multipart data', () => {
  assert.deepEqual(parseProductPrices({}), {});
  assert.equal(parseProductPrices(undefined), undefined);
  for (const value of ['{', 'null', '[]', '123', null, []]) assert.throws(() => parseProductPrices(value));
});
