import { useState, useEffect, useCallback } from "react";
import { Mail, Trash2, Download, RefreshCw, Users } from "lucide-react";

interface Subscriber {
  id: number;
  email: string;
  createdAt: string;
}

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

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/newsletter");
      if (Array.isArray(data)) setSubscribers(data);
    } catch (e) {
      setError("Failed to load newsletter subscribers. Make sure you are logged in.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this subscriber from the list?")) return;
    setDeletingId(id);
    try {
      await apiRequest(`/newsletter/${id}`, { method: "DELETE" });
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      showToast("Subscriber removed.");
    } catch {
      showToast("Failed to remove subscriber.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = () => {
    const token = getAdminToken();
    const url = `/api/newsletter/export`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "newsletter_subscribers.csv");
    // Include auth via Authorization header not possible for direct link; open in new tab with fetch
    fetch(url, {
      headers: {
        "Authorization": `Bearer ${token ?? ""}`,
        "Bypass-Tunnel-Reminder": "true",
      },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => showToast("Export failed."));
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="admin-page">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            right: "1.5rem",
            background: "#18181b",
            color: "#fff",
            borderRadius: "8px",
            padding: "0.75rem 1.25rem",
            fontSize: "0.875rem",
            border: "1px solid rgba(255,255,255,0.1)",
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1>Newsletter Subscribers</h1>
          <p>Manage your mailing list and export contacts.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            className="admin-btn secondary"
            onClick={() => void fetchSubscribers()}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          <button
            className="admin-btn primary"
            onClick={handleExport}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Banner */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div className="admin-panel" style={{ flex: 1, minWidth: "160px" }}>
          <div className="admin-panel-content" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(190,145,91,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={20} style={{ color: "#BE915B" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Total Subscribers
              </p>
              <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>
                {subscribers.length}
              </p>
            </div>
          </div>
        </div>
        <div className="admin-panel" style={{ flex: 1, minWidth: "160px" }}>
          <div className="admin-panel-content" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "rgba(16,185,129,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={20} style={{ color: "#10b981" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                This Month
              </p>
              <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>
                {
                  subscribers.filter((s) => {
                    try {
                      const d = new Date(s.createdAt);
                      const now = new Date();
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    } catch {
                      return false;
                    }
                  }).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="admin-panel">
        <div className="admin-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <h2 style={{ margin: 0 }}>Mailing List</h2>
          <input
            type="text"
            placeholder="Search by email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "0.45rem 0.85rem",
              borderRadius: "7px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "inherit",
              fontSize: "0.875rem",
              outline: "none",
              width: "220px",
            }}
          />
        </div>

        <div className="admin-panel-content">
          {loading ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem 0" }}>
              Loading subscribers…
            </p>
          ) : error ? (
            <p style={{ color: "#f87171", textAlign: "center", padding: "2rem 0" }}>{error}</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem 0" }}>
              {search ? "No subscribers match your search." : "No newsletter subscribers yet."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem", color: "#6b7280", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>#</th>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem", color: "#6b7280", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</th>
                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem", color: "#6b7280", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Subscribed</th>
                    <th style={{ textAlign: "right", padding: "0.6rem 0.75rem", color: "#6b7280", fontWeight: 500, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub, idx) => (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "0.75rem", color: "#6b7280", fontSize: "0.8rem" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              background: "rgba(190,145,91,0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: "#BE915B",
                              flexShrink: 0,
                            }}
                          >
                            {sub.email.charAt(0).toUpperCase()}
                          </div>
                          <a
                            href={`mailto:${sub.email}`}
                            style={{ color: "inherit", textDecoration: "none" }}
                          >
                            {sub.email}
                          </a>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem", color: "#9ca3af" }}>
                        {formatDate(sub.createdAt)}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <button
                          className="icon-btn danger"
                          onClick={() => void handleDelete(sub.id)}
                          disabled={deletingId === sub.id}
                          title="Remove subscriber"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
