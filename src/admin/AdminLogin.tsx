import { useState } from "react";
import { Lock } from "lucide-react";

interface AdminLoginProps {
  onLogin: (password: string) => boolean;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(password);
    if (!success) {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <Lock size={32} />
          <h1>Admin Portal</h1>
          <p>Please enter your password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
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
            {error && <span className="error-text text-danger text-sm mt-1">Incorrect password</span>}
          </div>
          
          <button type="submit" className="admin-btn admin-btn-primary w-full justify-center mt-2">
            Login
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/">← Return to Storefront</a>
        </div>
      </div>
    </div>
  );
}
