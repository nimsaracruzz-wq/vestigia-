import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderAmountMinor, orderLineSubtotalMinor } from '../../shared/orderAmounts.js';
import { formatMoney } from '../../shared/money.js';

test('historical prices use the original snapshot despite changed catalog and legacy prices', () => {
  const item = { unitPriceMinor: 6500, price: 999, quantity: 2, subtotalMinor: 13000, prices: { JPY: { priceMinor: 10000 } } };
  assert.equal(orderAmountMinor(item, 'unitPrice', 'EUR'), 6500);
  assert.equal(orderLineSubtotalMinor(item, 'EUR'), 13000);
  assert.match(formatMoney(orderAmountMinor(item, 'unitPrice', 'EUR'), 'EUR'), /65\.00/);
  assert.equal(orderAmountMinor({totalMinor:0,total:20},'total','EUR'),0);
});

test('legacy orders respect JPY and two-decimal currencies and line quantities', () => {
  assert.equal(orderAmountMinor({price:7999},'unitPrice','JPY'),7999);
  assert.equal(orderAmountMinor({price:79.99},'unitPrice','EUR'),7999);
  assert.equal(orderLineSubtotalMinor({unitPriceMinor:7999,quantity:3},'JPY'),23997);
});

test('missing and invalid records require review rather than fabricating prices', () => {
  assert.ok(Number.isNaN(orderAmountMinor({},'unitPrice','EUR')));
  assert.ok(Number.isNaN(orderAmountMinor({price:20},'unitPrice',undefined)));
  assert.ok(Number.isNaN(orderAmountMinor({unitPriceMinor:-1,price:20},'unitPrice','EUR')));
  assert.ok(Number.isNaN(orderLineSubtotalMinor({unitPriceMinor:100,quantity:1.5},'EUR')));
});
