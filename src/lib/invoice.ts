import type { Order } from './types';
import { money, orderNumber } from './format';

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const ORDER_TYPE_LABEL: Record<Order['order_type'], string> = {
  dine_in: 'Dine-In',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
};

/**
 * Opens a print-ready receipt/invoice for the given order in a new window
 * and triggers the browser's print dialog. Self-contained HTML (no app CSS
 * dependency) so it prints cleanly regardless of what's on screen.
 */
export function printInvoice(order: Order): void {
  const win = window.open('', '_blank', 'width=420,height=680');
  if (!win) {
    alert('Please allow pop-ups to print the invoice.');
    return;
  }

  const created = new Date(order.created_at);
  const dateStr = created.toLocaleDateString();
  const timeStr = created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const contextLine =
    order.order_type === 'dine_in'
      ? `Table ${order.table_number ?? '—'}`
      : order.order_type === 'delivery'
      ? [order.customer_name, order.customer_phone, order.delivery_address].filter(Boolean).map(escapeHtml).join('<br/>')
      : 'Pickup at counter';

  const itemsHtml = (order.items ?? [])
    .map((it) => {
      const sauces = it.sauces && it.sauces.length
        ? `<div class="sauces">+ ${it.sauces.map((s) => escapeHtml(s.name) + (s.price > 0 ? ` (${money(s.price)})` : '')).join(', ')}</div>`
        : '';
      return `
        <tr>
          <td class="qty">${it.quantity}×</td>
          <td class="name">${escapeHtml(it.product_name)}${sauces}</td>
          <td class="amt">${money(it.line_total)}</td>
        </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${orderNumber(order.id)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #18181b;
    max-width: 380px;
    margin: 0 auto;
    padding: 24px 20px;
  }
  .brand { text-align: center; margin-bottom: 4px; }
  .brand .logo { font-size: 28px; }
  .brand h1 { font-size: 18px; font-weight: 800; margin: 4px 0 0; letter-spacing: 0.02em; }
  .brand p { font-size: 11px; color: #71717a; margin: 2px 0 0; }
  .divider { border: none; border-top: 1px dashed #d4d4d8; margin: 16px 0; }
  .meta { font-size: 12px; color: #52525b; }
  .meta .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .meta .label { color: #a1a1aa; }
  .context { font-size: 12px; margin-top: 8px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  td { padding: 5px 0; vertical-align: top; }
  td.qty { width: 32px; color: #71717a; font-weight: 700; }
  td.name { padding-left: 4px; }
  td.amt { text-align: right; white-space: nowrap; font-weight: 600; }
  .sauces { font-size: 10.5px; color: #a1a1aa; margin-top: 1px; }
  .totals { margin-top: 12px; font-size: 13px; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; color: #52525b; }
  .totals .grand { display: flex; justify-content: space-between; padding-top: 8px; margin-top: 6px; border-top: 1px solid #18181b; font-size: 16px; font-weight: 800; color: #18181b; }
  .payment { margin-top: 10px; font-size: 12px; color: #52525b; text-transform: capitalize; }
  .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #a1a1aa; }
  @media print {
    body { padding: 0; max-width: 100%; }
    @page { margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="brand">
    <div class="logo">🍽️</div>
    <h1>RESTOLINK</h1>
    <p>Invoice / Receipt</p>
  </div>

  <hr class="divider" />

  <div class="meta">
    <div class="row"><span class="label">Order</span><span>${orderNumber(order.id)}</span></div>
    <div class="row"><span class="label">Date</span><span>${dateStr} · ${timeStr}</span></div>
    <div class="row"><span class="label">Type</span><span>${ORDER_TYPE_LABEL[order.order_type]}</span></div>
  </div>
  <div class="context">${contextLine}</div>

  <hr class="divider" />

  <table>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    <div class="row"><span>VAT</span><span>${money(order.tax_amount)}</span></div>
    <div class="grand"><span>Total</span><span>${money(order.total)}</span></div>
  </div>

  <div class="payment">Payment: ${escapeHtml(order.payment_method)}</div>
  ${order.notes ? `<div class="payment">Notes: ${escapeHtml(order.notes)}</div>` : ''}

  <div class="footer">Thank you for your order! 🧡</div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the popup a beat to finish laying out before invoking print().
  win.onload = () => win.print();
  setTimeout(() => win.print(), 300);
}
