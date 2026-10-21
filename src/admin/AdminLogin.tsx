import { Reveal } from "../animation/Reveal";
import { useState } from "react";
import { Lock } from "lucide-react";

interface AdminLoginProps {
  onLogin: (username: string, password: string, otp: string) => Promise<boolean> | boolean;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onLogin(username, password, otp);
    if (!success) {
      setError(true);
      setPassword("");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="admin-login-wrapper">
      <Reveal tone="admin" className="admin-login-box">
        <div className="admin-login-header">
          <Lock size={32} />
          <h1>Admin Portal</h1>
          <p>Enter your password and the current code from your authenticator app.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(false);
              }}
              required
              autoComplete="username"
              className={error ? "error-input" : ""}
            />
          </div>
          <div className="admin-form-group">
            <input
              type="text"
              placeholder="6-digit authenticator code"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(false); }}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              aria-label="6-digit authenticator code"
              className={error ? "error-input" : ""}
            />
          </div>

          <div className="admin-form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              required
              autoFocus
              className={error ? "error-input" : ""}
            />
            {error && <span className="error-text text-danger text-sm mt-1">Invalid username, password, or authenticator code</span>}
          </div>
          
          <button type="submit" className="admin-btn admin-btn-primary w-full justify-center mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/">← Return to Storefront</a>
        </div>
      </Reveal>
    </div>
  );
}
