import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Mail} from 'lucide-react';
import {useUser} from '../../context/UserContext';
import './email-verification.css';

export default function EmailVerificationNotice() {
  const {user, isAuthenticated, sendVerificationCode, refreshProfile} = useUser();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (!isAuthenticated || user?.emailVerified !== false) return null;
  const resend = async () => {
    setBusy(true); setMessage(''); setError('');
    try {
      const profile = await refreshProfile();
      if (profile?.emailVerified) return;
      const result = await sendVerificationCode();
      if (result.success) setMessage('Check your inbox and spam folder for a new verification link.');
      else setError(result.error || 'Could not request a verification email. Please try again.');
    } catch { setError('Could not check your account. Please try again.'); }
    finally { setBusy(false); }
  };
  return <aside className="email-verification-notice" aria-label="Email verification">
    <Mail size={20} aria-hidden="true" />
    <div><strong>Your email is not verified yet</strong>
      <p>You can use your account. Please verify <span>{user.email}</span> to confirm this is your email address.</p>
      <div className="email-verification-actions"><button type="button" onClick={resend} disabled={busy}>{busy ? 'Please wait...' : 'Resend verification email'}</button><Link to="/account?tab=profile">Correct email address</Link></div>
      {message && <p role="status">{message}</p>}{error && <p className="email-verification-error" role="alert">{error}</p>}
    </div>
  </aside>;
}
