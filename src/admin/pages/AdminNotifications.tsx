import React, { useState, useEffect } from "react";
import { useAdmin } from "../AdminContext";
import { API_BASE_URL } from "../../config/api";
import { Bell, Mail, CheckCircle2, AlertCircle, Send, ShieldCheck, RefreshCw } from "lucide-react";

export default function AdminNotifications() {
  const { settings, updateSettings } = useAdmin();
  const [email, setEmail] = useState(settings.orderNotificationEmail || "owner@thevestigia.com");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (settings.orderNotificationEmail) {
      setEmail(settings.orderNotificationEmail);
    }
  }, [settings.orderNotificationEmail]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      ...settings,
      orderNotificationEmail: email.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSendTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem("vstigia_adm_token") || localStorage.getItem("vestigia_admin_token");
      const res = await fetch(`${API_BASE_URL}/admin/test-order-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ targetEmail: email }),
      });
      const contentType = res.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const data = isJson ? await res.json() : null;

      if (res.ok) {
        setTestResult({
          success: true,
          message: `Test order notification email successfully sent to ${email}! Check your inbox.`,
        });
      } else {
        setTestResult({
          success: false,
          message: data?.error || data?.message || `Server returned status ${res.status}. Please check backend logs.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error while sending test email.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="admin-page" style={{ maxWidth: "1000px" }}>
      <div className="admin-page-header mb-6">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 6px 0", fontSize: "1.6rem" }}>
            <Bell size={24} style={{ color: "#d97706" }} /> Order Notifications &amp; Owner Alerts
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>
            Configure real-time order notifications sent to the store owner whenever a customer places an order.
          </p>
        </div>
      </div>

      {/* SUCCESS / ERROR TOAST */}
      {saved && (
        <div style={{ padding: "14px 18px", borderRadius: "8px", background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
          <CheckCircle2 size={18} />
          <span>Notification email settings saved successfully!</span>
        </div>
      )}

      {testResult && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "8px",
            background: testResult.success ? "#dcfce7" : "#fee2e2",
            color: testResult.success ? "#166534" : "#991b1b",
            border: `1px solid ${testResult.success ? "#bbf7d0" : "#fecaca"}`,
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.9rem",
          }}
        >
          {testResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{testResult.message}</span>
        </div>
      )}

      <div style={{ display: "grid", gap: "24px" }}>
        {/* MAIN EMAIL SETTINGS CARD */}
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", borderBottom: "1px solid #f3f4f6", paddingBottom: "16px" }}>
            <div style={{ background: "#fef3c7", color: "#d97706", padding: "10px", borderRadius: "10px" }}>
              <Mail size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 600, color: "#111827" }}>Owner Order Notification Email</h2>
              <p style={{ margin: "2px 0 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
                This email address will receive an instant copy of every customer purchase receipt.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
                Owner Notification Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@thevestigia.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "0.95rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
              <p style={{ margin: "6px 0 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
                You can change this email anytime. Multiple admin notifications can be updated whenever required.
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="submit"
                style={{
                  background: "#111827",
                  color: "#ffffff",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <ShieldCheck size={16} /> Save Email Settings
              </button>

              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testing}
                style={{
                  background: "#f3f4f6",
                  color: "#374151",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  border: "1px solid #d1d5db",
                  cursor: testing ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: testing ? 0.7 : 1,
                }}
              >
                {testing ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {testing ? "Sending Test..." : "Send Test Order Notification Email"}
              </button>
            </div>
          </form>
        </div>

        {/* HOW IT WORKS INFO BOX */}
        <div style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
            How Order Notifications Work
          </h3>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#4b5563", fontSize: "0.88rem", lineHeight: "1.7" }}>
            <li>When a buyer completes checkout on VESTIGIA®, an official receipt is sent to the customer's email.</li>
            <li>In parallel, an instant duplicate alert is sent to your <strong>Owner Notification Email</strong> containing full order details, customer contact info, purchased items, and total revenue.</li>
            <li>No customer credentials or payment keys are shared. Notifications are sent over secure SMTP.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
