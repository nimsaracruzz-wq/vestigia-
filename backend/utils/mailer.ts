import nodemailer from 'nodemailer';

// ─── SMTP Transporter ────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  productName: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
}

export interface OrderData {
  id: string;
  customer: string;
  email: string;
  date: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  address: string;
  items: OrderItem[];
}

// ─── Shared Design Tokens ────────────────────────────────────────────────────

const GOLD = '#c8a96e';
const GOLD_DARK = '#d4b87a';
const BG_LIGHT = '#f9f8f6';
const BG_DARK = '#0d0d0d';
const CARD_LIGHT = '#ffffff';
const CARD_DARK = '#161616';
const BORDER_LIGHT = '#e8e3da';
const BORDER_DARK = '#2a2a2a';
const TEXT_LIGHT = '#1a1a1a';
const TEXT_DARK = '#e8e3da';
const MUTED_LIGHT = '#8a8278';
const MUTED_DARK = '#8a8278';

// ─── Base Email Shell ─────────────────────────────────────────────────────────

function buildEmailBase(innerContent: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>Vestigia</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500&display=swap');

    :root {
      color-scheme: light dark;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: ${BG_LIGHT};
      color: ${TEXT_LIGHT};
      -webkit-font-smoothing: antialiased;
    }

    .email-wrapper {
      background-color: ${BG_LIGHT};
      padding: 40px 20px;
    }

    .email-card {
      background-color: ${CARD_LIGHT};
      max-width: 560px;
      margin: 0 auto;
      border: 1px solid ${BORDER_LIGHT};
    }

    .email-header {
      padding: 40px 48px 32px;
      border-bottom: 1px solid ${BORDER_LIGHT};
      text-align: center;
    }

    .brand-name {
      font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
      font-size: 28px;
      font-weight: 300;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: ${TEXT_LIGHT};
      text-decoration: none;
    }

    .brand-tagline {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: ${MUTED_LIGHT};
      margin-top: 6px;
      font-weight: 300;
    }

    .email-body {
      padding: 48px;
    }

    .section-label {
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: ${GOLD};
      margin-bottom: 16px;
    }

    .headline {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 30px;
      font-weight: 300;
      line-height: 1.25;
      color: ${TEXT_LIGHT};
      margin-bottom: 20px;
      letter-spacing: 0.02em;
    }

    .body-text {
      font-size: 14px;
      font-weight: 300;
      line-height: 1.8;
      color: ${MUTED_LIGHT};
      margin-bottom: 16px;
    }

    .divider {
      height: 1px;
      background-color: ${BORDER_LIGHT};
      margin: 32px 0;
    }

    .gold-line {
      width: 40px;
      height: 1px;
      background-color: ${GOLD};
      margin-bottom: 24px;
    }

    .btn-primary {
      display: inline-block;
      background-color: ${GOLD};
      color: #0d0d0d !important;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      text-decoration: none;
      padding: 16px 36px;
      margin: 8px 0;
    }

    .btn-ghost {
      display: inline-block;
      background-color: transparent;
      color: ${TEXT_LIGHT} !important;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      text-decoration: none;
      padding: 15px 36px;
      border: 1px solid ${BORDER_LIGHT};
      margin: 8px 0;
    }

    .otp-block {
      background-color: ${BG_LIGHT};
      border: 1px solid ${BORDER_LIGHT};
      padding: 28px;
      text-align: center;
      margin: 28px 0;
    }

    .otp-code {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 52px;
      font-weight: 300;
      letter-spacing: 0.3em;
      color: ${TEXT_LIGHT};
      line-height: 1;
    }

    .otp-label {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: ${MUTED_LIGHT};
      margin-top: 8px;
      font-weight: 300;
    }

    .order-summary {
      border: 1px solid ${BORDER_LIGHT};
      margin: 28px 0;
    }

    .order-summary-header {
      background-color: ${BG_LIGHT};
      padding: 14px 20px;
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: ${MUTED_LIGHT};
      display: flex;
      justify-content: space-between;
    }

    .order-item {
      padding: 16px 20px;
      border-top: 1px solid ${BORDER_LIGHT};
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .order-item-name {
      font-size: 13px;
      font-weight: 400;
      color: ${TEXT_LIGHT};
      margin-bottom: 4px;
    }

    .order-item-meta {
      font-size: 11px;
      font-weight: 300;
      color: ${MUTED_LIGHT};
      letter-spacing: 0.05em;
    }

    .order-item-price {
      font-size: 13px;
      font-weight: 400;
      color: ${TEXT_LIGHT};
      white-space: nowrap;
    }

    .order-totals {
      padding: 16px 20px;
      border-top: 1px solid ${BORDER_LIGHT};
    }

    .order-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 300;
      color: ${MUTED_LIGHT};
      margin-bottom: 8px;
    }

    .order-total-final {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 500;
      color: ${TEXT_LIGHT};
      padding-top: 12px;
      border-top: 1px solid ${BORDER_LIGHT};
      margin-top: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border: 1px solid ${BORDER_LIGHT};
      margin: 28px 0;
    }

    .info-cell {
      padding: 20px;
      border-right: 1px solid ${BORDER_LIGHT};
      border-bottom: 1px solid ${BORDER_LIGHT};
    }

    .info-cell:nth-child(even) { border-right: none; }
    .info-cell:nth-child(n+3) { border-bottom: none; }

    .info-cell-label {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: ${MUTED_LIGHT};
      margin-bottom: 6px;
      font-weight: 400;
    }

    .info-cell-value {
      font-size: 13px;
      font-weight: 300;
      color: ${TEXT_LIGHT};
      line-height: 1.5;
    }

    .email-footer {
      padding: 32px 48px;
      border-top: 1px solid ${BORDER_LIGHT};
      text-align: center;
    }

    .footer-brand {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 16px;
      font-weight: 300;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: ${MUTED_LIGHT};
      margin-bottom: 16px;
    }

    .footer-text {
      font-size: 11px;
      font-weight: 300;
      color: ${MUTED_LIGHT};
      line-height: 1.7;
      letter-spacing: 0.02em;
    }

    .footer-link {
      color: ${MUTED_LIGHT};
      text-decoration: underline;
    }

    /* ── Dark mode ── */
    @media (prefers-color-scheme: dark) {
      body, .email-wrapper { background-color: ${BG_DARK} !important; }
      .email-card { background-color: ${CARD_DARK} !important; border-color: ${BORDER_DARK} !important; }
      .email-header { border-bottom-color: ${BORDER_DARK} !important; }
      .brand-name { color: ${TEXT_DARK} !important; }
      .brand-tagline { color: ${MUTED_DARK} !important; }
      .headline { color: ${TEXT_DARK} !important; }
      .body-text { color: ${MUTED_DARK} !important; }
      .divider { background-color: ${BORDER_DARK} !important; }
      .otp-block { background-color: #1c1c1c !important; border-color: ${BORDER_DARK} !important; }
      .otp-code { color: ${TEXT_DARK} !important; }
      .otp-label { color: ${MUTED_DARK} !important; }
      .btn-ghost { border-color: ${BORDER_DARK} !important; color: ${TEXT_DARK} !important; }
      .order-summary { border-color: ${BORDER_DARK} !important; }
      .order-summary-header { background-color: #1c1c1c !important; color: ${MUTED_DARK} !important; }
      .order-item { border-top-color: ${BORDER_DARK} !important; }
      .order-item-name { color: ${TEXT_DARK} !important; }
      .order-item-meta { color: ${MUTED_DARK} !important; }
      .order-item-price { color: ${TEXT_DARK} !important; }
      .order-totals { border-top-color: ${BORDER_DARK} !important; }
      .order-total-row { color: ${MUTED_DARK} !important; }
      .order-total-final { color: ${TEXT_DARK} !important; border-top-color: ${BORDER_DARK} !important; }
      .info-grid { border-color: ${BORDER_DARK} !important; }
      .info-cell { border-color: ${BORDER_DARK} !important; }
      .info-cell-label { color: ${MUTED_DARK} !important; }
      .info-cell-value { color: ${TEXT_DARK} !important; }
      .email-footer { border-top-color: ${BORDER_DARK} !important; }
      .footer-brand { color: #5a5550 !important; }
      .footer-text { color: #5a5550 !important; }
      .footer-link { color: #5a5550 !important; }
    }

    /* ── Mobile ── */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 0 !important; }
      .email-card { border-left: none !important; border-right: none !important; }
      .email-header { padding: 32px 24px 24px !important; }
      .email-body { padding: 32px 24px !important; }
      .email-footer { padding: 24px !important; }
      .headline { font-size: 24px !important; }
      .otp-code { font-size: 40px !important; letter-spacing: 0.2em !important; }
      .info-grid { grid-template-columns: 1fr !important; }
      .info-cell:nth-child(even) { border-right: none !important; }
      .info-cell:nth-child(odd) { border-right: none !important; }
      .info-cell { border-bottom: 1px solid ${BORDER_LIGHT} !important; }
      .order-summary-header { flex-direction: column; gap: 4px; }
      .btn-primary, .btn-ghost { width: 100% !important; text-align: center !important; display: block !important; }
    }
  </style>
</head>
<body>
  <!-- Preheader text (hidden, shown in email clients' preview) -->
  <span style="display:none;font-size:1px;color:#f9f8f6;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

  <div class="email-wrapper">
    <div class="email-card">

      <!-- Header -->
      <div class="email-header">
        <div class="brand-name">Vestigia</div>
        <div class="brand-tagline">Refined Apparel</div>
      </div>

      <!-- Inner Content -->
      ${innerContent}

      <!-- Footer -->
      <div class="email-footer">
        <div class="footer-brand">Vestigia</div>
        <p class="footer-text">
          You are receiving this email because you have an account with Vestigia.<br />
          &copy; ${new Date().getFullYear()} Vestigia. All rights reserved.<br />
          <a href="#" class="footer-link">Unsubscribe</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="#" class="footer-link">Privacy Policy</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

// ─── Helper: Format Currency ──────────────────────────────────────────────────

function fmt(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency }).format(amount);
}

// ─── Helper: Format Date ──────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Helper: Status Badge ─────────────────────────────────────────────────────

function statusBadge(status: string): string {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:    { bg: '#f5f0e8', color: '#8a6d3b', label: 'Pending' },
    processing: { bg: '#e8f0f5', color: '#2c5f8a', label: 'Processing' },
    shipped:    { bg: '#e8f5ee', color: '#2a7a4a', label: 'Shipped' },
    delivered:  { bg: '#1a1a1a', color: '#c8a96e', label: 'Delivered' },
    cancelled:  { bg: '#f5e8e8', color: '#8a2a2a', label: 'Cancelled' },
  };
  const s = map[status.toLowerCase()] ?? { bg: '#f0f0f0', color: '#555', label: status };
  return `<span class="status-badge" style="background:${s.bg};color:${s.color};">${s.label}</span>`;
}

// ─── Helper: Status Message ───────────────────────────────────────────────────

function statusMessage(status: string, customerName: string): { headline: string; body: string } {
  const name = customerName.split(' ')[0] || 'there';
  const map: Record<string, { headline: string; body: string }> = {
    pending: {
      headline: 'Your order has been received.',
      body: `Hello ${name}, we have received your order and it is now being reviewed. We will notify you as soon as it begins processing.`,
    },
    processing: {
      headline: 'Your order is being prepared.',
      body: `Hello ${name}, good news — your order is now being carefully prepared for shipment. We will notify you the moment it is on its way.`,
    },
    shipped: {
      headline: 'Your order is on its way.',
      body: `Hello ${name}, your order has been dispatched and is en route to you. Please allow a few business days for delivery.`,
    },
    delivered: {
      headline: 'Your order has been delivered.',
      body: `Hello ${name}, we hope your order has arrived in perfect condition. Thank you for choosing Vestigia — we hope you enjoy your pieces.`,
    },
    cancelled: {
      headline: 'Your order has been cancelled.',
      body: `Hello ${name}, your order has been cancelled. If you did not initiate this cancellation or have any questions, please do not hesitate to contact us.`,
    },
  };
  return map[status.toLowerCase()] ?? {
    headline: 'Your order status has been updated.',
    body: `Hello ${name}, your order status has been updated to ${status}.`,
  };
}

// ─── Helper: Order Items HTML ─────────────────────────────────────────────────

function buildOrderItemsTable(items: OrderItem[], currency = 'EUR'): string {
  const rows = items.map(item => `
    <div class="order-item" style="display:table;width:100%;border-collapse:collapse;">
      <div style="display:table-cell;padding:16px 20px;border-top:1px solid ${BORDER_LIGHT};">
        <div class="order-item-name">${item.productName}</div>
        <div class="order-item-meta">${[
          item.size !== 'OS' ? `Size: ${item.size}` : '',
          item.color ? `Colour: ${item.color}` : '',
          `Qty: ${item.quantity}`,
        ].filter(Boolean).join('&ensp;&middot;&ensp;')}</div>
      </div>
      <div style="display:table-cell;padding:16px 20px;text-align:right;vertical-align:top;border-top:1px solid ${BORDER_LIGHT};white-space:nowrap;">
        <span class="order-item-price">${fmt(item.price * item.quantity, currency)}</span>
      </div>
    </div>
  `).join('');
  return rows;
}

// ─── 1. Password Reset Email ──────────────────────────────────────────────────

export const sendPasswordResetEmail = async (email: string, resetLink: string): Promise<void> => {
  const content = `
    <div class="email-body">
      <div class="section-label">Account Security</div>
      <div class="gold-line"></div>
      <h1 class="headline">Reset your<br /><em>password.</em></h1>
      <p class="body-text">
        We received a request to reset the password associated with this email address.
        If this was you, click the button below to set a new password.
      </p>
      <p class="body-text">
        This link will expire in <strong style="font-weight:500;color:${TEXT_LIGHT};">1 hour</strong>.
      </p>
      <div style="margin:36px 0;">
        <a href="${resetLink}" class="btn-primary">Reset Password</a>
      </div>
      <div class="divider"></div>
      <p class="body-text" style="font-size:12px;margin-bottom:0;">
        If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
        For security, never share this link with anyone.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gmail.com',
    to: email,
    subject: 'Reset Your Password — Vestigia',
    html: buildEmailBase(content, 'Reset your Vestigia account password. This link expires in 1 hour.'),
  });
};

// ─── 2. OTP Code Email ────────────────────────────────────────────────────────

export const sendOtpEmail = async (email: string, otp: string, expiresInMinutes = 10): Promise<void> => {
  const content = `
    <div class="email-body">
      <div class="section-label">Verification</div>
      <div class="gold-line"></div>
      <h1 class="headline">Your verification<br /><em>code.</em></h1>
      <p class="body-text">
        Use the code below to verify your identity. Enter it exactly as shown.
      </p>

      <div class="otp-block">
        <div class="otp-code">${otp}</div>
        <div class="otp-label">One-time verification code</div>
      </div>

      <div class="divider"></div>
      <p class="body-text" style="font-size:12px;margin-bottom:0;">
        This code expires in <strong style="font-weight:500;color:${TEXT_LIGHT};">${expiresInMinutes} minutes</strong>.
        If you did not request this code, please secure your account immediately by changing your password.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gmail.com',
    to: email,
    subject: `${otp} — Your Vestigia Verification Code`,
    html: buildEmailBase(content, `Your one-time verification code is ${otp}. Expires in ${expiresInMinutes} minutes.`),
  });
};

