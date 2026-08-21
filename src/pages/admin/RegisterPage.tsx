import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Printer, Search, Trash2 } from 'lucide-react';
import type { Category, Order, Product, RestaurantTable } from '../../lib/types';
import { api } from '../../lib/api';
import { money, orderNumber, timeAgo } from '../../lib/format';
import { printInvoice } from '../../lib/invoice';
import { useCartStore, selectSubtotal } from '../../stores/cartStore';
import useLiveOrders from '../../hooks/useLiveOrders';
import StatusBadge from '../../components/StatusBadge';
import { OrderTypeTag, orderContext } from '../../components/OrderTypeTag';
import Spinner from '../../components/ui/Spinner';
import type { OrderType } from '../../lib/types';

const TAX_RATE = 0.10;

const TYPES: { value: OrderType; label: string; emoji: string }[] = [
  { value: 'dine_in', label: 'Dine-In', emoji: '🍽️' },
  { value: 'takeaway', label: 'Takeaway', emoji: '🥡' },
  { value: 'delivery', label: 'Delivery', emoji: '🛵' },
];

export default function RegisterPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'ticket' | 'live'>('ticket');
  const [flash, setFlash] = useState('');

  const { orders, loading: feedLoading, refresh } = useLiveOrders(25, 5000);

  const { lines, add, inc, dec, remove, clear } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  const loadAll = () => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/tables').then((r) => r.json()),
    ])
      .then(([c, p, t]) => {
        setCategories(Array.isArray(c) ? c : []);
        setProducts(Array.isArray(p) ? p : []);
        setTables(Array.isArray(t) ? t : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const visible = useMemo(() => {
    let list = products;
    if (activeCat !== 'all') list = list.filter((p) => p.category_id === activeCat);
    if (search.trim()) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [products, activeCat, search]);

  const placeOrder = async () => {
    const e: Record<string, string> = {};
    if (lines.length === 0) e.items = 'Add at least one item to the ticket.';
    if (orderType === 'dine_in' && !tableNumber) e.table = 'Select a table for this dine-in order.';
    if (orderType === 'delivery') {
      if (!name.trim()) e.name = 'Customer name required.';
      if (phone.trim().replace(/\D/g, '').length < 6) e.phone = 'Valid phone required.';
      if (!address.trim()) e.address = 'Address required.';
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setPlacing(true);
    try {
      const order = await api<Order>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          order_type: orderType,
          table_number: orderType === 'dine_in' ? tableNumber : undefined,
          customer_name: orderType === 'delivery' ? name : undefined,
          customer_phone: orderType === 'delivery' ? phone : undefined,
          delivery_address: orderType === 'delivery' ? address : undefined,
          notes: notes || undefined,
          payment_method: 'card',
          items: lines.map((l) => ({ product_id: l.product.id, quantity: l.qty, sauce_ids: l.sauces.map((s) => s.id) })),
        }),
      });
      clear();
      setTableNumber(null); setName(''); setPhone(''); setAddress(''); setNotes('');
      setFlash(`Order ${orderNumber(order.id)} sent to kitchen ✅`);
      setTimeout(() => setFlash(''), 3500);
      setTab('live');
      refresh();
      loadAll();
    } catch (err) {
      setErrors({ items: err instanceof Error ? err.message : 'Failed to place order' });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col lg:h-screen lg:flex-row">
      {/* -------- product grid side -------- */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-xl font-bold text-zinc-900">Register</h1>
            <div className="relative ml-auto w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products…"
                className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            <button onClick={() => setActiveCat('all')} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${activeCat === 'all' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>All</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${activeCat === c.id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="thin-scroll flex-1 overflow-y-auto p-4">
          {loading ? (
            <Spinner label="Loading products…" />
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
              {visible.map((p) => {
                const disabled = !p.is_available || p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => !disabled && add(p, 1)}
                    disabled={disabled}
                    className={`group overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-zinc-100 transition hover:shadow-md active:scale-[0.98] ${disabled ? 'opacity-50' : ''}`}
                  >
                    <div className="relative h-24 bg-orange-50">
                      {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />}
                      {p.stock > 0 && p.stock <= 8 && (
                        <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-amber-950">{p.stock} left</span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-xs font-semibold text-zinc-900">{p.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="font-display text-sm font-bold text-burnt">{money(p.price)}</span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-600 opacity-0 transition group-hover:opacity-100"><Plus size={13} /></span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* -------- right panel: ticket / live feed -------- */}
      <aside className="flex w-full shrink-0 flex-col border-t border-zinc-200 bg-white lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="flex border-b border-zinc-100">
          {(['ticket', 'live'] as const).map((t) => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold transition ${tab === t ? 'border-b-2 border-brand-500 text-brand-600' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {t === 'ticket' ? `Current ticket${lines.length ? ` (${lines.length})` : ''}` : 'Live feed'}
            </button>
          ))}
        </div>

        {flash && <div className="mx-3 mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700">{flash}</div>}

        {tab === 'ticket' ? (
          <div className="thin-scroll flex flex-1 flex-col overflow-y-auto p-4">
            {/* order type */}
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value} onClick={() => setOrderType(t.value)}
                  className={`rounded-xl border-2 py-2 text-center transition ${orderType === t.value ? 'border-brand-500 bg-brand-50' : 'border-zinc-100 hover:border-zinc-200'}`}
                >
                  <span className="block text-base">{t.emoji}</span>
                  <span className={`text-[11px] font-bold ${orderType === t.value ? 'text-brand-700' : 'text-zinc-500'}`}>{t.label}</span>
                </button>
              ))}
            </div>

            {/* conditional fields */}
            {orderType === 'dine_in' && (
              <div className="mt-3">
                <div className="grid grid-cols-6 gap-1.5">
                  {tables.map((t) => (
                    <button
                      key={t.id} onClick={() => t.status !== 'occupied' && setTableNumber(t.table_number)}
                      disabled={t.status === 'occupied' && tableNumber !== t.table_number}
                      title={`Table ${t.table_number} · ${t.status}`}
                      className={`rounded-lg py-1.5 text-xs font-bold transition ${
                        tableNumber === t.table_number ? 'bg-brand-500 text-white' :
                        t.status === 'occupied' ? 'bg-zinc-100 text-zinc-300' :
                        t.status === 'reserved' ? 'bg-indigo-50 text-indigo-400' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {t.table_number}
                    </button>
                  ))}
                </div>
                {errors.table && <p className="mt-1 text-[11px] font-medium text-red-500">{errors.table}</p>}
              </div>
            )}
            {orderType === 'delivery' && (
              <div className="mt-3 space-y-2">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name *" className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${errors.name ? 'border-red-300' : 'border-zinc-200'}`} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone *" className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${errors.phone ? 'border-red-300' : 'border-zinc-200'}`} />
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address *" className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${errors.address ? 'border-red-300' : 'border-zinc-200'}`} />
              </div>
            )}

            {/* items */}
            <div className="mt-4 flex-1">
              {lines.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-400">Tap products to build the ticket.</p>
              ) : (
                <ul className="space-y-2">
                  {lines.map((l) => (
                    <li key={l.key} className="flex items-center gap-2 rounded-xl bg-zinc-50 p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-zinc-900">{l.product.name}</p>
                        <p className="text-[11px] text-zinc-400">{money(l.product.price)} × {l.qty}</p>
                      </div>
                      <button onClick={() => dec(l.key)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm"><Minus size={11} /></button>
                      <span className="w-4 text-center text-xs font-bold">{l.qty}</span>
                      <button onClick={() => inc(l.key)} className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm"><Plus size={11} /></button>
                      <button onClick={() => remove(l.key)} className="text-zinc-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {errors.items && <p className="mt-2 text-[11px] font-medium text-red-500">{errors.items}</p>}
            </div>

            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ticket notes…" className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs outline-none" />

            {/* totals + CTA */}
            <div className="mt-3 space-y-1 border-t border-dashed border-zinc-200 pt-3 text-xs">
              <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between text-zinc-500"><span>VAT 10%</span><span>{money(tax)}</span></div>
              <div className="flex justify-between font-display text-base font-bold text-zinc-900"><span>Total</span><span className="text-burnt">{money(total)}</span></div>
            </div>
            <button
              onClick={placeOrder} disabled={placing}
              className="mt-3 w-full rounded-xl bg-brand-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60"
            >
              {placing ? 'Sending…' : 'Place order'}
            </button>
          </div>
        ) : (
          <div className="thin-scroll flex-1 overflow-y-auto p-3">
            {feedLoading ? (
              <Spinner />
            ) : orders.length === 0 ? (
              <p className="py-10 text-center text-xs text-zinc-400">Waiting for the first order…</p>
            ) : (
              <ul className="space-y-2">
                {orders.map((o) => (
                  <li key={o.id} className="rounded-xl border border-zinc-100 p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold">{orderNumber(o.id)}</span>
                      <OrderTypeTag type={o.order_type} />
                      <span className="ml-auto text-[10px] text-zinc-400">{timeAgo(o.created_at)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">{orderContext(o)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{money(o.total)}</span>
                        <button
                          onClick={() => printInvoice(o)}
                          title="Print invoice"
                          aria-label="Print invoice"
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-50 hover:text-brand-600"
                        >
                          <Printer size={13} />
                        </button>
                        <StatusBadge status={o.status} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={refresh} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-50">
              <Check size={13} /> Refresh feed
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
