import { useEffect, useMemo, useState } from 'react';
import { MapPin, Phone, Printer, Trash2, Users } from 'lucide-react';
import useLiveOrders from '../../hooks/useLiveOrders';
import StatusBadge from '../../components/StatusBadge';
import { OrderTypeTag } from '../../components/OrderTypeTag';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../lib/api';
import { money, orderNumber, timeAgo } from '../../lib/format';
import { printInvoice } from '../../lib/invoice';
import type { Order, OrderStatus, OrderType } from '../../lib/types';

const STATUS_FILTERS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'out_for_delivery', label: 'Delivery' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_FILTERS: { value: OrderType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'dine_in', label: '🍽️ Dine-In' },
  { value: 'takeaway', label: '🥡 Takeaway' },
  { value: 'delivery', label: '🛵 Delivery' },
];

function nextAction(o: Order): { to: OrderStatus; label: string } | null {
  switch (o.status) {
    case 'pending': return { to: 'confirmed', label: 'Confirm' };
    case 'confirmed': return { to: 'preparing', label: 'Start prep' };
    case 'preparing': return { to: 'ready', label: 'Mark ready' };
    case 'ready':
      return o.order_type === 'delivery'
        ? { to: 'out_for_delivery', label: 'Dispatch driver' }
        : { to: 'completed', label: 'Complete' };
    case 'out_for_delivery': return { to: 'completed', label: 'Delivered' };
    default: return null;
  }
}

export default function OrdersPage() {
  const { orders, loading, refresh } = useLiveOrders(120, 4000);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderType | 'all'>('all');
  const [busyId, setBusyId] = useState<number | null>(null);

  const filtered = useMemo(
    () => orders.filter((o) =>
      (statusFilter === 'all' || o.status === statusFilter) &&
      (typeFilter === 'all' || o.order_type === typeFilter),
    ),
    [orders, statusFilter, typeFilter],
  );

  // Real per-status totals from the DB, not a count over the capped
  // 120-row fetch above — otherwise "All" / "Pending" etc. silently
  // plateau at whatever the fetch limit is once order volume passes it.
  const [counts, setCounts] = useState<Record<string, number>>({ all: 0 });
  useEffect(() => {
    const loadCounts = () => fetch('/api/orders?counts=1').then((r) => r.json()).then(setCounts).catch(console.error);
    loadCounts();
    const iv = setInterval(loadCounts, 4000);
    return () => clearInterval(iv);
  }, []);

  const setStatus = async (id: number, status: OrderStatus) => {
    setBusyId(id);
    try {
      await api(`/api/orders`, { method: 'PUT', body: JSON.stringify({ id, status }) });
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900">Orders</h1>
          <p className="text-sm text-zinc-500">Live feed — advance each order through the kitchen.</p>
        </div>
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${typeFilter === t.value ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 ring-1 ring-zinc-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${statusFilter === s.value ? 'bg-brand-500 text-white shadow-md shadow-orange-500/30' : 'bg-white text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-50'}`}
          >
            {s.label}{counts[s.value] ? ` · ${counts[s.value]}` : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner label="Connecting to the order feed…" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center text-sm text-zinc-400 ring-1 ring-zinc-100">No orders match this filter.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => {
            const action = nextAction(o);
            const cancellable = ['pending', 'confirmed'].includes(o.status);
            return (
              <div key={o.id} className="flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-bold text-zinc-900">{orderNumber(o.id)}</span>
                  <OrderTypeTag type={o.order_type} />
                  <span className="ml-auto text-[11px] text-zinc-400">{timeAgo(o.created_at)}</span>
                </div>

                <div className="mt-2 space-y-1 text-xs text-zinc-500">
                  {o.order_type === 'dine_in' && (
                    <p className="flex items-center gap-1.5 font-semibold text-zinc-700"><Users size={12} /> Table {o.table_number}</p>
                  )}
                  {o.order_type === 'delivery' && (
                    <>
                      <p className="font-semibold text-zinc-700">{o.customer_name}</p>
                      <p className="flex items-center gap-1.5"><Phone size={11} /> {o.customer_phone}</p>
                      <p className="flex items-center gap-1.5"><MapPin size={11} /> {o.delivery_address}</p>
                    </>
                  )}
                  {o.order_type === 'takeaway' && <p className="font-semibold text-zinc-700">Pickup at counter</p>}
                </div>

                <div className="mt-3 flex-1 rounded-xl bg-zinc-50 p-2.5 text-xs">
                  {(o.items && o.items.length > 0 ? o.items : []).slice(0, 4).map((it) => (
                    <div key={it.id} className="py-0.5">
                      <p className="flex justify-between text-zinc-600">
                        <span className="truncate">{it.quantity}× {it.product_name}</span>
                        <span className="ml-2 shrink-0 text-zinc-400">{money(it.line_total)}</span>
                      </p>
                      {((it.sauces?.length ?? 0) > 0 || (it.supplements?.length ?? 0) > 0) && (
                        <p className="truncate pl-3 text-[10px] text-zinc-400">
                          + {[...(it.sauces ?? []), ...(it.supplements ?? [])].map((s) => s.name).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                  {(!o.items || o.items.length === 0) && <p className="text-zinc-400">No items recorded</p>}
                  {(o.items?.length ?? 0) > 4 && <p className="pt-0.5 text-[10px] text-zinc-400">+{o.items!.length - 4} more</p>}
                </div>

                {o.notes && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700">📝 {o.notes}</p>}

                <div className="mt-3 flex items-center justify-between border-t border-zinc-50 pt-3">
                  <span className="font-display text-base font-bold text-zinc-900">{money(o.total)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => printInvoice(o)}
                      title="Print invoice"
                      aria-label="Print invoice"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-50 hover:text-brand-600"
                    >
                      <Printer size={15} />
                    </button>
                    <StatusBadge status={o.status} />
                  </div>
                </div>

                {(action || cancellable) && (
                  <div className="mt-3 flex gap-2">
                    {action && (
                      <button
                        onClick={() => setStatus(o.id, action.to)}
                        disabled={busyId === o.id}
                        className="flex-1 rounded-xl bg-brand-500 py-2 text-xs font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
                      >
                        {busyId === o.id ? '…' : action.label}
                      </button>
                    )}
                    {cancellable && (
                      <button
                        onClick={() => setStatus(o.id, 'cancelled')}
                        disabled={busyId === o.id}
                        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-500 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    )}
                    {o.status === 'cancelled' && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete order ${orderNumber(o.id)} permanently?`)) return;
                          await api('/api/orders', { method: 'DELETE', body: JSON.stringify({ id: o.id }) });
                          refresh();
                        }}
                        className="rounded-xl border border-zinc-200 p-2 text-zinc-400 hover:text-red-500"
                        aria-label="Delete order"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}