import {useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {CheckCircle, Mail} from 'lucide-react';
import {useUser} from '../context/UserContext';
import {API_BASE_URL} from '../config/api';
import {apiErrorMessage} from '../utils/apiError';
import {SEOHead} from '../components/common/SEOHead';
import '../components/common/email-verification.css';

export default function VerifyEmail({emailChange = false}: {emailChange?: boolean}) {
  const [params, setParams] = useSearchParams();
  const {verifyEmailCode, logout} = useUser();
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const token = params.get('token') || '';
  const verify = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (emailChange) {
        const response = await fetch(`${API_BASE_URL}/customers/confirm-email-change`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token})});
        const data = await response.json();
        if (!response.ok) throw new Error(apiErrorMessage(response.status, data));
        logout();
      } else {
        const result = await verifyEmailCode(token);
        if (!result.success) throw new Error(result.error);
      }
      setVerified(true);
      setParams({}, {replace: true});
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not verify your email. Please try again.'); }
    finally { setBusy(false); }
  };
  return <section className="email-verification-page">
    <SEOHead title="Verify your email | VESTIGIA" description="Confirm the email address for your Vestigia account." noIndex />
    {verified ? <CheckCircle size={36} aria-hidden="true" /> : <Mail size={36} aria-hidden="true" />}
    <h1>{verified ? 'Email verified' : 'Verify your email'}</h1>
    <p>{verified ? 'Your email address is confirmed and is now locked to your account.' : 'Confirm your email address to finish setting up your Vestigia account.'}</p>
    {!verified && !token && <p role="alert">This link is incomplete. Sign in to your account to request a new verification email.</p>}
    {error && <p role="alert" className="email-verification-error">{error}</p>}
    {!verified && token && <button type="button" onClick={verify} disabled={busy}>{busy ? 'Verifying...' : 'Verify email address'}</button>}
    <Link to="/account">{verified ? 'Continue to your account' : 'Back to your account'}</Link>
  </section>;
}
