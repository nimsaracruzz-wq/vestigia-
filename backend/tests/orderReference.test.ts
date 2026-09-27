import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomOrderReference } from '../utils/orderReference.js';

test('new order references use random IDs and check stored orders', async () => {
  const seen = new Set<string>();
  const db = { order: { findUnique: async ({ where }: { where: { id: string } }) => seen.has(where.id) ? { id: where.id } : null } };
  for (let i = 0; i < 100; i++) {
    const id = await randomOrderReference(db);
    assert.match(id, /^VST-[0-9A-F]{16}$/);
    assert.ok(!seen.has(id));
    seen.add(id);
  }
});
test('retries a reference already in use', async () => {
  const candidates: string[] = [];
  const db = { order: { findUnique: async ({ where }: { where: { id: string } }) => {
    candidates.push(where.id);
    return candidates.length === 1 ? { id: where.id } : null;
  } } };
  const id = await randomOrderReference(db);
  assert.equal(candidates.length, 2);
  assert.equal(id, candidates[1]);
  assert.notEqual(id, candidates[0]);
});
test('bounds collision retries instead of looping indefinitely', async () => {
  let calls = 0;
  await assert.rejects(randomOrderReference({ order: { findUnique: async () => { calls++; return { id: 'existing' }; } } }), /unique order reference/);
  assert.equal(calls, 5);
});
