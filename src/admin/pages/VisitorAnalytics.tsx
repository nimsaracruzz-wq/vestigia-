import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import './visitor-analytics.css';

type Live = { measuredAt: string; activeWindowSeconds: number; activeSessions: number; pages: { path: string; sessions: number }[] };
type Summary = { measuredAt: string; days: number; views: number; visitors: number; sessions: number; firstRecordedAt: string | null; retentionDays: number; daily: { date: string; views: number }[]; pages: Count[]; referrers: Count[]; devices: Count[] };
type Count = { name: string; views: number };

function useReport<T>(path: string, interval?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false, loading = false;
    const controller = new AbortController();
    setData(null); setError('');
    const load = async () => {
      if (cancelled || loading || document.visibilityState === 'hidden') return;
      loading = true; setBusy(true);
      try {
        const token = localStorage.getItem('vstigia_adm_token');
        const response = await fetch(`${API_BASE_URL}${path}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]), headers: { Authorization: `Bearer ${token || ''}` } });
        const report = await response.json();
        if (!response.ok) throw new Error(report.error || 'Report could not be loaded.');
        if (!cancelled) { setData(report); setError(''); }
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : 'Report could not be loaded.');
      } finally { loading = false; if (!cancelled) setBusy(false); }
    };
    void load();
    const timer = interval ? window.setInterval(() => { void load(); }, interval) : null;
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', visible);
    return () => { cancelled = true; controller.abort(); if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [path, interval, refresh]);
  return { data, error, busy, reload: useCallback(() => setRefresh(value => value + 1), []) };
}

const time = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not available';
const count = (value?: number) => value === undefined ? '—' : value.toLocaleString();
function Counts({ title, rows }: { title: string; rows?: Count[] }) {
  return <section className="traffic-panel"><h2>{title}</h2>{rows?.length ? <div className="traffic-table-wrap"><table><thead><tr><th>Name</th><th>Page views</th></tr></thead><tbody>{rows.map(row => <tr key={row.name}><td>{row.name}</td><td>{count(row.views)}</td></tr>)}</tbody></table></div> : <p>No recorded page views in this period.</p>}</section>;
}
export default function VisitorAnalytics() {
  const [days, setDays] = useState(7);
  const live = useReport<Live>('/admin/traffic/live', 15000);
  const summary = useReport<Summary>(`/admin/traffic/summary?days=${days}`, 60000);
  const reload = () => { live.reload(); summary.reload(); };
  const anyBusy = live.busy || summary.busy;
  return <div className="admin-page visitor-analytics">
    <header className="admin-page-header"><div><h1>Visitor monitoring</h1><p>Live browser activity and recorded storefront visits.</p></div><button className="traffic-button" onClick={reload} disabled={anyBusy}><RefreshCw size={16} />{anyBusy ? 'Refreshing…' : 'Refresh reports'}</button></header>
    <div className="traffic-toolbar"><label>Period <select value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={90}>Last 90 days</option></select></label></div>
      <p className="traffic-method">Counts include consenting browsers on public storefront pages only. Admin browsers and common bots are excluded. Browser identifiers represent devices/browsers, not verified people. Blockers, denied consent, and missed requests reduce coverage; no historical visits are reconstructed.</p>
      {live.error && <p role="alert" className="traffic-error">Live update failed: {live.error} {live.data && 'Values below are from the last successful update.'}</p>}
      <section className="traffic-live traffic-panel"><div><span className="traffic-eyebrow">LIVE · UPDATES EVERY 15 SECONDS</span><h2>{count(live.data?.activeSessions)} <span>active browser sessions</span></h2><p>Visible-page heartbeat received in the last {live.data?.activeWindowSeconds || 90} seconds. This is activity detection, not a count of people online.</p><small>Last successful measurement: {time(live.data?.measuredAt)}</small></div><ul>{live.data?.pages.map(page => <li key={page.path}><span>{page.path}</span><strong>{page.sessions}</strong></li>)}</ul></section>
      {summary.error && <p className="traffic-error" role="alert">Traffic report failed: {summary.error} {summary.data && 'Showing the last successful report.'}</p>}
      <div className="traffic-metrics">{[['Page views', summary.data?.views], ['Distinct browsers', summary.data?.visitors], ['Sessions', summary.data?.sessions]].map(([label, value]) => <section className="traffic-panel" key={String(label)}><h2>{label}</h2><strong>{count(value as number | undefined)}</strong></section>)}</div>
      {summary.data && <><p className="traffic-caption">Daily boundaries: UTC · Last successful report: {time(summary.data.measuredAt)} · Earliest retained event: {time(summary.data.firstRecordedAt)} · Retention: {summary.data.retentionDays} days. Sessions restart after 30 minutes without a visible heartbeat.</p>{!summary.data.views && <p className="traffic-method">No visits have been recorded in this period. After deployment, accept Analytics in Cookie Preferences from a non-admin browser and visit a public page to check collection.</p>}<div className="traffic-grid"><Counts title="Top pages · up to 20" rows={summary.data.pages} /><Counts title="Referring websites · up to 20" rows={summary.data.referrers} /><Counts title="Viewport categories" rows={summary.data.devices} /><Counts title="Daily page views · UTC" rows={summary.data.daily.map(row => ({ name: row.date, views: row.views }))} /></div></>}
  </div>;
}
