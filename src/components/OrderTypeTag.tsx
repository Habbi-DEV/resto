import { UtensilsCrossed, ShoppingBag, Bike } from 'lucide-react';
import type { Order, OrderType } from '../lib/types';

const META: Record<OrderType, { label: string; cls: string; Icon: typeof Bike }> = {
  dine_in: { label: 'Dine-In', cls: 'bg-brand-500 text-white', Icon: UtensilsCrossed },
  takeaway: { label: 'Takeaway', cls: 'bg-amber-400 text-amber-950', Icon: ShoppingBag },
  delivery: { label: 'Delivery', cls: 'bg-sky-500 text-white', Icon: Bike },
};

export function OrderTypeTag({ type }: { type: OrderType }) {
  const m = META[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>
      <m.Icon size={11} strokeWidth={2.5} />
      {m.label}
    </span>
  );
}

/** One-line context under the type tag: table, or customer + address. */
export function orderContext(o: Order): string {
  if (o.order_type === 'dine_in') return `Table ${o.table_number}`;
  if (o.order_type === 'delivery') return o.customer_name || 'Delivery customer';
  return 'Counter pickup';
}
