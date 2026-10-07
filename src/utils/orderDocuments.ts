import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { businessContact as contact } from '../../shared/businessContact';

export type DocumentKind = 'invoice' | 'packing-slip';
export type DocumentOrder = {
  id: string; invoiceNumber?: string; date?: string; customer?: string; customerName?: string; name?: string;
  email?: string; phone?: string; address?: string; currency: string; paymentStatus?: string; status?: string;
  subtotalMinor?: number; shippingMinor?: number; taxMinor?: number; discountMinor?: number; totalMinor?: number;
  subtotal?: number; shipping?: number; tax?: number; total?: number; discount?: number;
  giftOrder?: boolean; giftMessage?: string | null; courier?: string; trackingNumber?: string;
  items: { productName?: string; name?: string; size?: string; color?: string; quantity: number; unitPriceMinor?: number; subtotalMinor?: number; price?: number }[];
};

export function buildOrderDocument(orders: DocumentOrder[], kind: DocumentKind) {
  if (!orders.length) throw new Error('Select at least one order.');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const invoice = kind === 'invoice';
  const clean = (value: unknown) => String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/[–—]/g, '-');
  for (const [index, order] of orders.entries()) {
    if (index) pdf.addPage();
    const decimals = new Intl.NumberFormat('en', { style: 'currency', currency: order.currency }).resolvedOptions().maximumFractionDigits ?? 2;
    const amount = (minor: number | undefined, major: number | undefined) => {
      const value = Number.isFinite(minor) ? minor! / 10 ** decimals : major;
      if (!Number.isFinite(value)) throw new Error(`Order ${order.id} is missing a saved amount.`);
      return `${order.currency} ${value!.toFixed(decimals)}`;
    };
    let y = 20;
    const text = (value: string, size = 10, bold = false) => {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(clean(value), 170);
      const height = lines.length * size * .45 + 3;
      if (y + height > 273) { pdf.addPage(); y = 20; }
      pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
      pdf.text(lines, 20, y); y += height;
    };
    pdf.setTextColor(17, 17, 15);
    text('VESTIGIA', 24, true);
    text(invoice ? 'INVOICE' : 'PACKING SLIP', 11, true);
    text(`Order: ${order.id}  |  Date: ${order.date || '-'}`, 9);
    if (invoice) {
      text(`Invoice: ${order.invoiceNumber || `INV-${order.id}`}`, 9);
      text(`Payment status: ${order.paymentStatus || 'Not recorded'}`, 9);
    }
    y += 3;
    text(invoice ? 'BILL TO / SHIP TO' : 'SHIP TO', 9, true);
    text(order.customer || order.customerName || order.name || 'Customer');
    text(order.address || 'Address not recorded');
    text([order.email, order.phone].filter(Boolean).join(' | '), 9);
    const body = order.items.map(item => {
      const row = [clean(item.productName || item.name || 'Product'), clean([item.size, item.color].filter(Boolean).join(' / ')), String(item.quantity)];
      if (invoice) row.push(amount(item.unitPriceMinor, item.price), amount(item.subtotalMinor, item.price === undefined ? undefined : item.price * item.quantity));
      else row.push('[ ]');
      return row;
    });
    autoTable(pdf, {
      startY: y + 3, margin: { left: 20, right: 20, top: 20, bottom: 24 },
      head: [invoice ? ['Item', 'Variant', 'Qty', 'Unit price', 'Subtotal'] : ['Item', 'Variant', 'Qty', 'Packed']], body,
      theme: 'grid', styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, lineColor: [226, 223, 216], lineWidth: .15, overflow: 'linebreak' },
      headStyles: { fillColor: [247, 244, 237], textColor: [17, 17, 15], fontStyle: 'bold' },
      columnStyles: invoice ? { 0: { cellWidth: 57 }, 1: { cellWidth: 35 }, 2: { cellWidth: 12 }, 3: { halign: 'right' }, 4: { halign: 'right' } } : { 0: { cellWidth: 85 }, 1: { cellWidth: 45 }, 2: { cellWidth: 20 }, 3: { cellWidth: 20 } },
      rowPageBreak: 'avoid',
    });
    y = (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9;
    if (invoice) {
      text(`Subtotal: ${amount(order.subtotalMinor, order.subtotal)}`);
      text(`Discount: ${amount(order.discountMinor ?? (order.discount === undefined ? 0 : undefined), order.discount)}`);
      text(`Shipping: ${amount(order.shippingMinor, order.shipping)}`);
      text(`Tax: ${amount(order.taxMinor, order.tax)}`);
      text(`TOTAL: ${amount(order.totalMinor, order.total)}`, 12, true);
    } else {
      text(`Total units: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}`, 10, true);
      if (order.courier || order.trackingNumber) text(`Shipping: ${[order.courier, order.trackingNumber].filter(Boolean).join(' / ')}`);
      if (order.giftOrder) { text('Gift order', 10, true); if (order.giftMessage) text(`Gift message: ${order.giftMessage}`); }
      text('Packed by: ____________________   Date: ____________________', 9);
    }
    y += 5;
    text('CLIENT CONCIERGE', 9, true);
    text(`Email Concierge: ${contact.email}`, 8);
    text(`Direct Advisory Line: ${contact.phone}`, 8);
    text(`Support Hours: ${contact.weekdayHours} | ${contact.saturdayHours}`, 8);
    text(`Head Office: ${contact.street}, ${contact.locality}`, 8);
  }
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page); pdf.setFontSize(8); pdf.setTextColor(110);
    pdf.text(`VESTIGIA | ${contact.website}`, 20, 285);
    pdf.text(`Page ${page} of ${pdf.getNumberOfPages()}`, 190, 285, { align: 'right' });
  }
  pdf.setProperties({ title: invoice ? 'VESTIGIA Invoice' : 'VESTIGIA Packing Slip', author: 'VESTIGIA' });
  return pdf;
}

export function downloadOrderDocument(orders: DocumentOrder[], kind: DocumentKind) {
  const suffix = orders.length === 1 ? orders[0].id.replace(/[^a-zA-Z0-9_-]/g, '-') : `${orders.length}-orders`;
  buildOrderDocument(orders, kind).save(`VESTIGIA-${kind}-${suffix}.pdf`);
}
