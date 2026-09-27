import { SectionReveal as Reveal } from '../animation/SectionReveal';
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useUser } from "../context/UserContext";

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { activateAccount } = useUser();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    document.title = "Set Password & Activate Account | Vestigia";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage("Invalid activation token.");
      return;
    }
    if (password.length < 12) {
      setErrorMessage("Password must be at least 12 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    const res = await activateAccount(token, password);
    setIsSubmitting(false);

    if (res.success) {
      setIsActivated(true);
      setTimeout(() => {
        navigate("/account");
      }, 2500);
    } else {
      setErrorMessage(res.error || "Failed to set password. Token may have expired.");
    }
  };

  return (
    <div className="account-page-shell" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <Reveal className="activation-card" style={{ maxWidth: "440px", width: "100%", background: "#ffffff", padding: "2.5rem", borderRadius: "16px", boxShadow: "0 10px 30px rgba(0,0,0,0.06)", border: "1px solid #f0e9df" }}>
        {isActivated ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "64px", height: "64px", background: "#ecfdf5", color: "#059669", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.8rem", color: "#171412", margin: "0 0 0.5rem" }}>Account Activated!</h2>
            <p style={{ color: "#6a645c", fontSize: "0.92rem", marginBottom: "1.5rem" }}>
              Your password has been saved securely. Redirecting to your customer dashboard...
            </p>
            <Link to="/account" className="primary-link dark" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
              Go to Account Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div style={{ width: "52px", height: "52px", background: "#fcf8f2", color: "#c8a96e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", border: "1px solid #f0e9df" }}>
                <ShieldCheck size={26} />
              </div>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.8rem", color: "#171412", margin: "0 0 0.4rem" }}>Complete Account Setup</h2>
              <p style={{ color: "#6a645c", fontSize: "0.88rem" }}>
                Set a password to secure your Vestigia client account and view order history.
              </p>
            </div>

            {errorMessage && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  required
                  style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.95rem" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "0.95rem" }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="checkout-continue-btn full-width"
                style={{ width: "100%", padding: "0.85rem", background: "#171412", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" }}
              >
                {isSubmitting ? "Saving Password..." : "Set Password & Complete Activation"}
              </button>
            </form>
          </div>
        )}
      </Reveal>
    </div>
  );
}
