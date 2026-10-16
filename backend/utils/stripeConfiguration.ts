export function stripeConfiguration(env: NodeJS.ProcessEnv) {
  const secretKey = String(env.STRIPE_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
  const match = /^(?:sk|rk)_(test|live)_[A-Za-z0-9_]+$/.exec(secretKey);
  const valid = Boolean(match) && !secretKey.includes('1234567890') && !secretKey.endsWith('...');
  const mode = valid ? match![1] as 'test' | 'live' : null;
  const issue = secretKey && !valid
    ? secretKey.startsWith('pk_')
      ? 'STRIPE_SECRET_KEY must be a server-side secret or restricted key. Put the publishable key in VITE_STRIPE_PUBLISHABLE_KEY.'
      : 'STRIPE_SECRET_KEY must contain your complete sk_test_, rk_test_, sk_live_, or rk_live_ key, without placeholders.'
    : null;
  const allowMockPayments = mode !== 'live' && (env.ALLOW_MOCK_PAYMENTS === 'true' || (env.NODE_ENV !== 'production' && !valid));
  return { secretKey, valid, mode, issue, allowMockPayments };
}
