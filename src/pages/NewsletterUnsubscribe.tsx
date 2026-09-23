import { Reveal } from "../animation/Reveal";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../config/api";

export default function NewsletterUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("Processing your unsubscribe request...");

  useEffect(() => {
    document.title = "Unsubscribe | Vestigia";
    const unsubscribe = async () => {
      if (!token) {
        setMessage("Your unsubscribe link is invalid.");
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        setDone(res.ok);
        setMessage(data.message || (res.ok ? "You have been unsubscribed from Vestigia emails." : "We could not process this request."));
      } catch {
        setMessage("We could not process this request. Please try again.");
      }
    };
    void unsubscribe();
  }, [token]);

  return (
    <main className="account-page-shell" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
      <Reveal as="section" variant="fade" style={{ width: "100%", maxWidth: 480, background: "#fff", border: "1px solid #eee7dc", borderRadius: 8, padding: "2.5rem", textAlign: "center" }}>
        <div style={{ width: 58, height: 58, borderRadius: "50%", margin: "0 auto 1rem", display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#ecfdf5" : "#fff7ed", color: done ? "#059669" : "#c2410c" }}>
          {done ? <CheckCircle2 size={30} /> : <AlertCircle size={28} />}
        </div>
        <h1 style={{ margin: "0 0 0.75rem", fontFamily: "Cormorant Garamond, serif", fontSize: "2rem" }}>
          {done ? "Unsubscribed" : "Unsubscribe"}
        </h1>
        <p style={{ color: "#6a645c", lineHeight: 1.7 }}>{message}</p>
        <div style={{ marginTop: "1.5rem" }}>
          <Link to="/" className="primary-link dark">Return to Vestigia</Link>
        </div>
      </Reveal>
    </main>
  );
}
