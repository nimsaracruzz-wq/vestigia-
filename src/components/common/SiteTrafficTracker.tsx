import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '../../context/CookieConsentContext';
import { API_BASE_URL } from '../../config/api';
import { trafficPath } from '../../../shared/siteTraffic';

const VISITOR = 'vestigia_traffic_visitor';
const SESSION = 'vestigia_traffic_session';

/** Optional first-party measurement only; private pages and query strings are excluded. */
export default function SiteTrafficTracker() {
  const { consent } = useCookieConsent();
  const location = useLocation();
  const view = useRef({ key: '', id: '', sent: false });
  useEffect(() => {
    try {
      // Consent loads asynchronously; don't erase a returning visitor's ID while it loads.
      if (!consent) return;
      const optedOut = navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
      if (!consent?.analytics || optedOut) {
        localStorage.removeItem(VISITOR); sessionStorage.removeItem(SESSION);
        view.current = { key: '', id: '', sent: false };
        return;
      }
      const path = trafficPath(location.pathname);
      if (!path || localStorage.getItem('vstigia_adm_token') || navigator.webdriver) return;
      const key = location.key + ':' + path;
      if (view.current.key !== key) view.current = { key, id: crypto.randomUUID(), sent: false };
      let visitorId = localStorage.getItem(VISITOR);
      if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem(VISITOR, visitorId); }
      const referrer = document.referrer ? new URL(document.referrer).origin : '';
      const device = window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
      const send = () => {
        if (document.visibilityState !== 'visible' || localStorage.getItem('vstigia_adm_token')) return;
        const now = Date.now();
        let stored: { id: string; seen: number } | null = null;
        try { stored = JSON.parse(sessionStorage.getItem(SESSION) || 'null'); } catch { /* Start a new session. */ }
        const fresh = !stored?.id || !stored.seen || now - stored.seen > 30 * 60000;
        if (fresh) { stored = { id: crypto.randomUUID(), seen: now }; view.current = { key, id: crypto.randomUUID(), sent: false }; }
        stored!.seen = now; sessionStorage.setItem(SESSION, JSON.stringify(stored));
        const event = { consent: true, sessionId: stored!.id, visitorId, eventId: view.current.id, type: view.current.sent ? 'heartbeat' : 'pageview', path, device, referrer };
        const eventId = view.current.id;
        // Reuse the event ID during retries and development effect replays.
        view.current.sent = true;
        void fetch(`${API_BASE_URL}/traffic/event`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), keepalive: true }).then(response => {
          if (!response.ok && view.current.id === eventId && event.type === 'pageview') view.current.sent = false;
        }).catch(() => { if (view.current.id === eventId && event.type === 'pageview') view.current.sent = false; });
      };
      send();
      const interval = window.setInterval(send, 30000);
      document.addEventListener('visibilitychange', send);
      return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', send); };
    } catch { /* Measurement must never prevent shopping when storage is unavailable. */ }
  }, [consent?.analytics, location.key, location.pathname]);
  return null;
}
