/** Lightweight local guidance, independent of server-side password validation. */
export function passwordStrength(password: string, personalValues: string[] = []) {
  if (!password) return { score: 0, label: 'Password strength', hint: 'Use 12–128 characters. A long, unique passphrase works well.' };
  const normalized = password.toLowerCase().replace(/\s+/g, '');
  const predictable = /password|qwerty|letmein|vestigia|123456|abcdef|admin/.test(normalized) || /(.)(?:\1){3,}/.test(normalized) || /^(.{1,4})\1+$/.test(normalized);
  const personal = personalValues.some(value => {
    const token = value.toLowerCase().replace(/\s+/g, '');
    return token.length >= 3 && normalized.includes(token);
  });
  let score = password.length >= 20 ? 4 : password.length >= 16 ? 3 : password.length >= 12 ? 2 : 1;
  if (password.length > 128 || predictable) score = 1;
  if (personal) score = Math.min(score, 2);
  if (/^[a-z]+$/i.test(password) && password.length < 20) score = Math.min(score, 2);
  const labels = ['Password strength', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const hint = password.length > 128 ? 'Keep your password within 128 characters.' : password.length < 12 ? 'Add more characters—at least 12 are required.' : predictable ? 'Avoid common passwords, repeated characters, and sequences.' : personal ? 'Avoid using your name or email in your password.' : score < 3 ? 'Try a longer phrase with unrelated words.' : 'Keep this password unique to your VESTIGIA account.';
  return { score, label: labels[score], hint };
}
