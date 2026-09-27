import { SectionReveal as Reveal } from '../animation/SectionReveal';
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { API_BASE_URL } from "../config/api";

export default function NewsletterConfirm() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "expired" | "error">("loading");
  const [message, setMessage] = useState("Confirming your subscription...");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    document.title = "Confirm Newsletter | Vestigia";
    const confirm = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Your confirmation link is invalid.");
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/newsletter/confirm?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Welcome to the Vestigia Inner Circle.");
        } else if (data.expired) {
          setStatus("expired");
          setEmail(data.email || "");
          setMessage(data.message || "Your confirmation link has expired.");
        } else {
          setStatus("error");
          setMessage(data.message || "We could not confirm your subscription.");
        }
      } catch {
        setStatus("error");
        setMessage("We could not confirm your subscription. Please try again.");
      }
    };
    void confirm();
  }, [token]);

  const resend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await fetch(`${API_BASE_URL}/newsletter/resend-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMessage("If a pending subscription exists, we will send another confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const ok = status === "success";

  return (
    <main className="account-page-shell" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <Reveal as="section" variant="fade" style={{ width: "100%", maxWidth: 480, background: "#fff", border: "1px solid #eee7dc", borderRadius: 8, padding: "2.5rem", textAlign: "center" }}>
        <div style={{ width: 58, height: 58, borderRadius: "50%", margin: "0 auto 1rem", display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "#ecfdf5" : "#fff7ed", color: ok ? "#059669" : "#c2410c" }}>
          {ok ? <CheckCircle2 size={30} /> : status === "loading" ? <Mail size={28} /> : <AlertCircle size={28} />}
        </div>
        <h1 style={{ margin: "0 0 0.75rem", fontFamily: "Cormorant Garamond, serif", fontSize: "2rem" }}>
          {ok ? "Subscription Confirmed" : status === "expired" ? "Link Expired" : "Newsletter Confirmation"}
        </h1>
        <p style={{ color: "#6a645c", lineHeight: 1.7 }}>{message}</p>
        {status === "expired" && email && (
          <button type="button" onClick={resend} disabled={resending} className="primary-link dark" style={{ border: 0, cursor: "pointer", marginTop: "1rem" }}>
            {resending ? "Sending..." : "Send New Confirmation Email"}
          </button>
        )}
        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/" className="primary-link dark">Return to Vestigia</Link>
        </div>
      </Reveal>
    </main>
  );
}
