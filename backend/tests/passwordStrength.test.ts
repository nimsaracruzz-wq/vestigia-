import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passwordStrength } from '../../shared/passwordStrength.js';

test('empty and short passwords do not receive strong ratings', () => {
  assert.equal(passwordStrength('').score, 0);
  assert.equal(passwordStrength('Xy7!pq9').score, 1);
});
test('common passwords and repeated patterns remain weak regardless of length', () => {
  for (const value of ['Password123456!!!!!!!!!', 'aaaaaaaaaaaaaaaaaaaa', 'Ab1!Ab1!Ab1!Ab1!Ab1!']) assert.equal(passwordStrength(value).score, 1);
});
test('names and email fragments reduce an otherwise strong rating', () => {
  assert.equal(passwordStrength('Jasmine-Orbit-79-Copper', ['Jasmine']).score, 2);
});
test('long unrelated passphrases can be strong without mandatory symbols', () => {
  assert.equal(passwordStrength('marble lantern ocean fig').score, 4);
  assert.equal(passwordStrength('Z7!cM9@vL2#tR8$q').score, 3);
});
test('oversized passwords show the actual backend length constraint', () => {
  assert.equal(passwordStrength('x'.repeat(129)).score, 1);
  assert.match(passwordStrength('x'.repeat(129)).hint, /128/);
});
