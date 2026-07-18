import { useState, useMemo, useCallback, useRef } from "react";
import { useAdmin, type Order, type OrderStatus } from "../AdminContext";
import {
  Search, Eye, Filter, Download, ChevronDown, ChevronUp,
  Package, Clock, CheckCircle, Truck, XCircle, RotateCcw, RefreshCw,
  AlertCircle, X, Bell, ShoppingBag, TrendingUp,
  Calendar, DollarSign, Users, Printer, Mail, MessageSquare, Phone,
  FileText, Copy, Trash2, Check, ChevronLeft, ChevronRight,
  MapPin, Star, Save, Edit3,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortKey = "date_desc" | "date_asc" | "total_desc" | "total_asc" | "id_asc";
type ViewMode = "list" | "detail";
type TabKey = "overview" | "items" | "timeline" | "notes";

interface ActivityLog {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  note?: string;
}

// ─── Status Config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; group: string }> = {
  pending:            { label: "Pending",            color: "#92400e", bg: "#fef3c7", icon: <Clock size={11} />,         group: "active" },
  confirmed:          { label: "Confirmed",          color: "#1e40af", bg: "#dbeafe", icon: <CheckCircle size={11} />,   group: "active" },
  processing:         { label: "Processing",         color: "#5b21b6", bg: "#ede9fe", icon: <RefreshCw size={11} />,     group: "active" },
  quality_check:      { label: "Quality Check",      color: "#0f766e", bg: "#ccfbf1", icon: <Star size={11} />,          group: "active" },
  packed:             { label: "Packed",             color: "#0369a1", bg: "#e0f2fe", icon: <Package size={11} />,       group: "active" },
  ready_for_shipment: { label: "Ready to Ship",      color: "#0c4a6e", bg: "#bae6fd", icon: <Package size={11} />,       group: "active" },
  shipped:            { label: "Shipped",            color: "#1d4ed8", bg: "#bfdbfe", icon: <Truck size={11} />,         group: "transit" },
  out_for_delivery:   { label: "Out for Delivery",   color: "#0369a1", bg: "#e0f2fe", icon: <Truck size={11} />,         group: "transit" },
  delivered:          { label: "Delivered",          color: "#15803d", bg: "#dcfce7", icon: <CheckCircle size={11} />,   group: "complete" },
  cancelled:          { label: "Cancelled",          color: "#6b7280", bg: "#f3f4f6", icon: <XCircle size={11} />,       group: "problem" },
  refunded:           { label: "Refunded",           color: "#6b7280", bg: "#f3f4f6", icon: <RotateCcw size={11} />,     group: "problem" },
};

const STATUS_WORKFLOW = [
  "pending","confirmed","processing","quality_check","packed",
  "ready_for_shipment","shipped","out_for_delivery","delivered",
];

function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, color: "#6b7280", bg: "#f3f4f6", icon: <Package size={11} />, group: "other" };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return `€${amount.toFixed(2)}`;
}

function fmtDate(dateStr: string, includeTime = false) {
  try {
    const d = new Date(dateStr);
    if (includeTime) {
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
        + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return dateStr; }
}

function generateLogs(order: Order): ActivityLog[] {
  const t = new Date(order.date).getTime();
  const logs: ActivityLog[] = [
    { id: 1, timestamp: order.date, action: "Order Created", user: "System", note: "Order placed by customer" },
    { id: 2, timestamp: new Date(t + 3_600_000).toISOString(), action: "Payment Received", user: "System", note: "Payment confirmed" },
  ];
  if (!["pending","awaiting_payment","payment_failed"].includes(order.status)) {
    logs.push({ id: 3, timestamp: new Date(t + 7_200_000).toISOString(), action: "Order Confirmed", user: "Admin" });
  }
  if (["packed","ready_for_shipment","shipped","out_for_delivery","delivered"].includes(order.status)) {
    logs.push({ id: 4, timestamp: new Date(t + 28_800_000).toISOString(), action: "Order Packed", user: "Warehouse" });
  }
  if (["shipped","out_for_delivery","delivered"].includes(order.status)) {
    logs.push({ id: 5, timestamp: new Date(t + 86_400_000).toISOString(), action: "Shipped", user: "Warehouse", note: "Dispatched via DHL Express" });
  }
  if (["out_for_delivery","delivered"].includes(order.status)) {
    logs.push({ id: 6, timestamp: new Date(t + 172_800_000).toISOString(), action: "Out for Delivery", user: "Courier" });
  }
  if (order.status === "delivered") {
    logs.push({ id: 7, timestamp: new Date(t + 259_200_000).toISOString(), action: "Delivered", user: "Courier", note: "Delivered successfully" });
  }
  if (order.notes) {
    logs.push({ id: 8, timestamp: new Date().toISOString(), action: "Internal Note Added", user: "Admin", note: order.notes });
  }
  return logs.reverse();
}

// ─── Reusable Components ─────────────────────────────────────────────────────

function StatusBadge({ status, size = "sm" }: { status: string; size?: "xs" | "sm" | "md" }) {
  const cfg = getStatusCfg(status);
  const px = size === "xs" ? "4px 8px" : size === "sm" ? "4px 10px" : "6px 14px";
  const fs = size === "xs" ? "10px" : size === "sm" ? "11px" : "12px";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: px,
      backgroundColor: cfg.bg, color: cfg.color,
      borderRadius: 6, fontSize: fs, fontWeight: 600, letterSpacing: "0.02em", whiteSpace: "nowrap",
    }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, icon, accent }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; accent?: string;
}) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12,
      padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#888" }}>{label}</span>
        <span style={{ width: 30, height: 30, background: accent ? `${accent}18` : "#f3f4f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: accent ?? "#666" }}>
          {icon}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: "#111", lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onCancel, danger = false, confirmLabel = "Confirm" }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
  danger?: boolean; confirmLabel?: string;
}) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "28px", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: danger ? "#fee2e2" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          {danger ? <XCircle size={22} color="#dc2626" /> : <AlertCircle size={22} color="#555" />}
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", border: "1px solid #ddd", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 14 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: danger ? "#ef4444" : "#111", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Change Modal ──────────────────────────────────────────────────────