// ─── 3. Order Confirmation Email ──────────────────────────────────────────────

export const sendOrderConfirmationEmail = async (order: OrderData): Promise<void> => {
  const itemsHtml = buildOrderItemsTable(order.items);
  const content = `
    <div class="email-body">
      <div class="section-label">Order Confirmed</div>
      <div class="gold-line"></div>
      <h1 class="headline">Thank you,<br /><em>${order.customer.split(' ')[0] || 'valued customer'}.</em></h1>
      <p class="body-text">
        Your order has been received and is now being reviewed.
        We will notify you as soon as your pieces are being prepared for dispatch.
      </p>

      <!-- Info Grid -->
      <div class="info-grid" style="margin:28px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER_LIGHT};">
          <tr>
            <td style="padding:20px;border-right:1px solid ${BORDER_LIGHT};border-bottom:1px solid ${BORDER_LIGHT};width:50%;vertical-align:top;">
              <div class="info-cell-label">Order Number</div>
              <div class="info-cell-value" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;">${order.id}</div>
            </td>
            <td style="padding:20px;border-bottom:1px solid ${BORDER_LIGHT};vertical-align:top;">
              <div class="info-cell-label">Order Date</div>
              <div class="info-cell-value">${fmtDate(order.date)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;border-right:1px solid ${BORDER_LIGHT};vertical-align:top;">
              <div class="info-cell-label">Status</div>
              <div class="info-cell-value">${statusBadge(order.status)}</div>
            </td>
            <td style="padding:20px;vertical-align:top;">
              <div class="info-cell-label">Shipping To</div>
              <div class="info-cell-value">${order.address || '—'}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Order Items -->
      <div class="order-summary">
        <div style="background-color:${BG_LIGHT};padding:14px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:9px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:${MUTED_LIGHT};">Item</td>
              <td style="font-size:9px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:${MUTED_LIGHT};text-align:right;">Total</td>
            </tr>
          </table>
        </div>
        ${itemsHtml}
        <!-- Totals -->
        <div style="padding:16px 20px;border-top:1px solid ${BORDER_LIGHT};">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;font-weight:300;color:${MUTED_LIGHT};padding-bottom:8px;">Subtotal</td>
              <td style="font-size:12px;font-weight:300;color:${MUTED_LIGHT};text-align:right;padding-bottom:8px;">${fmt(order.subtotal)}</td>
            </tr>
            <tr>
              <td style="font-size:12px;font-weight:300;color:${MUTED_LIGHT};padding-bottom:8px;">Shipping</td>
              <td style="font-size:12px;font-weight:300;color:${MUTED_LIGHT};text-align:right;padding-bottom:8px;">${order.shipping === 0 ? 'Complimentary' : fmt(order.shipping)}</td>
            </tr>
            <tr>
              <td style="font-size:12px;font-weight:300;color:${MUTED_LIGHT};padding-bottom:16px;">Tax</td>
              <td style="font-size:12px;font-weight:300;color:${MUTED_LIGHT};text-align:right;padding-bottom:16px;">${fmt(order.tax)}</td>
            </tr>
            <tr style="border-top:1px solid ${BORDER_LIGHT};">
              <td style="font-size:15px;font-weight:500;color:${TEXT_LIGHT};padding-top:14px;font-family:'Cormorant Garamond',Georgia,serif;letter-spacing:0.02em;">Total</td>
              <td style="font-size:15px;font-weight:500;color:${GOLD};text-align:right;padding-top:14px;">${fmt(order.total)}</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="divider"></div>
      <p class="body-text" style="font-size:12px;margin-bottom:0;">
        If you have any questions about your order, please contact us and reference your order number
        <strong style="font-weight:500;color:${TEXT_LIGHT};">${order.id}</strong>.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gmail.com',
    to: order.email,
    subject: `Order Confirmed — ${order.id}`,
    html: buildEmailBase(content, `Your Vestigia order ${order.id} has been received. Total: ${fmt(order.total)}.`),
  });
};

// ─── 4. Order Status Update Email ─────────────────────────────────────────────

export const sendOrderStatusEmail = async (order: OrderData): Promise<void> => {
  const msg = statusMessage(order.status, order.customer);
  const content = `
    <div class="email-body">
      <div class="section-label">Order Update</div>
      <div class="gold-line"></div>
      <h1 class="headline">${msg.headline}</h1>
      <p class="body-text">${msg.body}</p>

      <!-- Order Info -->
      <div style="margin:28px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${BORDER_LIGHT};">
          <tr>
            <td style="padding:20px;border-right:1px solid ${BORDER_LIGHT};border-bottom:1px solid ${BORDER_LIGHT};width:50%;vertical-align:top;">
              <div class="info-cell-label">Order Number</div>
              <div class="info-cell-value" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:16px;">${order.id}</div>
            </td>
            <td style="padding:20px;border-bottom:1px solid ${BORDER_LIGHT};vertical-align:top;">
              <div class="info-cell-label">Date Placed</div>
              <div class="info-cell-value">${fmtDate(order.date)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;border-right:1px solid ${BORDER_LIGHT};vertical-align:top;">
              <div class="info-cell-label">Current Status</div>
              <div class="info-cell-value" style="margin-top:4px;">${statusBadge(order.status)}</div>
            </td>
            <td style="padding:20px;vertical-align:top;">
              <div class="info-cell-label">Order Total</div>
              <div class="info-cell-value" style="color:${GOLD};font-size:16px;font-family:'Cormorant Garamond',Georgia,serif;">${fmt(order.total)}</div>
            </td>
          </tr>
        </table>
      </div>

      <div class="divider"></div>
      <p class="body-text" style="font-size:12px;margin-bottom:0;">
        If you have questions about your order, please contact our team and reference
        order <strong style="font-weight:500;color:${TEXT_LIGHT};">${order.id}</strong>.
      </p>
    </div>
  `;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gmail.com',
    to: order.email,
    subject: `Order Update — ${order.id}`,
    html: buildEmailBase(content, `Your Vestigia order ${order.id} status: ${order.status}.`),
  });
};
