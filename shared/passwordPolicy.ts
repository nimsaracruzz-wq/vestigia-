export const validatePassword = (value: unknown, minimum = 10) => {
  const password = String(value ?? '');
  if (password.length < minimum || password.length > 128) {
    throw new Error(`Password must be between ${minimum} and 128 characters.`);
  }
  const normalized = password.toLowerCase().replace(/\s+/g, '');
  const blocked = new Set([
    'password1234',
    'password12345',
    'password123456',
    '123456789012',
    'qwertyuiop12',
    'letmeinplease',
    'vestigia1234',
  ]);
  if (blocked.has(normalized)) {
    throw new Error('Please choose a less common password.');
  }
  return password;
};