function StatusChangeModal({ order, onConfirm, onCancel, updateOrderStatus }: {
  order: Order; onConfirm: () => void; onCancel: () => void;
  updateOrderStatus: (id: string, s: OrderStatus) => void;
}) {
  const [selected, setSelected] = useState<string>(order.status);
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 540, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden" }}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Change Order Status</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>{order.id} · {order.customer}</p>
          </div>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "55vh", overflowY: "auto" }}>
          {/* Current → New */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fafafa", borderRadius: 10, border: "1px solid #eee" }}>
            <StatusBadge status={order.status} size="sm" />
            <span style={{ fontSize: 13, color: "#aaa" }}>→</span>
            <StatusBadge status={selected} size="sm" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#555", marginBottom: 10 }}>Select New Status</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} onClick={() => setSelected(key)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                  border: selected === key ? "2px solid #111" : "1px solid #e8e8e8",
                  borderRadius: 8, background: selected === key ? "#f9f9f9" : "#fff",
                  cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#333", flex: 1 }}>{cfg.label}</span>
                  {selected === key && <Check size={12} color="#111" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#555", marginBottom: 8 }}>Internal Note (Optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note about this status change..." rows={3}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#555" }}>Customer Notification</p>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div onClick={() => setSendEmail(!sendEmail)} style={{ width: 36, height: 20, borderRadius: 10, background: sendEmail ? "#111" : "#ddd", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sendEmail ? 19 : 3, transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 13, color: "#333" }}>Send email notification to customer</span>
            </label>
          </div>
        </div>
        <div style={{ padding: "18px 26px", borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", border: "1px solid #ddd", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 14 }}>Cancel</button>
          <button onClick={() => { updateOrderStatus(order.id, selected as OrderStatus); onConfirm(); }}
            style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: "#111", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Premium Invoice ─────────────────────────────────────────────────────────

function printInvoice(order: Order) {
  const win = window.open("", "_blank", "width=860,height=1050");
  if (!win) return;
  const invNum = order.invoiceNumber ?? `INV-${order.id}`;
  const itemsHTML = order.items.map(i => `
    <tr>
      <td><strong>${i.productName}</strong><br/><span class="muted">SKU: VST-${String(i.productId).padStart(4,'0')}</span></td>
      <td class="center">${i.size !== 'OS' ? i.size : '—'}${i.color ? ` / ${i.color}` : ''}</td>
      <td class="center">${i.quantity}</td>
      <td class="right">€${i.price.toFixed(2)}</td>
      <td class="right"><strong>€${(i.price * i.quantity).toFixed(2)}</strong></td>
    </tr>`).join('');
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#111;font-size:13px;line-height:1.5;}
    .page{max-width:780px;margin:0 auto;padding:48px 52px;}
    /* Header */
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:32px;border-bottom:2px solid #111;margin-bottom:36px;}
    .brand-name{font-size:26px;font-weight:700;letter-spacing:0.12em;}
    .brand-sub{font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#888;margin-top:4px;}
    .inv-block{text-align:right;}
    .inv-title{font-size:30px;font-weight:300;letter-spacing:0.08em;color:#555;}
    .inv-num{font-size:13px;font-weight:600;color:#111;margin-top:6px;letter-spacing:0.04em;}
    .inv-meta{font-size:11px;color:#888;margin-top:3px;}
    /* Addresses */
    .address-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:28px;margin-bottom:36px;}
    .addr-block{}
    .addr-label{font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#aaa;margin-bottom:8px;display:block;}
    .addr-name{font-size:13px;font-weight:600;margin-bottom:2px;}
    .addr-line{font-size:12px;color:#555;line-height:1.6;}
    /* Status badge */
    .status-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:#dcfce7;color:#15803d;}
    /* Table */
    .items-section{margin-bottom:28px;}
    .items-section h2{font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#aaa;margin-bottom:12px;}
    table{width:100%;border-collapse:collapse;}
    thead tr{background:#f8f8f8;}
    th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;border-bottom:1px solid #e5e5e5;}
    td{padding:13px 14px;border-bottom:1px solid #f0f0f0;vertical-align:top;}
    tr:last-child td{border-bottom:none;}
    .center{text-align:center;}
    .right{text-align:right;}
    .muted{color:#888;font-size:11px;}
    /* Totals */
    .totals{margin-left:auto;width:260px;}
    .totals-inner{border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;margin-top:24px;}
    .t-row{display:flex;justify-content:space-between;padding:9px 16px;font-size:12px;}
    .t-row:not(:last-child){border-bottom:1px solid #f0f0f0;}
    .t-row.sub{color:#555;}
    .t-row.grand{background:#111;color:#fff;font-weight:700;font-size:14px;}
    /* Divider */
    .divider{border:none;border-top:1px solid #eee;margin:28px 0;}
    /* Bank/payment */
    .payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:28px;}
    .pay-label{font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#aaa;margin-bottom:6px;display:block;}
    .pay-val{font-size:12px;color:#333;font-weight:500;}
    /* Footer */
    .footer{margin-top:48px;padding-top:20px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;}
    .footer-left{font-size:10px;color:#888;line-height:1.7;}
    .footer-right{font-size:10px;color:#aaa;text-align:right;}
    @media print{.page{padding:30px 36px;} body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-name">VESTIGIA</div>
      <div class="brand-sub">Designed in Italy &middot; Made in Sri Lanka</div>
    </div>
    <div class="inv-block">
      <div class="inv-title">INVOICE</div>
      <div class="inv-num">${invNum}</div>
      <div class="inv-meta">Order: ${order.id}</div>
      <div class="inv-meta">Date: ${fmtDate(order.date)}</div>
      <div class="inv-meta" style="margin-top:6px;"><span class="status-badge">${getStatusCfg(order.status).label}</span></div>
    </div>
  </div>

  <!-- Addresses -->
  <div class="address-row">
    <div class="addr-block">
      <span class="addr-label">From</span>
      <div class="addr-name">VESTIGIA Ltd.</div>
      <div class="addr-line">Colombo 07, Sri Lanka<br/>support@vestigia.com<br/>+94 11 000 0000</div>
    </div>
    <div class="addr-block">
      <span class="addr-label">Bill To</span>
      <div class="addr-name">${order.customer}</div>
      <div class="addr-line">${order.email}${order.phone ? '<br/>'+order.phone : ''}</div>
    </div>
    <div class="addr-block">
      <span class="addr-label">Ship To</span>
      <div class="addr-line">${order.address.replace(/,/g, ',<br/>')}</div>
    </div>
  </div>

  <!-- Items -->
  <div class="items-section">
    <h2>Order Items</h2>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th class="center">Variant</th>
          <th class="center">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals">
    <div class="totals-inner">
      <div class="t-row sub"><span>Subtotal</span><span>€${order.subtotal.toFixed(2)}</span></div>
      <div class="t-row sub"><span>Shipping</span><span>${order.shipping === 0 ? 'Free' : '€'+order.shipping.toFixed(2)}</span></div>
      <div class="t-row sub"><span>Tax (VAT)</span><span>€${order.tax.toFixed(2)}</span></div>
      <div class="t-row grand"><span>Total Due</span><span>€${order.total.toFixed(2)}</span></div>
    </div>
  </div>

  <hr class="divider" />

  <!-- Payment Info -->
  <div class="payment-grid">
    <div>
      <span class="pay-label">Payment Method</span>
      <div class="pay-val">Credit Card</div>
    </div>
    <div>
      <span class="pay-label">Transaction ID</span>
      <div class="pay-val" style="font-family:monospace;">TXN-${order.id.slice(-8).toUpperCase()}</div>
    </div>
    <div>
      <span class="pay-label">Payment Date</span>
      <div class="pay-val">${fmtDate(order.date)}</div>
    </div>
    <div>
      <span class="pay-label">Payment Status</span>
      <div class="pay-val" style="color:#15803d;font-weight:600;">Paid</div>
    </div>
  </div>

  ${order.notes ? `<div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:14px 16px;margin-bottom:28px;"><span class="pay-label">Internal Note</span><div class="addr-line">${order.notes}</div></div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      VESTIGIA Ltd. &middot; Colombo 07, Sri Lanka<br/>
      support@vestigia.com &middot; www.vestigia.com<br/>
      VAT Reg: LK 000-000-0000
    </div>
    <div class="footer-right">
      Thank you for your order.<br/>
      This is a computer-generated invoice.
    </div>
  </div>
</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

// ─── Premium Packing Slip ─────────────────────────────────────────────────────

function printPackingSlip(order: Order) {
  const win = window.open("", "_blank", "width=680,height=820");
  if (!win) return;
  const itemsHTML = order.items.map((i, idx) => `
    <tr>
      <td style="padding:4px 0;">
        <input type="checkbox" style="margin-right:8px;" />
        <strong>${i.productName}</strong>
      </td>
      <td style="text-align:center;padding:4px 8px;">${i.size !== 'OS' ? i.size : '—'}${i.color ? ' / '+i.color : ''}</td>
      <td style="text-align:center;padding:4px 8px;font-weight:700;font-size:15px;">${i.quantity}</td>
      <td style="text-align:center;padding:4px 8px;">
        <span style="display:inline-block;width:18px;height:18px;border:2px solid #111;border-radius:3px;"></span>
      </td>
    </tr>`).join('');
  const barcodeLines = order.id.split('').map((c,i)=>`<div style="display:inline-block;width:${(i%3===0?3:2)}px;height:48px;background:#111;margin-right:1px;"></div>`).join('');
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Packing Slip — ${order.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Inter',sans-serif;color:#111;font-size:13px;line-height:1.5;}
    .page{max-width:640px;margin:0 auto;padding:32px 36px;}
    .top-bar{background:#111;color:#fff;padding:14px 20px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;}
    .top-bar-brand{font-size:16px;font-weight:700;letter-spacing:0.12em;}
    .top-bar-doc{font-size:11px;color:#aaa;letter-spacing:0.08em;text-transform:uppercase;}
    .section{margin-bottom:20px;}
    .section-title{font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#aaa;margin-bottom:8px;}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#f9f9f9;border-radius:8px;padding:16px;border:1px solid #eee;margin-bottom:20px;}
    .info-item label{font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#aaa;display:block;margin-bottom:3px;}
    .info-item p{font-size:12px;font-weight:500;color:#111;}
    .ship-box{background:#fff;border:2px solid #111;border-radius:10px;padding:16px 20px;margin-bottom:20px;}
    .ship-to-label{font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#888;margin-bottom:6px;}
    .ship-to-name{font-size:16px;font-weight:700;margin-bottom:4px;}
    .ship-to-addr{font-size:13px;color:#555;line-height:1.6;}
    table{width:100%;border-collapse:collapse;}
    thead tr{background:#111;color:#fff;border-radius:6px;}
    th{padding:9px 12px;text-align:left;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;}
    td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;vertical-align:middle;}
    tr:last-child td{border-bottom:none;}
    .barcode-section{margin-top:24px;text-align:center;padding:20px;background:#f9f9f9;border:1px dashed #ddd;border-radius:8px;}
    .barcode-label{font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.25em;color:#111;margin-bottom:10px;}
    .return-note{margin-top:20px;padding:12px 16px;background:#fffbf0;border:1px solid #fde68a;border-radius:8px;font-size:11px;color:#92400e;line-height:1.6;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="top-bar">
    <div>
      <div class="top-bar-brand">VESTIGIA</div>
      <div class="top-bar-doc">Packing Slip</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:15px;font-weight:700;letter-spacing:0.05em;">${order.id}</div>
      <div style="font-size:11px;color:#aaa;margin-top:2px;">${fmtDate(order.date)}</div>
    </div>
  </div>

  <!-- Order Meta -->
  <div class="info-grid">
    <div class="info-item"><label>Order Number</label><p>${order.id}</p></div>
    <div class="info-item"><label>Invoice Number</label><p>${order.invoiceNumber ?? '—'}</p></div>
    <div class="info-item"><label>Order Date</label><p>${fmtDate(order.date, true)}</p></div>
    <div class="info-item"><label>Items Count</label><p>${order.items.reduce((s,i)=>s+i.quantity,0)} piece(s)</p></div>
    ${order.courier ? `<div class="info-item"><label>Courier</label><p>${order.courier}</p></div>` : ''}
    ${order.trackingNumber ? `<div class="info-item"><label>Tracking #</label><p style="font-family:monospace;">${order.trackingNumber}</p></div>` : ''}
  </div>

  <!-- Ship To -->
  <div class="ship-box">
    <div class="ship-to-label">&#x25B6; Ship To</div>
    <div class="ship-to-name">${order.customer}</div>
    <div class="ship-to-addr">${order.address.replace(/,\s*/g, '<br/>')}</div>
    ${order.phone ? `<div style="margin-top:8px;font-size:12px;color:#555;">&#x260E; ${order.phone}</div>` : ''}
  </div>

  <!-- Items Checklist -->
  <div class="section">
    <div class="section-title">Items Checklist — Please verify before sealing</div>
    <table>
      <thead>
        <tr>
          <th style="width:50%;">Item</th>
          <th style="text-align:center;width:20%;">Variant</th>
          <th style="text-align:center;width:12%;">Qty</th>
          <th style="text-align:center;width:18%;">Packed ✓</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>
  </div>

  <!-- Barcode Simulation -->
  <div class="barcode-section">
    <div class="barcode-label">${order.id}</div>
    <div style="display:flex;justify-content:center;align-items:flex-end;gap:1px;margin-bottom:6px;">
      ${barcodeLines}
    </div>
    <div style="font-size:10px;color:#888;margin-top:4px;">Scan to verify order</div>
  </div>

  <!-- Return Note -->
  <div class="return-note">
    <strong>Returns &amp; Exchanges:</strong> If you need to return or exchange any item, please contact us within 14 days of delivery at support@vestigia.com. Include your order number and a brief reason. Items must be unworn, in original packaging.
  </div>

  <div style="margin-top:20px;text-align:center;font-size:10px;color:#aaa;">
    VESTIGIA &middot; Designed in Italy &middot; Made in Sri Lanka &middot; www.vestigia.com
  </div>
</div>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

function exportOrdersCSV(orders: Order[]) {
  const headers = ["Order ID", "Date", "Customer", "Email", "Status", "Subtotal", "Shipping", "Tax", "Total", "Address", "Items"];
  const rows = orders.map(o => [
    o.id,
    fmtDate(o.date),
    o.customer,
    o.email,
    getStatusCfg(o.status).label,
    o.subtotal.toFixed(2),
    o.shipping.toFixed(2),
    o.tax.toFixed(2),
    o.total.toFixed(2),
    `"${o.address.replace(/"/g, '""')}"`,
    `"${o.items.map(i => `${i.productName} x${i.quantity}`).join("; ")}"`,
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `vestigia-orders-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Order Detail View ────────────────────────────────────────────────────────

function OrderDetail({ order, onBack, onStatusChange, updateOrderNotes, updateOrderShipping, onDelete, onDuplicate, onRefund }: {
  order: Order;
  onBack: () => void;
  onStatusChange: (o: Order) => void;
  updateOrderNotes: (id: string, notes: string) => void;
  updateOrderShipping: (id: string, data: { trackingNumber?: string; courier?: string; phone?: string }) => void;
  onDelete: (o: Order) => void;
  onDuplicate: (o: Order) => void;
  onRefund: (o: Order) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [noteText, setNoteText] = useState(order.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [courier, setCourier] = useState(order.courier ?? "");
  const [phone, setPhone] = useState(order.phone ?? "");
  const [shippingSaved, setShippingSaved] = useState(false);
  const logs = useMemo(() => generateLogs(order), [order]);
  const workflowIdx = STATUS_WORKFLOW.indexOf(order.status);

  const saveNote = () => {
    updateOrderNotes(order.id, noteText);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2500);
  };

  const saveShipping = () => {
    updateOrderShipping(order.id, { trackingNumber: tracking || undefined, courier: courier || undefined, phone: phone || undefined });
    setShippingSaved(true);
    setTimeout(() => setShippingSaved(false), 2500);
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "items", label: `Items (${order.items.length})` },
    { key: "timeline", label: "Timeline" },
    { key: "notes", label: "Notes & Shipping" },
  ];

  return (
    <div>
      {/* Back + Header */}
      <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555", background: "none", border: "none", cursor: "pointer", padding: "6px 0", marginBottom: 16, fontWeight: 500 }}>
        <ChevronLeft size={16} /> Back to Orders
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Order {order.id}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={order.status} size="md" />
            <span style={{ fontSize: 13, color: "#888" }}>{fmtDate(order.date, true)}</span>
            {order.invoiceNumber && <span style={{ fontSize: 12, color: "#aaa", fontFamily: "monospace" }}>· {order.invoiceNumber}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onStatusChange(order)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            <RefreshCw size={14} /> Change Status
          </button>
          <button onClick={() => printInvoice(order)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 13 }}>
            <Printer size={14} /> Invoice
          </button>
          <button onClick={() => printPackingSlip(order)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 13 }}>
            <FileText size={14} /> Packing Slip
          </button>
          <button onClick={() => onDuplicate(order)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#fff", color: "#333", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 13 }}>
            <Copy size={14} /> Duplicate
          </button>
          <button onClick={() => onDelete(order)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer", fontWeight: 500, fontSize: 13 }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Workflow Progress */}
      {workflowIdx >= 0 && (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: "18px 22px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#888" }}>Order Progress</p>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#e5e5e5", transform: "translateY(-50%)", zIndex: 0 }} />
            <div style={{ position: "absolute", top: "50%", left: 0, width: `${(workflowIdx / (STATUS_WORKFLOW.length - 1)) * 100}%`, height: 2, background: "#111", transform: "translateY(-50%)", transition: "width 0.4s ease", zIndex: 1 }} />
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
              {STATUS_WORKFLOW.map((s, i) => {
                const done = i <= workflowIdx;
                return (
                  <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? "#111" : "#fff", border: `2px solid ${done ? "#111" : "#ddd"}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                      {done && <Check size={11} color="#fff" />}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: done ? "#111" : "#aaa", whiteSpace: "nowrap" }}>
                      {getStatusCfg(s).label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #eee", marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "10px 18px", background: "none", border: "none", cursor: "pointer",
            fontWeight: activeTab === t.key ? 600 : 400, fontSize: 14,
            color: activeTab === t.key ? "#111" : "#888",
            borderBottom: activeTab === t.key ? "2px solid #111" : "2px solid transparent",
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Customer */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Customer</h3>
                <Users size={15} color="#888" />
              </div>
              <div style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 16 }}>
                    {order.customer.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{order.customer}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{order.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`mailto:${order.email}`} style={{ flex: 1, padding: "8px 0", border: "1px solid #eee", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, color: "#333", textDecoration: "none" }}>
                    <Mail size={13} /> Email
                  </a>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`Order ${order.id} update`)}`} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "8px 0", border: "1px solid #eee", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, color: "#25D366", textDecoration: "none" }}>
                    <MessageSquare size={13} /> WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Shipping</h3>
                <MapPin size={15} color="#888" />
              </div>
              <div style={{ padding: "20px" }}>
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "#333", lineHeight: 1.7 }}>{order.address || "—"}</p>
                {order.phone && <p style={{ margin: "0 0 14px", fontSize: 13, color: "#555" }}>📞 {order.phone}</p>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Courier", value: order.courier || "—" },
                    { label: "Tracking #", value: order.trackingNumber || "—", mono: true },
                    { label: "Est. Delivery", value: "3–5 days" },
                  ].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: "#333", fontFamily: (r as any).mono ? "monospace" : "inherit" }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payment */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Payment</h3>
                <DollarSign size={15} color="#888" />
              </div>
              <div style={{ padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Invoice #", value: order.invoiceNumber || "—" },
                    { label: "Method", value: "Credit Card" },
                    { label: "Status", value: <StatusBadge status="confirmed" size="xs" /> },
                    { label: "Transaction ID", value: "TXN-" + order.id.slice(-8) },
                    { label: "Payment Date", value: fmtDate(order.date) },
                    { label: "Order Number", value: order.id },
                  ].map((r, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 10, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{r.label}</div>
                      <div style={{ fontSize: 13, color: "#333" }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right — Order Summary + Quick Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee" }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Order Summary</h3>
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: i < order.items.length - 1 ? "1px solid #f5f5f5" : "none", display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 38, height: 48, borderRadius: 6, overflow: "hidden", background: "#f5f5f5", flexShrink: 0 }}>
                      {item.image ? <img src={item.image} alt={item.productName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Package size={14} color="#ccc" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.productName}</div>
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{item.size !== "OS" && `S:${item.size}`}{item.color && ` C:${item.color}`}</div>
                      <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{item.quantity} × {fmt(item.price)}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111", flexShrink: 0 }}>{fmt(item.quantity * item.price)}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 16px", background: "#fafafa", borderTop: "1px solid #eee" }}>
                {[{ label: "Subtotal", val: order.subtotal }, { label: "Shipping", val: order.shipping }, { label: "Tax", val: order.tax }].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555", marginBottom: 6 }}>
                    <span>{r.label}</span>
                    <span>{r.val === 0 && r.label === "Shipping" ? "Free" : fmt(r.val)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "#111", paddingTop: 10, borderTop: "1px solid #e5e5e5", marginTop: 4 }}>
                  <span>Total</span><span>{fmt(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee" }}>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Quick Actions</h3>
              </div>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { icon: <Printer size={13} />, label: "Print Invoice", action: () => printInvoice(order) },
                  { icon: <FileText size={13} />, label: "Print Packing Slip", action: () => printPackingSlip(order) },
                  { icon: <Copy size={13} />, label: "Duplicate Order", action: () => onDuplicate(order) },
                  { icon: <Mail size={13} />, label: "Email Customer", action: () => window.location.href = `mailto:${order.email}?subject=Regarding Order ${order.id}` },
                  { icon: <XCircle size={13} />, label: order.status === "cancelled" ? "Cancelled" : "Cancel Order", danger: order.status !== "cancelled" && order.status !== "refunded", disabled: order.status === "cancelled" || order.status === "refunded", action: () => onStatusChange({ ...order, status: "cancelled" as OrderStatus }) },
                  { icon: <RotateCcw size={13} />, label: order.status === "refunded" ? "Already Refunded" : "Issue Refund", danger: order.status !== "refunded", disabled: order.status === "refunded", action: () => onRefund(order) },
                  { icon: <Trash2 size={13} />, label: "Delete Order", danger: true, action: () => onDelete(order) },
                ].map((a, i) => (
                  <button key={i} onClick={a.action} disabled={a.disabled} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    border: "1px solid #eee", borderRadius: 8, background: a.disabled ? "#f9f9f9" : "#fff",
                    cursor: a.disabled ? "not-allowed" : "pointer", fontWeight: 500, fontSize: 12, 
                    color: a.disabled ? "#aaa" : (a as any).danger ? "#dc2626" : "#333",
                    textAlign: "left", width: "100%", opacity: a.disabled ? 0.6 : 1,
                  }}>
                    <span style={{ color: a.disabled ? "#ccc" : (a as any).danger ? "#dc2626" : "#666" }}>{a.icon}</span>{a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === "items" && (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Product", "SKU", "Variant", "Qty", "Unit Price", "Total"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#888", borderBottom: "1px solid #eee" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ padding: "14px 20px", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 46, borderRadius: 6, overflow: "hidden", background: "#f5f5f5", flexShrink: 0 }}>
                        {item.image ? <img src={item.image} alt={item.productName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Package size={14} color="#ccc" />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.productName}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 11, color: "#888", borderBottom: "1px solid #f5f5f5", fontFamily: "monospace" }}>VST-{item.productId.toString().padStart(4, "0")}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#555", borderBottom: "1px solid #f5f5f5" }}>
                    {item.size !== "OS" && <span style={{ marginRight: 6 }}>S:{item.size}</span>}
                    {item.color && <span>C:{item.color}</span>}
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, borderBottom: "1px solid #f5f5f5" }}>{item.quantity}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, color: "#555", borderBottom: "1px solid #f5f5f5" }}>{fmt(item.price)}</td>
                  <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #f5f5f5" }}>{fmt(item.quantity * item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === "timeline" && (
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "24px" }}>
          <div style={{ position: "relative", paddingLeft: 28 }}>
            <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "#e5e5e5" }} />
            {logs.map((log, i) => (
              <div key={log.id} style={{ position: "relative", marginBottom: i < logs.length - 1 ? 22 : 0 }}>
                <div style={{ position: "absolute", left: -28, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#111", border: "2px solid #fff", boxShadow: "0 0 0 2px #111" }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{log.action}</div>
                {log.note && <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{log.note}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 3, fontSize: 11, color: "#aaa" }}>
                  <span>{fmtDate(log.timestamp, true)}</span>
                  <span>·</span><span>{log.user}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes & Shipping Tab */}
      {activeTab === "notes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Shipping & Contact */}
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Shipping & Contact</h3>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#888" }}>Set courier, tracking number and customer phone</p>
              </div>
              <Truck size={15} color="#888" />
            </div>
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {[
                { label: "Courier / Carrier", value: courier, setter: setCourier, placeholder: "e.g. DHL Express" },
                { label: "Tracking Number", value: tracking, setter: setTracking, placeholder: "e.g. 1Z999AA10123456784" },
                { label: "Customer Phone", value: phone, setter: setPhone, placeholder: "+1 555 000 0000" },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#555", marginBottom: 6 }}>{f.label}</label>
                  <input
                    type="text" value={f.value} onChange={e => { f.setter(e.target.value); setShippingSaved(false); }}
                    placeholder={f.placeholder}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
              {shippingSaved && (
                <span style={{ fontSize: 13, color: "#16a34a", display: "flex", alignItems: "center", gap: 5 }}>
                  <Check size={14} /> Saved
                </span>
              )}
              <button onClick={saveShipping} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                <Save size={14} /> Save Shipping
              </button>
            </div>
          </div>

          {/* Internal Notes */}
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Internal Notes</h3>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#888" }}>Private notes visible only to admin staff</p>
              </div>
              <Edit3 size={15} color="#888" />
            </div>
            <div style={{ padding: "20px" }}>
              <textarea
                value={noteText}
                onChange={e => { setNoteText(e.target.value); setNoteSaved(false); }}
                placeholder="Add internal notes about this order — e.g. customer preferences, special handling instructions, follow-up tasks..."
                rows={7}
                style={{ width: "100%", padding: "14px", border: "1px solid #e5e5e5", borderRadius: 10, fontSize: 14, resize: "vertical", fontFamily: "inherit", outline: "none", lineHeight: 1.7, boxSizing: "border-box" }}
              />
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                {noteSaved && (
                  <span style={{ fontSize: 13, color: "#16a34a", display: "flex", alignItems: "center", gap: 5 }}>
                    <Check size={14} /> Saved
                  </span>
                )}
                <button onClick={saveNote} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  <Save size={14} /> Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Orders Page ─────────────────────────────────────────────────────────

export default function Orders() {
  const { orders, updateOrderStatus, updateOrderNotes, updateOrderShipping, deleteOrder, duplicateOrder } = useAdmin();

  const [view, setView] = useState<ViewMode>("list");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modals
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; action: () => void; danger?: boolean; confirmLabel?: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === "pending").length,
      processing: orders.filter(o => o.status === "processing").length,
      shipped: orders.filter(o => o.status === "shipped").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      cancelled: orders.filter(o => (o.status as string) === "cancelled").length,
      todaySales: orders.filter(o => new Date(o.date).toDateString() === today).reduce((s, o) => s + o.total, 0),
      monthRevenue: orders.filter(o => {
        const d = new Date(o.date); const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((s, o) => s + o.total, 0),
    };
  }, [orders]);

  // ── Filtered Orders ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...orders];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter(o => (o.status as string) === statusFilter);
    if (dateFrom) list = list.filter(o => new Date(o.date) >= new Date(dateFrom));
    if (dateTo) list = list.filter(o => new Date(o.date) <= new Date(dateTo + "T23:59:59"));
    list.sort((a, b) => {
      if (sortKey === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortKey === "date_asc")  return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortKey === "total_desc") return b.total - a.total;
      if (sortKey === "total_asc")  return a.total - b.total;
      return a.id.localeCompare(b.id);
    });
    return list;
  }, [orders, search, statusFilter, sortKey, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Bulk ──────────────────────────────────────────────────────────────────

  const toggleRow = useCallback((id: string) => {
    setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedRows(prev => prev.size === paginated.length ? new Set() : new Set(paginated.map(o => o.id)));
  }, [paginated]);

  const selectedOrders = useMemo(() => orders.filter(o => selectedRows.has(o.id)), [orders, selectedRows]);

  const handleBulkExportCSV = () => {
    exportOrdersCSV(selectedOrders.length > 0 ? selectedOrders : filtered);
    showToast(`Exported ${selectedOrders.length > 0 ? selectedOrders.length : filtered.length} orders to CSV`);
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      title: "Delete Selected Orders",
      message: `Delete ${selectedRows.size} order(s)? This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
      action: () => {
        selectedRows.forEach(id => deleteOrder(id));
        setSelectedRows(new Set());
        setConfirmModal(null);
        showToast("Orders deleted");
      },
    });
  };

  const handleBulkPrint = () => {
    selectedOrders.forEach(o => printInvoice(o));
    showToast(`Printing ${selectedOrders.length} invoice(s)`);
  };

  const handleBulkEmail = () => {
    const emails = selectedOrders.map(o => o.email).filter(Boolean).join(",");
    window.location.href = `mailto:${emails}?subject=Update regarding your Vestigia order`;
    showToast("Opening email client");
  };

  // ── Order actions ─────────────────────────────────────────────────────────

  const handleDelete = (order: Order) => {
    setConfirmModal({
      title: "Delete Order",
      message: `Delete order ${order.id} for ${order.customer}? This cannot be undone.`,
      danger: true,
      confirmLabel: "Delete",
      action: () => {
        deleteOrder(order.id);
        if (view === "detail") { setView("list"); setSelectedOrder(null); }
        setConfirmModal(null);
        showToast(`Order ${order.id} deleted`);
      },
    });
  };

  const handleDuplicate = async (order: Order) => {
    showToast("Duplicating order...");
    const created = await duplicateOrder(order.id);
    if (created) {
      showToast(`Order duplicated as ${created.id}`);
    } else {
      showToast("Failed to duplicate order");
    }
  };

  const handleIssueRefund = (order: Order) => {
    const txId = order.stripePaymentIntentId || "None";
    setConfirmModal({
      title: "Confirm Stripe Refund",
      message: `Are you sure you want to issue a full refund of €${order.total.toFixed(2)} to ${order.customer}? This will trigger a live refund request to Stripe (Transaction: ${txId}) and mark the order as Refunded.`,
      danger: true,
      confirmLabel: "Confirm & Refund",
      action: async () => {
        setConfirmModal(null);
        showToast("Processing Stripe refund...");
        const result = await updateOrderStatus(order.id, "refunded");
        if (result) {
          showToast("Stripe refund processed successfully");
        } else {
          showToast("Failed to process Stripe refund");
        }
      },
    });
  };

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Keep detail view in sync when order updates in context
  const liveOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find(o => o.id === selectedOrder.id) ?? selectedOrder;
  }, [orders, selectedOrder]);

  // ── Detail View ────────────────────────────────────────────────────────────

  if (view === "detail" && liveOrder) {
    return (
      <div className="admin-page">
        <OrderDetail
          order={liveOrder}
          onBack={() => { setView("list"); setSelectedOrder(null); }}
          onStatusChange={setStatusModalOrder}
          updateOrderNotes={updateOrderNotes}
          updateOrderShipping={updateOrderShipping}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onRefund={handleIssueRefund}
        />
        {statusModalOrder && (
          <StatusChangeModal
            order={statusModalOrder}
            updateOrderStatus={updateOrderStatus}
            onConfirm={() => { setStatusModalOrder(null); showToast("Order status updated"); }}
            onCancel={() => setStatusModalOrder(null)}
          />
        )}
        {confirmModal && (
          <ConfirmModal {...confirmModal} onConfirm={confirmModal.action} onCancel={() => setConfirmModal(null)} />
        )}
        {toast && (
          <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", padding: "12px 22px", borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }}>
            {toast}
          </div>
        )}
      </div>
    );
  }

  // ── List View ──────────────────────────────────────────────────────────────

  return (
    <div className="admin-page">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 26, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ margin: "0 0 5px", fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Orders</h1>
          <p style={{ margin: 0, color: "#888", fontSize: 14 }}>Manage fulfillments, track shipments, and update order statuses.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportOrdersCSV(filtered)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "1px solid #e5e5e5", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 13, color: "#555" }}>
            <Download size={14} /> Export All CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Orders"    value={stats.total}      icon={<ShoppingBag size={14} />} accent="#111" />
        <StatCard label="Pending"         value={stats.pending}    icon={<Clock size={14} />}       accent="#d97706" />
        <StatCard label="Processing"      value={stats.processing} icon={<RefreshCw size={14} />}   accent="#7c3aed" />
        <StatCard label="Shipped"         value={stats.shipped}    icon={<Truck size={14} />}       accent="#2563eb" />
        <StatCard label="Delivered"       value={stats.delivered}  icon={<CheckCircle size={14} />} accent="#16a34a" />
        <StatCard label="Cancelled"       value={stats.cancelled}  icon={<XCircle size={14} />}     accent="#6b7280" />
        <StatCard label="Today's Sales"   value={fmt(stats.todaySales)}    icon={<DollarSign size={14} />} accent="#0ea5e9" sub="Revenue today" />
        <StatCard label="Monthly Revenue" value={fmt(stats.monthRevenue)}  icon={<TrendingUp size={14} />} accent="#10b981" sub="This month" />
      </div>

      {/* Table Panel */}
      <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

        {/* Toolbar */}
        <div style={{ padding: "14px 20px", background: "#fafafa", borderBottom: "1px solid #eee", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 220px", position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
            <input
              type="text" placeholder="Search orders, customers, addresses..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: "100%", padding: "8px 32px 8px 34px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa" }}><X size={13} /></button>}
          </div>

          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ padding: "8px 12px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", cursor: "pointer" }}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, cfg]) => <option key={k} value={k}>{cfg.label}</option>)}
          </select>

          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            style={{ padding: "8px 12px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", cursor: "pointer" }}>
            <option value="date_desc">Latest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="total_desc">Highest Total</option>
            <option value="total_asc">Lowest Total</option>
            <option value="id_asc">Order ID</option>
          </select>

          <button onClick={() => setShowFilters(!showFilters)} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
            border: showFilters ? "1px solid #111" : "1px solid #e5e5e5",
            borderRadius: 8, background: showFilters ? "#111" : "#fff",
            color: showFilters ? "#fff" : "#555", cursor: "pointer", fontWeight: 500, fontSize: 13,
          }}>
            <Filter size={13} /> Filters {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <span style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>{filtered.length} order{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div style={{ padding: "14px 20px", background: "#f9f9f9", borderBottom: "1px solid #eee", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={13} color="#888" />
              <label style={{ fontSize: 12, color: "#555", fontWeight: 500 }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, outline: "none" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#555", fontWeight: 500 }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "6px 10px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, outline: "none" }} />
            </div>
            <button onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("all"); setSearch(""); }}
              style={{ padding: "6px 14px", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, background: "#fff", cursor: "pointer", color: "#555" }}>
              Clear All
            </button>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedRows.size > 0 && (
          <div style={{ padding: "11px 20px", background: "#111", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{selectedRows.size} selected</span>
            <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
              {[
                { icon: <Printer size={13} />, label: "Print Invoices", action: handleBulkPrint },
                { icon: <Download size={13} />, label: "Export CSV", action: handleBulkExportCSV },
                { icon: <Mail size={13} />, label: "Email All", action: handleBulkEmail },
              ].map((a, i) => (
                <button key={i} onClick={a.action} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 7, background: "rgba(255,255,255,0.1)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                  {a.icon}{a.label}
                </button>
              ))}
              <button onClick={handleBulkDelete} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", border: "1px solid rgba(239,68,68,0.5)", borderRadius: 7, background: "rgba(239,68,68,0.15)", color: "#fca5a5", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th style={{ padding: "11px 16px", borderBottom: "1px solid #eee", width: 40 }}>
                  <input type="checkbox" checked={selectedRows.size === paginated.length && paginated.length > 0} onChange={toggleAll} style={{ cursor: "pointer" }} />
                </th>
                {["Order ID", "Date", "Customer", "Items", "Total", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#888", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "60px 24px", textAlign: "center" }}>
                    <Package size={36} color="#ddd" style={{ display: "block", margin: "0 auto 12px" }} />
                    <p style={{ margin: "0 0 8px", color: "#888", fontSize: 14 }}>No orders found{search ? ` for "${search}"` : ""}</p>
                    {(search || statusFilter !== "all") && (
                      <button onClick={() => { setSearch(""); setStatusFilter("all"); }} style={{ fontSize: 13, color: "#111", fontWeight: 500, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear filters</button>
                    )}
                  </td>
                </tr>
              ) : paginated.map(order => (
                <tr key={order.id}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "#fafafa"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ""}
                >
                  <td style={{ padding: "13px 16px", borderBottom: "1px solid #f5f5f5" }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedRows.has(order.id)} onChange={() => toggleRow(order.id)} style={{ cursor: "pointer" }} />
                  </td>
                  <td style={{ padding: "13px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }} onClick={() => openDetail(order)}>
                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#111" }}>{order.id}</span>
                  </td>
                  <td style={{ padding: "13px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }} onClick={() => openDetail(order)}>
                    <div style={{ fontSize: 12, color: "#555" }}>{fmtDate(order.date)}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>
                      {new Date(order.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }} onClick={() => openDetail(order)}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{order.customer}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{order.email}</div>
                  </td>
                  <td style={{ padding: "13px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }} onClick={() => openDetail(order)}>
                    <span style={{ fontSize: 13, color: "#555" }}>
                      {order.items.reduce((s, i) => s + i.quantity, 0)} item{order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }} onClick={() => openDetail(order)}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{fmt(order.total)}</span>
                  </td>
                  <td style={{ padding: "13px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer" }} onClick={() => openDetail(order)}>
                    <StatusBadge status={order.status} />
                  </td>
                  <td style={{ padding: "13px 16px", borderBottom: "1px solid #f5f5f5" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => openDetail(order)} title="View" style={{ width: 30, height: 30, border: "1px solid #e5e5e5", borderRadius: 7, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => setStatusModalOrder(order)} title="Change Status" style={{ width: 30, height: 30, border: "1px solid #e5e5e5", borderRadius: 7, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
                        <RefreshCw size={13} />
                      </button>
                      <button onClick={() => printInvoice(order)} title="Print Invoice" style={{ width: 30, height: 30, border: "1px solid #e5e5e5", borderRadius: 7, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
                        <Printer size={13} />
                      </button>
                      <button onClick={() => handleDelete(order)} title="Delete" style={{ width: 30, height: 30, border: "1px solid #fecaca", borderRadius: 7, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "13px 20px", borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
            <span style={{ fontSize: 12, color: "#888" }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 30, height: 30, border: "1px solid #e5e5e5", borderRadius: 7, background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const n = totalPages <= 7 ? i + 1 : Math.max(1, page - 3) + i;
                if (n > totalPages) return null;
                return (
                  <button key={n} onClick={() => setPage(n)} style={{ width: 30, height: 30, border: page === n ? "1px solid #111" : "1px solid #e5e5e5", borderRadius: 7, background: page === n ? "#111" : "#fff", color: page === n ? "#fff" : "#333", cursor: "pointer", fontSize: 13, fontWeight: page === n ? 600 : 400 }}>{n}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 30, height: 30, border: "1px solid #e5e5e5", borderRadius: 7, background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {statusModalOrder && (
        <StatusChangeModal
          order={statusModalOrder}
          updateOrderStatus={updateOrderStatus}
          onConfirm={() => { setStatusModalOrder(null); showToast("Order status updated"); }}
          onCancel={() => setStatusModalOrder(null)}
        />
      )}
      {confirmModal && (
        <ConfirmModal {...confirmModal} onConfirm={confirmModal.action} onCancel={() => setConfirmModal(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#111", color: "#fff", padding: "12px 22px", borderRadius: 10, fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
          <Check size={15} /> {toast}
        </div>
      )}
    </div>
  );
}
