import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/authValidation.ts', import.meta.url), 'utf8');
const directory = new URL('../scratch/auth-validation/', import.meta.url);
await mkdir(directory, { recursive: true });
const moduleUrl = new URL('validation.mjs', directory);
await writeFile(moduleUrl, ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText);
const { validateAuthFields } = await import(moduleUrl.href);
const valid = { email: ' person@example.com ', firstName: 'Ada', lastName: 'Lovelace', country: 'Japan', password: 'A secure phrase!', confirmPassword: 'A secure phrase!', phone: '' };
assert.deepEqual(validateAuthFields('register', valid), {});
assert.deepEqual(validateAuthFields('login', { email: valid.email, password: 'legacy' }), {});
assert.deepEqual(validateAuthFields('forgot', { email: valid.email }), {});
for (const email of ['', 'invalid', 'name@', 'name @example.com', 'a'.repeat(245) + '@example.com']) {
  assert.ok(validateAuthFields('forgot', { email })['forgot-email']);
}
for (const length of [12, 128]) {
  const password = 'a'.repeat(length);
  assert.deepEqual(validateAuthFields('register', { ...valid, password, confirmPassword: password }), {});
}
for (const length of [0, 11, 129]) {
  assert.ok(validateAuthFields('register', { ...valid, password: 'a'.repeat(length) })['reg-pass']);
}
assert.ok(validateAuthFields('login', { email: valid.email, password: '' })['login-pass']);
assert.ok(validateAuthFields('login', { email: valid.email, password: 'a'.repeat(129) })['login-pass']);
assert.ok(validateAuthFields('register', { ...valid, confirmPassword: 'different' })['reg-pass-conf']);
assert.ok(validateAuthFields('register', { ...valid, confirmPassword: '' })['reg-pass-conf']);
for (const [field, id] of [['firstName', 'reg-first-name'], ['lastName', 'reg-last-name'], ['country', 'reg-country']]) {
  assert.ok(validateAuthFields('register', { ...valid, [field]: '' })[id]);
}
for (const phone of ['+81 90 1234 5678', '+1 (212) 555-1234']) {
  assert.deepEqual(validateAuthFields('register', { ...valid, phone }), {});
}
for (const phone of ['+81 abcdefghi', '+81 12', '+81 1234567890123456']) {
  assert.ok(validateAuthFields('register', { ...valid, phone })['reg-phone']);
}
const preserved = structuredClone(valid);
validateAuthFields('register', valid);
assert.deepEqual(valid, preserved);
console.log('Auth validation checks passed: email, required fields, legacy login, password boundaries, confirmation, optional phone, and input preservation.');
