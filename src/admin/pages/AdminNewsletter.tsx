import { Reveal } from "../../animation/Reveal";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Download, Mail, RefreshCw, Search, ShieldOff, Users } from "lucide-react";

type NewsletterStatus = "PENDING" | "SUBSCRIBED" | "UNSUBSCRIBED" | "BOUNCED" | "BLOCKED";

interface Subscriber {
  id: number;
  email: string;
  firstName?: string | null;
  status: NewsletterStatus;
  source?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  unsubscribedAt?: string | null;
  consentVersion?: string | null;
}

interface NewsletterStats {
  total: number;
  subscribed: number;
  pending: number;
  unsubscribed: number;
  bounced: number;
  blocked: number;
}

const STATUS_OPTIONS = ["ALL", "SUBSCRIBED", "PENDING", "UNSUBSCRIBED", "BOUNCED", "BLOCKED"] as const;

function getAdminToken() {
  return localStorage.getItem("vstigia_adm_token");
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const res = await fetch(`/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Bypass-Tunnel-Reminder": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

function StatusPill({ status }: { status: NewsletterStatus }) {
  const palette: Record<NewsletterStatus, { bg: string; fg: string }> = {
    SUBSCRIBED: { bg: "#dcfce7", fg: "#166534" },
    PENDING: { bg: "#fef3c7", fg: "#92400e" },
    UNSUBSCRIBED: { bg: "#f3f4f6", fg: "#4b5563" },
    BOUNCED: { bg: "#fee2e2", fg: "#991b1b" },
    BLOCKED: { bg: "#111827", fg: "#fff" },
  };
  const c = palette[status] || palette.PENDING;
  return <span style={{ padding: "4px 9px", borderRadius: 999, background: c.bg, color: c.fg, fontSize: 11, fontWeight: 700 }}>{status}</span>;
}

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<NewsletterStats>({ total: 0, subscribed: 0, pending: 0, unsubscribed: 0, bounced: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (status !== "ALL") query.set("status", status);
      const data = await apiRequest(`/newsletter${query.toString() ? `?${query.toString()}` : ""}`);
      setSubscribers(Array.isArray(data.subscribers) ? data.subscribers : []);
      if (data.stats) setStats(data.stats);
    } catch (e) {
      setError("Failed to load newsletter subscribers. Please sign in again or check the backend.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  const action = async (subscriber: Subscriber, actionName: "UNSUBSCRIBE" | "BLOCK" | "RESEND_CONFIRMATION") => {
    setBusyId(subscriber.id);
    try {
      const data = await apiRequest(`/newsletter/${subscriber.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: actionName }),
      });
      if (data.subscriber) {
        setSubscribers((prev) => prev.map((s) => (s.id === subscriber.id ? data.subscriber : s)));
      }
      showToast(
        actionName === "RESEND_CONFIRMATION"
          ? "Confirmation email sent if subscriber is pending."
          : "Subscriber updated."
      );
      void fetchSubscribers();
    } catch {
      showToast("Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = async () => {
    const token = getAdminToken();
    const url = `/api/newsletter/export?status=${encodeURIComponent(status === "ALL" ? "SUBSCRIBED" : status)}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token ?? ""}`, "Bypass-Tunnel-Reminder": "true" } });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "newsletter_subscribers.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      showToast("Export failed.");
    }
  };

  const statCards = useMemo(() => [
    ["Total", stats.total, <Users size={18} />],
    ["Subscribed", stats.subscribed, <Mail size={18} />],
    ["Pending", stats.pending, <RefreshCw size={18} />],
    ["Unsubscribed", stats.unsubscribed, <ShieldOff size={18} />],
    ["Bounced", stats.bounced, <Ban size={18} />],
    ["Blocked", stats.blocked, <Ban size={18} />],
  ], [stats]);

  return (
    <div className="admin-page">
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, background: "#111", color: "#fff", borderRadius: 8, padding: "12px 18px", fontSize: 13 }}>
          {toast}
        </div>
      )}

      <Reveal className="admin-page-header">
        <div>
          <h1>Newsletter</h1>
          <p>Manage Inner Circle subscribers, confirmation status, and exports.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="admin-btn secondary" onClick={() => void fetchSubscribers()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
          <button className="admin-btn primary" onClick={() => void exportCsv()}><Download size={15} /> Export CSV</button>
        </div>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12, marginBottom: 22 }}>
        {statCards.map(([label, value, icon]) => (
          <Reveal variant="fade" key={String(label)} className="admin-panel">
            <div className="admin-panel-content" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(190,145,91,0.12)", color: "#BE915B", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{value}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal variant="fade" className="admin-panel">
        <div className="admin-panel-header" style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Subscribers</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#888" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email" style={{ padding: "8px 10px 8px 30px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "inherit" }} />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.12)", background: "#111", color: "inherit" }}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="admin-panel-content">
          {loading ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem 0" }}>Loading subscribers...</p>
          ) : error ? (
            <p style={{ color: "#f87171", textAlign: "center", padding: "2rem 0" }}>{error}</p>
          ) : subscribers.length === 0 ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem 0" }}>No subscribers found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    {["Email", "Status", "Source", "Subscribed", "Confirmed", "Actions"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((sub) => (
                    <tr key={sub.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px" }}><a href={`mailto:${sub.email}`} style={{ color: "inherit", textDecoration: "none" }}>{sub.email}</a></td>
                      <td style={{ padding: "12px" }}><StatusPill status={sub.status} /></td>
                      <td style={{ padding: "12px", color: "#9ca3af" }}>{sub.source || "-"}</td>
                      <td style={{ padding: "12px", color: "#9ca3af" }}>{fmtDate(sub.createdAt)}</td>
                      <td style={{ padding: "12px", color: "#9ca3af" }}>{fmtDate(sub.confirmedAt)}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {sub.status === "PENDING" && <button className="admin-btn secondary" disabled={busyId === sub.id} onClick={() => void action(sub, "RESEND_CONFIRMATION")}>Resend</button>}
                          {sub.status !== "UNSUBSCRIBED" && <button className="admin-btn secondary" disabled={busyId === sub.id} onClick={() => void action(sub, "UNSUBSCRIBE")}>Unsubscribe</button>}
                          {sub.status !== "BLOCKED" && <button className="admin-btn danger" disabled={busyId === sub.id} onClick={() => void action(sub, "BLOCK")}>Block</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
