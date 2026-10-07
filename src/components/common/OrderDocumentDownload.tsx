import { useState } from 'react';
import { Download } from 'lucide-react';
import type { DocumentKind, DocumentOrder } from '../../utils/orderDocuments';

export default function OrderDocumentDownload({ orders, kind, className = 'admin-btn', label }: { orders: DocumentOrder[]; kind: DocumentKind; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const download = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { const { downloadOrderDocument } = await import('../../utils/orderDocuments'); downloadOrderDocument(orders, kind); }
    catch (err) { setError(err instanceof Error ? err.message : 'Download failed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
    <button type="button" className={className} onClick={download} disabled={busy || !orders.length} aria-busy={busy}><Download size={14} aria-hidden="true" /> {busy ? 'Preparing PDF...' : label || (kind === 'invoice' ? 'Download Invoice' : 'Download Packing Slip')}</button>
    {error && <span role="alert" style={{ color: '#b42318', fontSize: 12 }}>{error}</span>}
  </span>;
}
