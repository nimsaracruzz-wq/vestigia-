import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripeConfiguration } from '../utils/stripeConfiguration.js';

test('standard and restricted test/live server keys are supported', () => {
  for (const prefix of ['sk_test_', 'rk_test_', 'sk_live_', 'rk_live_']) {
    const config = stripeConfiguration({ STRIPE_SECRET_KEY: prefix + 'fixtureOnlyNotARealKey', NODE_ENV: 'production' });
    assert.equal(config.valid, true);
    assert.equal(config.mode, prefix.includes('live') ? 'live' : 'test');
    assert.equal(config.issue, null);
  }
});

test('live keys disable mock-payment acceptance even when the flag is mistakenly enabled', () => {
  for (const NODE_ENV of ['development', 'production']) {
    for (const key of ['sk_live_fixtureOnly', 'rk_live_fixtureOnly']) {
      assert.equal(stripeConfiguration({ STRIPE_SECRET_KEY: key, NODE_ENV, ALLOW_MOCK_PAYMENTS: 'true' }).allowMockPayments, false);
    }
  }
  assert.equal(stripeConfiguration({ STRIPE_SECRET_KEY: 'sk_test_fixtureOnly', NODE_ENV: 'production', ALLOW_MOCK_PAYMENTS: 'true' }).allowMockPayments, true);
  assert.equal(stripeConfiguration({ NODE_ENV: 'production' }).allowMockPayments, false);
});

test('publishable keys and placeholders are rejected without echoing credentials', () => {
  for (const key of ['pk_live_privateFixture', 'rk_live_...', 'sk_test_1234567890', 'invalidKey']) {
    const config = stripeConfiguration({ STRIPE_SECRET_KEY: key, NODE_ENV: 'production' });
    assert.equal(config.valid, false);
    assert.ok(config.issue);
    assert.equal(config.issue.includes(key), false);
  }
  assert.equal(stripeConfiguration({ STRIPE_SECRET_KEY: ' "rk_live_fixtureOnly" ' }).valid, true);
});
