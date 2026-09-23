import { Reveal, RevealGroup } from "../../animation/Reveal";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Download,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { API_BASE_URL } from "../../config/api";

type BackupJob = {
  backupId: string;
  type: string;
  status: string;
  stage: string;
  progress: number;
  createdBy: string | null;
  storage: string;
  sizeBytes: number;
  fileCount: number;
  encrypted: boolean;
  integrity: string;
  checksum: string | null;
  manifest: any;
  errorMessage: string | null;
  restoreStatus: string | null;
  startedAt: string | null;
  completedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

type BackupSettings = {
  automaticEnabled: boolean;
  frequency: string;
  dailyRetention: number;
  weeklyRetention: number;
  monthlyRetention: number;
  storageProvider: string;
  storagePath: string | null;
  offsiteEnabled: boolean;
  offsitePath: string | null;
  verifyAfterBackup: boolean;
  targetRpoHours: number;
  maintenanceModeOnRestore: boolean;
  preRestoreSafetyBackup: boolean;
  requireRestoreConfirmation: boolean;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
};

type BackupHealth = {
  healthStatus: "HEALTHY" | "ATTENTION" | "CRITICAL";
  targetRpoHours: number;
  actualAgeHours: number | null;
  lastSuccessfulBackup: string | null;
  lastVerifiedBackup: string | null;
  latestFullBackup: string | null;
  latestDatabaseBackup: string | null;
  latestMediaBackup: string | null;
  backupCount: number;
  successfulBackupCount: number;
  storageUsed: number;
  oldestBackup: string | null;
  latestBackup: string | null;
  automaticEnabled: boolean;
  frequency: string;
  maintenanceMode: boolean;
};

const token = () => localStorage.getItem("vstigia_adm_token") || "";

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Bypass-Tunnel-Reminder": "true",
      Authorization: `Bearer ${token()}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

const fmtDate = (value: string | null) => value ? new Date(value).toLocaleString() : "Never";
const fmtSize = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export default function AdminBackupRestore() {
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [health, setHealth] = useState<BackupHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [restoreBackupId, setRestoreBackupId] = useState("");
  const [restoreScope, setRestoreScope] = useState("FULL");
  const [restoreConfirmation, setRestoreConfirmation] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api("/admin/backups");
      setJobs(data.jobs || []);
      setSettings(data.settings || null);
      setHealth(data.health || null);
    } catch (error: any) {
      setMessage(error.message || "Unable to load backups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  const statusTone = useMemo(() => {
    if (health?.healthStatus === "HEALTHY") return "healthy";
    if (health?.healthStatus === "ATTENTION") return "attention";
    return "critical";
  }, [health]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMessage("");
    try {
      await fn();
      await load();
    } catch (error: any) {
      setMessage(error.message || "Operation failed.");
    } finally {
      setBusy(null);
    }
  };

  const createBackup = (type: string) => run(`create-${type}`, async () => {
    const data = await api("/admin/backups", { method: "POST", body: JSON.stringify({ type }) });
    setMessage(data.message || "Backup started.");
  });

  const saveSettings = () => run("settings", async () => {
    if (!settings) return;
    await api("/admin/backups/settings", { method: "PUT", body: JSON.stringify(settings) });
    setMessage("Backup settings saved.");
  });

  const verifyBackup = (backupId: string) => run(`verify-${backupId}`, async () => {
    await api(`/admin/backups/${encodeURIComponent(backupId)}/verify`, { method: "POST", body: JSON.stringify({}) });
    setMessage("Backup integrity verified.");
  });

  const testRestore = (backupId: string) => run(`test-${backupId}`, async () => {
    await api(`/admin/backups/${encodeURIComponent(backupId)}/restore-test`, { method: "POST", body: JSON.stringify({}) });
    setMessage("Restore test completed successfully.");
  });

  const downloadBackup = (backupId: string) => run(`download-${backupId}`, async () => {
    const res = await fetch(`${API_BASE_URL}/admin/backups/${encodeURIComponent(backupId)}/download`, {
      headers: {
        "Bypass-Tunnel-Reminder": "true",
        Authorization: `Bearer ${token()}`,
      },
    });
    if (!res.ok) throw new Error("Unable to download backup.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${backupId}.vbak`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Encrypted backup download started.");
  });

  const deleteBackup = (backupId: string) => run(`delete-${backupId}`, async () => {
    if (!window.confirm(`Delete backup ${backupId}?`)) return;
    await api(`/admin/backups/${encodeURIComponent(backupId)}`, { method: "DELETE", body: JSON.stringify({}) });
    setMessage("Backup deleted.");
  });

  const restore = () => run("restore", async () => {
    if (!restoreBackupId) throw new Error("Select a backup to restore.");
    await api(`/admin/backups/${encodeURIComponent(restoreBackupId)}/restore`, {
      method: "POST",
      body: JSON.stringify({ scope: restoreScope, confirmation: restoreConfirmation }),
    });
    setMessage("Restore completed and post-restore validation passed.");
    setRestoreConfirmation("");
  });

  return (
    <div className="admin-page backup-page">
      <Reveal className="admin-page-header">
        <div>
          <h1>Backup & Restore</h1>
          <p>Encrypted database, media, configuration, verification, retention, and disaster recovery controls.</p>
        </div>
        <button className="admin-btn admin-btn-secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </Reveal>

      {message && <div className="backup-message">{message}</div>}

      <RevealGroup as="section" className="backup-health-grid">
        <article className={`backup-health-card ${statusTone}`}>
          <div>
            <span>Backup Health</span>
            <strong>{health?.healthStatus === "HEALTHY" ? "Healthy" : health?.healthStatus === "ATTENTION" ? "Attention Required" : "Critical"}</strong>
            <small>Target RPO: {health?.targetRpoHours ?? 24}h · Actual: {health?.actualAgeHours ?? "n/a"}h</small>
          </div>
          {statusTone === "healthy" ? <CheckCircle size={34} /> : <AlertTriangle size={34} />}
        </article>
        <Reveal as="article" className="backup-mini-card">
          <Clock size={20} />
          <span>Last Backup</span>
          <strong>{fmtDate(health?.lastSuccessfulBackup || null)}</strong>
        </Reveal>
        <Reveal as="article" className="backup-mini-card">
          <ShieldCheck size={20} />
          <span>Last Verification</span>
          <strong>{fmtDate(health?.lastVerifiedBackup || null)}</strong>
        </Reveal>
        <Reveal as="article" className="backup-mini-card">
          <HardDrive size={20} />
          <span>Storage Used</span>
          <strong>{fmtSize(health?.storageUsed || 0)}</strong>
        </Reveal>
      </RevealGroup>

      <Reveal as="section" variant="fade" className="admin-panel backup-create-panel">
        <div className="admin-panel-header">
          <h2>Create Backup</h2>
          <span className="backup-encryption-pill">AES-256-GCM encrypted</span>
        </div>
        <div className="admin-panel-content backup-actions-grid">
          {["DATABASE", "MEDIA", "CONFIGURATION", "FULL"].map((type) => (
            <button key={type} className={type === "FULL" ? "admin-btn admin-btn-primary" : "admin-btn admin-btn-secondary"} onClick={() => createBackup(type)} disabled={Boolean(busy)}>
              {busy === `create-${type}` ? <Loader2 size={15} className="spin" /> : type === "MEDIA" ? <UploadCloud size={15} /> : <Database size={15} />}
              {type.replace("_", " ")} Backup
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" variant="fade" className="admin-panel">
        <div className="admin-panel-header">
          <h2>Backup History</h2>
          <span>{jobs.length} backup{jobs.length === 1 ? "" : "s"}</span>
        </div>
        <div className="admin-panel-content p-0">
          <table className="admin-table backup-table">
            <thead>
              <tr>
                <th>Backup ID</th>
                <th>Type</th>
                <th>Date</th>
                <th>Size</th>
                <th>Status</th>
                <th>Integrity</th>
                <th>Stage</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.backupId}>
                  <td><strong>{job.backupId}</strong><small>{job.createdBy || "Admin"}</small></td>
                  <td>{job.type}</td>
                  <td>{fmtDate(job.completedAt || job.createdAt)}</td>
                  <td>{fmtSize(job.sizeBytes)}</td>
                  <td><span className={`backup-status ${job.status.toLowerCase()}`}>{job.status}</span></td>
                  <td>{job.integrity === "VERIFIED" ? "Verified" : job.integrity}</td>
                  <td>{job.stage}</td>
                  <td className="text-right">
                    <div className="admin-table-actions">
                      <button onClick={() => verifyBackup(job.backupId)} disabled={Boolean(busy)} title="Verify">Verify</button>
                      <button onClick={() => testRestore(job.backupId)} disabled={Boolean(busy)} title="Test restore">Test</button>
                      <button onClick={() => downloadBackup(job.backupId)} disabled={Boolean(busy)} title="Download"><Download size={14} /></button>
                      <button onClick={() => { setRestoreBackupId(job.backupId); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }} title="Restore">Restore</button>
                      <button onClick={() => deleteBackup(job.backupId)} className="text-danger" disabled={Boolean(busy)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8">No backups yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Reveal>

      {settings && (
        <section className="backup-settings-grid">
          <Reveal variant="fade" className="admin-panel">
            <div className="admin-panel-header"><h2>Backup Settings</h2></div>
            <div className="admin-panel-content admin-form">
              <label className="backup-toggle"><input type="checkbox" checked={settings.automaticEnabled} onChange={(e) => setSettings({ ...settings, automaticEnabled: e.target.checked })} /> Automatic backups</label>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Frequency</label>
                  <select value={settings.frequency} onChange={(e) => setSettings({ ...settings, frequency: e.target.value })}>
                    <option value="HOURLY">Hourly</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Target RPO Hours</label>
                  <input type="number" min="1" max="168" value={settings.targetRpoHours} onChange={(e) => setSettings({ ...settings, targetRpoHours: Number(e.target.value) })} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group"><label>Daily Keep</label><input type="number" min="1" value={settings.dailyRetention} onChange={(e) => setSettings({ ...settings, dailyRetention: Number(e.target.value) })} /></div>
                <div className="admin-form-group"><label>Weekly Keep</label><input type="number" min="1" value={settings.weeklyRetention} onChange={(e) => setSettings({ ...settings, weeklyRetention: Number(e.target.value) })} /></div>
                <div className="admin-form-group"><label>Monthly Keep</label><input type="number" min="1" value={settings.monthlyRetention} onChange={(e) => setSettings({ ...settings, monthlyRetention: Number(e.target.value) })} /></div>
              </div>
              <button className="admin-btn admin-btn-primary" onClick={saveSettings} disabled={busy === "settings"}>Save Settings</button>
            </div>
          </Reveal>

          <Reveal variant="fade" className="admin-panel">
            <div className="admin-panel-header"><h2>Recovery</h2></div>
            <div className="admin-panel-content admin-form">
              <div className="admin-form-group">
                <label>Backup to restore</label>
                <select value={restoreBackupId} onChange={(e) => setRestoreBackupId(e.target.value)}>
                  <option value="">Select backup</option>
                  {jobs.filter((job) => job.status === "SUCCESS").map((job) => <option key={job.backupId} value={job.backupId}>{job.backupId} · {job.type}</option>)}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Restore Scope</label>
                <select value={restoreScope} onChange={(e) => setRestoreScope(e.target.value)}>
                  <option value="FULL">Full Restore</option>
                  <option value="DATABASE">Database Only</option>
                  <option value="MEDIA">Media Only</option>
                </select>
              </div>
              <div className="restore-warning">
                Restoring a historical backup may replace current products, orders, customers, inventory, and media. A safety backup is created first.
              </div>
              <div className="admin-form-group">
                <label>Type RESTORE VESTIGIA</label>
                <input value={restoreConfirmation} onChange={(e) => setRestoreConfirmation(e.target.value)} placeholder="RESTORE VESTIGIA" />
              </div>
              <button className="admin-btn danger" onClick={restore} disabled={busy === "restore" || restoreConfirmation !== "RESTORE VESTIGIA"}>
                Restore Backup
              </button>
            </div>
          </Reveal>
        </section>
      )}
    </div>
  );
}
