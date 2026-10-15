import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePassword } from '../../shared/passwordPolicy.js';
import { validateAuthFields } from '../../src/utils/authValidation.js';
import { passwordStrength } from '../../shared/passwordStrength.js';

test('customer registration and server accept ten characters, reject nine and over 128', () => {
  for (const length of [9, 10, 128, 129]) {
    const password = 'Z'.repeat(length);
    const errors = validateAuthFields('register', { email: 'test@example.com', firstName: 'Test', lastName: 'User', country: 'LK', password, confirmPassword: password });
    if (length >= 10 && length <= 128) {
      assert.equal(validatePassword(password), password);
      assert.equal(errors['reg-pass'], undefined);
    } else {
      assert.throws(() => validatePassword(password), /10 and 128/);
      assert.match(errors['reg-pass'], /10 and 128/);
    }
  }
});

test('admin minimum and legacy customer login remain unchanged', () => {
  assert.throws(() => validatePassword('Orbit!729x', 12), /12 and 128/);
  assert.equal(validateAuthFields('login', { email: 'test@example.com', password: 'short' })['login-pass'], undefined);
  assert.throws(() => validatePassword('password1234'), /less common/);
});

test('strength guidance matches the ten-character minimum', () => {
  assert.match(passwordStrength('').hint, /10/);
  assert.match(passwordStrength('Orbit!729').hint, /at least 10/);
  assert.doesNotMatch(passwordStrength('Orbit!729x').hint, /required/);
});
