import { useState } from "react";
import { Lock } from "lucide-react";

interface AdminLoginProps {
  onLogin: (username: string, password: string) => Promise<boolean> | boolean;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await onLogin(username, password);
    if (!success) {
      setError(true);
      setPassword("");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <Lock size={32} />
          <h1>Admin Portal</h1>
          <p>Please enter your username and password to continue.</p>
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
          
          <button type="submit" className="admin-btn admin-btn-primary w-full justify-center mt-2" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/">← Return to Storefront</a>
        </div>
      </div>
    </div>
  );
}
