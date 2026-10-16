import { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Modal } from '../components/Modal';
import { Plus, Trash2 } from 'lucide-react';
import { SUPPORTED_CURRENCIES, formatMoney, type Currency } from '../../../shared/money';

const empty = { code: '', discount: '10', type: 'percentage', target: 'items', currency: 'USD', maxUses: '', expiry: '' };
export default function Promotions() {
  const { promoCodes, addPromoCode, togglePromoCode, deletePromoCode } = useAdmin();
  const [open, setOpen] = useState(false), [form, setForm] = useState(empty), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const action = async (operation: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await operation(); } catch (error) { setError(error instanceof Error ? error.message : 'The code could not be saved.'); }
    finally { setBusy(false); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await action(async () => {
      await addPromoCode({ code: form.code.trim().toUpperCase(), discount: form.type === 'free_shipping' ? 0 : Number(form.discount), type: form.type as 'percentage' | 'fixed' | 'free_shipping', target: form.target as 'items' | 'shipping', currency: form.type === 'fixed' ? form.currency as Currency : null, maxUses: form.maxUses ? Number(form.maxUses) : null, expiry: form.expiry || null, active: true });
      setOpen(false); setForm(empty);
    });
  };
  return <div className="admin-page">
    <header className="admin-page-header"><div><h1>Discount codes</h1><p>One code per order. Discounts are verified and calculated by the server before payment.</p></div><button className="admin-btn admin-btn-primary" onClick={() => { setError(''); setOpen(true); }}><Plus size={16}/> Create code</button></header>
    {error && !open && <p role="alert" className="auth-error-alert">{error}</p>}
    <section className="admin-panel"><div className="admin-panel-content" style={{overflowX:'auto'}}><table className="admin-table"><thead><tr><th>Code</th><th>Applies to</th><th>Discount</th><th>Uses</th><th>Expires (UTC)</th><th>Status</th><th>Actions</th></tr></thead><tbody>{promoCodes.map(promo => <tr key={promo.id}><td><strong>{promo.code}</strong></td><td>{promo.type === 'free_shipping' || promo.target === 'shipping' ? 'Shipping' : 'Products'}</td><td>{promo.type === 'free_shipping' ? 'Free shipping' : promo.type === 'percentage' ? (promo.percentageBps == null ? promo.discount : promo.percentageBps / 100) + '%' : promo.currency && promo.amountMinor != null ? formatMoney(promo.amountMinor, promo.currency) + ' ' + promo.currency : 'Needs currency and amount: replace this legacy code'}</td><td>{promo.uses}{promo.maxUses ? ' / ' + promo.maxUses : ' / unlimited'}{promo.reservedUses ? ' (' + promo.reservedUses + ' pending payments)' : ''}</td><td>{promo.expiry ? (Number.isFinite(Date.parse(promo.expiry)) ? new Date(promo.expiry).toISOString().slice(0,10) : 'Invalid expiry') : 'No expiry'}</td><td><button className={'admin-toggle-btn ' + (promo.active ? 'active' : '')} disabled={busy} onClick={() => { void action(() => togglePromoCode(promo.id)); }}>{promo.active ? 'Enabled' : 'Disabled'}</button></td><td><button disabled={busy} title="Delete code" aria-label={'Delete ' + promo.code} className="text-danger" onClick={() => { if (window.confirm('Delete ' + promo.code + '? Existing paid orders keep their agreed prices.')) void action(() => deletePromoCode(promo.id)); }}><Trash2 size={16}/></button></td></tr>)}</tbody></table>{!promoCodes.length && <p>No discount codes yet.</p>}</div></section>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title="Create discount code"><form className="admin-form" onSubmit={submit}>
      {error && <p role="alert" className="auth-error-alert">{error}</p>}
      <div className="admin-form-group"><label htmlFor="coupon-code">Code</label><input id="coupon-code" required minLength={2} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,39}" value={form.code} onChange={event => setForm({...form, code:event.target.value})} placeholder="WELCOME10"/></div>
      <div className="admin-form-group"><label htmlFor="coupon-type">Discount type</label><select id="coupon-type" value={form.type} onChange={event => setForm({...form, type:event.target.value})}><option value="percentage">Percentage</option><option value="fixed">Fixed amount in one currency</option><option value="free_shipping">Free shipping</option></select></div>
      {form.type !== 'free_shipping' && <><div className="admin-form-group"><label htmlFor="coupon-target">Applies to</label><select id="coupon-target" value={form.target} onChange={event => setForm({...form,target:event.target.value})}><option value="items">Product subtotal (before tax)</option><option value="shipping">Shipping charge only</option></select></div>{form.type === 'fixed' && <div className="admin-form-group"><label htmlFor="coupon-currency">Currency</label><select id="coupon-currency" value={form.currency} onChange={event => setForm({...form,currency:event.target.value})}>{SUPPORTED_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}</select><small>Valid only when checkout uses this currency. Amounts are never converted.</small></div>}<div className="admin-form-group"><label htmlFor="coupon-value">{form.type === 'percentage' ? 'Percentage off' : 'Amount off (' + form.currency + ')'}</label><input id="coupon-value" required type="number" min={form.type === 'fixed' && form.currency === 'JPY' ? 1 : 0.01} max={form.type === 'percentage' ? 100 : undefined} step={form.type === 'fixed' && form.currency === 'JPY' ? 1 : 0.01} value={form.discount} onChange={event => setForm({...form,discount:event.target.value})}/></div></>}
      <p>Shipping discounts reduce only the shipping charge after any free-shipping threshold. They cannot exceed that charge. Tax continues to follow the existing store tax rules.</p>
      <div className="admin-form-group"><label htmlFor="coupon-limit">Maximum completed uses (optional)</label><input id="coupon-limit" type="number" min={1} step={1} value={form.maxUses} onChange={event => setForm({...form,maxUses:event.target.value})}/></div>
      <div className="admin-form-group"><label htmlFor="coupon-expiry">Expiry date (optional, through end of day UTC)</label><input id="coupon-expiry" type="date" value={form.expiry} onChange={event => setForm({...form,expiry:event.target.value})}/></div>
      <div className="admin-form-actions"><button type="button" disabled={busy} className="admin-btn admin-btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button disabled={busy} className="admin-btn admin-btn-primary" type="submit">{busy ? 'Saving...' : 'Create code'}</button></div>
    </form></Modal>
  </div>;
}
