import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localeCurrency, visitorCurrency } from '../../shared/visitorCurrency.js';
import { selectHomepageProducts } from '../../shared/homepageProducts.js';
import { initialHomepage } from '../../shared/homepage.js';
import { formatMoney } from '../../shared/money.js';

test('Japan uses JPY, Europe uses EUR, and other countries use USD', () => {
  assert.equal(visitorCurrency('JP'), 'JPY');
  for (const code of ['IT', 'FR', 'DE', 'GB', 'CH', 'SE', 'NO', 'PL', 'UA', 'VA', 'XK']) {
    assert.equal(visitorCurrency(code), 'EUR', code);
  }
  for (const code of ['US', 'CA', 'BR', 'LK', 'AU', 'IN', 'SG', 'AE', 'CN', '', null, undefined]) {
    assert.equal(visitorCurrency(code), 'USD', String(code));
  }
  assert.equal(visitorCurrency(' jp '), 'JPY');
});

test('locale fallback reads the region correctly and defaults safely', () => {
  for (const [locale, currency] of [['ja-JP', 'JPY'], ['en-JP', 'JPY'], ['it-IT', 'EUR'], ['en-GB', 'EUR'], ['de-CH', 'EUR'], ['en-US', 'USD'], ['en-AU', 'USD'], ['si-LK', 'USD'], ['en', 'USD'], ['invalid_locale', 'USD']]) {
    assert.equal(localeCurrency(locale), currency, locale);
  }
});

test('homepage selection and formatting use the same regional price without conversion', () => {
  const config = initialHomepage([1]);
  const section = config.sections.find(section => section.type === 'product_carousel');
  assert.ok(section && section.type === 'product_carousel');
  const product = { id: 1, category: 'Clothing', prices: {
    JPY: { priceMinor: 12000 }, EUR: { priceMinor: 6500 }, USD: { priceMinor: 7900 },
  } };
  for (const country of ['JP', 'IT', 'US', 'LK']) {
    const currency = visitorCurrency(country);
    const products: (typeof product)[] = selectHomepageProducts([product], { ...section.settings, source: 'manual', productIds: [1] }, currency, []);
    assert.equal(products.length, 1);
    const price = products[0].prices[currency as keyof typeof product.prices];
    assert.ok(price);
    assert.equal(formatMoney(price.priceMinor, currency), { JPY: '¥12,000', EUR: '€65.00', USD: '$79.00' }[currency as 'JPY' | 'EUR' | 'USD']);
  }
  assert.equal(selectHomepageProducts([{ ...product, prices: {} }], section.settings, 'USD', []).length, 0);
});
