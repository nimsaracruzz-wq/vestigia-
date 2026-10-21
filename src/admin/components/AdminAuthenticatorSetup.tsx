import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE_URL } from '../../config/api';

type SetupData = { secret: string; otpauthUrl: string };
async function adminSecurityRequest<T>(path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('vstigia_adm_token') || '';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Security settings request failed.');
  return data as T;
}

export default function AdminAuthenticatorSetup() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    adminSecurityRequest<{ enabled: boolean }>('/admin/security/totp/status')
      .then(result => setEnabled(result.enabled))
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load authenticator status.'));
  }, []);

  const beginSetup = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await adminSecurityRequest<SetupData>('/admin/security/totp/setup', { password });
      setSetup(result); setCode(''); setPassword('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not start setup.'); }
    finally { setBusy(false); }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await adminSecurityRequest('/admin/security/totp/verify', { otp: code });
      setEnabled(true); setSetup(null); setCode('');
      setMessage('Authenticator app is enabled. Use its current six-digit code at your next admin login.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not verify the code.'); }
    finally { setBusy(false); }
  };

  return <section className="admin-panel mb-8">
    <div className="admin-panel-header"><h2>Admin authenticator app</h2></div>
    <div className="admin-panel-content">
      <p>{enabled === null ? 'Checking setup status…' : enabled ? 'Two-factor authentication is enabled for this admin account.' : 'Add an authenticator app as a second login factor.'}</p>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {message && <p role="status" className="text-success">{message}</p>}
      {enabled === false && !setup && <form onSubmit={beginSetup} className="admin-form-group">
        <label htmlFor="totp-current-password">Confirm current admin password</label>
        <input id="totp-current-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
        <button className="admin-btn admin-btn-primary" disabled={busy}>{busy ? 'Preparing…' : 'Set up authenticator app'}</button>
      </form>}
      {setup && <div>
        <p>In Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app, scan this QR code. Keep it private.</p>
        <div style={{ width: 'fit-content', padding: 12, background: '#fff', margin: '16px 0' }}><QRCodeSVG value={setup.otpauthUrl} size={200} level="M" /></div>
        <p>If scanning is unavailable, enter this setup key manually:</p>
        <code style={{ display: 'inline-block', padding: 10, userSelect: 'all', overflowWrap: 'anywhere' }}>{setup.secret}</code>
        <form onSubmit={verify} className="admin-form-group" style={{ marginTop: 16 }}>
          <label htmlFor="totp-verify-code">Enter the current six-digit code from the app</label>
          <input id="totp-verify-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
          <button className="admin-btn admin-btn-primary" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify and enable'}</button>
        </form>
      </div>}
    </div>
  </section>;
}
