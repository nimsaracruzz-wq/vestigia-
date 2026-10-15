import {useEffect, useState} from 'react';
import {useUser} from '../../context/UserContext';
import './email-verification.css';

export default function AccountEmailSettings() {
  const {user, updateEmail} = useUser();
  const [email, setEmail] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { setEmail(user?.email || ''); }, [user?.email]);
  if (!user) return null;
  const locked = user.emailVerified || Boolean(user.emailVerifiedAt);
  if (locked) return <section className="account-email-correction"><h3>Verified email</h3><p>Your email address is verified and cannot be changed from your account.</p></section>;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await updateEmail(email.trim());
      if (result.success) setMessage(result.message || 'Email updated. Check your new inbox for a verification link.');
      else setError(result.error || 'Your email address could not be updated.');
    } catch { setError('Your email address could not be updated. Please try again.'); }
    finally { setBusy(false); }
  };
  return <section className="account-email-correction">
    <h3>Correct your email address</h3>
    <p>You can change your email until it is verified. Updating it cancels old verification links and sends a new link to the corrected address. Once verified, your email is locked.</p>
    <form onSubmit={submit}>
      <label htmlFor="account-correct-email">New email address<input id="account-correct-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} required /></label>
      <button type="submit" className="save-profile-btn" disabled={busy || email.trim().toLowerCase() === user.email.toLowerCase()}>{busy ? 'Updating...' : 'Update email and verify'}</button>
    </form>
    {error && <p role="alert" className="email-verification-error">{error}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
