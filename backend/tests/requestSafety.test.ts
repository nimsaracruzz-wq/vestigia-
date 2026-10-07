import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import type { AddressInfo } from 'node:net';
import { requestSafety, safeErrorHandler, validateRequestShape, createRateLimiter, classifyError, PublicError } from '../utils/requestSafety.js';
import { customerClaims } from '../utils/customerClaims.js';

test('customer JWTs reject admin identity, invalid identifiers, expired tokens, and other algorithms', () => {
  const secret = 'test-only-secret-with-at-least-32-characters';
  assert.deepEqual(customerClaims(jwt.sign({ id: 7 }, secret), secret), { id: 7 });
  assert.equal(customerClaims(jwt.sign({ id: 7, role: 'admin' }, secret), secret), null);
  assert.equal(customerClaims(jwt.sign({ id: '7' }, secret), secret), null);
  assert.equal(customerClaims(jwt.sign({ id: 7 }, secret, { expiresIn: -1 }), secret), null);
  assert.equal(customerClaims(jwt.sign({ id: 7 }, secret, { algorithm: 'HS384' }), secret), null);
});

test('classifies operational errors without leaking exception text', () => {
  assert.equal(classifyError({ code: 'P2002', message: 'secret@example.com' }).status, 409);
  assert.equal(classifyError({ code: 'P2024' }).status, 503);
  assert.equal(classifyError({ code: 'LIMIT_FILE_SIZE' }).status, 413);
  assert.equal(classifyError(new Error('database password=secret')).message.includes('secret'), false);
});

test('real HTTP requests receive safe JSON, unique references, and shared rate-limit budgets', async () => {
  const app = express();
  app.use(requestSafety);
  app.use(express.json({ limit: '1kb' }));
  app.use(validateRequestShape);
  app.post('/api/body', (_req, res) => { res.json({ ok: true }); });
  app.get('/api/crash', () => { throw new Error('database password=secret'); });
  app.get('/api/handled', (_req, res) => { res.status(500).json({ error: 'private SQL details' }); });
  app.get('/api/origin', () => { throw new PublicError(403, 'ORIGIN_DENIED', 'This request origin is not allowed.'); });
  app.use('/api/limited', createRateLimiter({ max: 2, windowMs: 60000, keyPrefix: 'test' }));
  app.get('/api/limited/:id', (_req, res) => { res.json({ ok: true }); });
  app.use(safeErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const malformed = await fetch(base + '/api/body', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
    assert.equal(malformed.status, 400);
    const body = await malformed.json();
    assert.equal(body.code, 'INVALID_JSON');
    assert.equal(body.requestId, malformed.headers.get('X-Request-ID'));
    const large = await fetch(base + '/api/body', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(2000) }) });
    assert.equal(large.status, 413);
    const poisoned = await fetch(base + '/api/body', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"__proto__":{"admin":true}}' });
    assert.equal(poisoned.status, 400);
    assert.equal((await poisoned.json()).code, 'INVALID_REQUEST_STRUCTURE');
    const nested = await fetch(base + '/api/body', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '['.repeat(20) + '0' + ']'.repeat(20) });
    assert.equal(nested.status, 400);
    for (const path of ['/api/crash', '/api/handled']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 500);
      const raw = await response.text();
      assert.ok(!raw.includes('password') && !raw.includes('SQL') && !raw.includes('secret'));
      assert.notEqual(JSON.parse(raw).requestId, body.requestId);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
    }
    assert.equal((await fetch(base + '/api/origin')).status, 403);
    assert.equal((await fetch(base + '/api/limited/a', { headers: { 'X-Forwarded-For': '1.1.1.1' } })).status, 200);
    assert.equal((await fetch(base + '/api/limited/b', { headers: { 'X-Forwarded-For': '2.2.2.2' } })).status, 200);
    const blocked = await fetch(base + '/api/limited/c', { headers: { 'X-Forwarded-For': '3.3.3.3' } });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('Retry-After')) > 0);
    assert.equal((await blocked.json()).code, 'RATE_LIMITED');
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
