import { Printer } from 'lucide-react';
import Modal from './ui/Modal';
import { money, orderNumber, clock } from '../lib/format';
import type { Order } from '../lib/types';

const TYPE_LABEL: Record<Order['order_type'], string> = {
  dine_in: 'Dine-In',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
};

const RESTAURANT = {
  name: 'Restolink',
  tagline: 'Restaurant & Fast-Casual POS',
};

interface Props {
  order: Order | null;
  onClose: () => void;
}

/**
 * Printable invoice. Renders inside the normal Modal for on-screen
 * preview; a dedicated `#invoice-print-area` + the `@media print`
 * rules in index.css isolate just this markup when the user hits
 * Print, so nothing else in the admin UI ends up on the page.
 */
export default function InvoiceModal({ order, onClose }: Props) {
  if (!order) return null;
  const items = order.items ?? [];
  const date = new Date(order.created_at);

  return (
    <Modal open={!!order} onClose={onClose} title="Invoice" wide>
      <div id="invoice-print-area" className="mx-auto max-w-md text-zinc-900">
        <div className="text-center">
          <p className="font-display text-xl font-extrabold tracking-tight">{RESTAURANT.name}</p>
          <p className="text-[11px] text-zinc-400">{RESTAURANT.tagline}</p>
        </div>

        <div className="my-4 border-t border-dashed border-zinc-300" />

        <div className="flex items-start justify-between text-xs">
          <div>
            <p className="font-display text-base font-bold">Invoice {orderNumber(order.id)}</p>
            <p className="mt-0.5 text-zinc-500">{date.toLocaleDateString()} · {clock(order.created_at)}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-zinc-700">{TYPE_LABEL[order.order_type]}</p>
            {order.order_type === 'dine_in' && order.table_number && (
              <p className="text-zinc-500">Table {order.table_number}</p>
            )}
          </div>
        </div>

        {order.order_type === 'delivery' && (
          <div className="mt-3 rounded-lg bg-zinc-50 p-2.5 text-xs text-zinc-600 print:bg-transparent print:p-0">
            <p className="font-semibold text-zinc-800">{order.customer_name}</p>
            {order.customer_phone && <p>{order.customer_phone}</p>}
            {order.delivery_address && <p>{order.delivery_address}</p>}
          </div>
        )}

        <div className="my-4 border-t border-dashed border-zinc-300" />

        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-zinc-400">
              <th className="pb-1.5 font-semibold">Item</th>
              <th className="pb-1.5 text-center font-semibold">Qty</th>
              <th className="pb-1.5 text-right font-semibold">Price</th>
              <th className="pb-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="py-3 text-center text-zinc-400">No items recorded</td></tr>
            ) : items.map((it) => (
              <tr key={it.id} className="border-t border-zinc-100">
                <td className="py-1.5 pr-2">{it.product_name}</td>
                <td className="py-1.5 text-center text-zinc-500">{it.quantity}</td>
                <td className="py-1.5 text-right text-zinc-500">{money(it.unit_price)}</td>
                <td className="py-1.5 text-right font-medium">{money(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="my-4 border-t border-dashed border-zinc-300" />

        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
          <div className="flex justify-between text-zinc-500"><span>VAT (10%)</span><span>{money(order.tax_amount)}</span></div>
          <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1.5 font-display text-base font-bold">
            <span>Total</span><span>{money(order.total)}</span>
          </div>
          <div className="flex justify-between pt-1 text-zinc-400">
            <span>Payment method</span><span className="capitalize">{order.payment_method}</span>
          </div>
        </div>

        {order.notes && (
          <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 print:bg-transparent print:p-0 print:text-zinc-600">
            Note: {order.notes}
          </p>
        )}

        <div className="my-4 border-t border-dashed border-zinc-300" />
        <p className="text-center text-[11px] text-zinc-400">Thank you for your order!</p>
      </div>

      <button
        onClick={() => window.print()}
        className="no-print mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-600 active:scale-[0.98]"
      >
        <Printer size={16} /> Print invoice
      </button>
    </Modal>
  );
}
