import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bike, ChevronRight, Minus, Plus, ShoppingBag, Trash2, UtensilsCrossed } from 'lucide-react';
import { useCartStore, selectSubtotal } from '../../stores/cartStore';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import type { Order, OrderType, RestaurantTable } from '../../lib/types';

const TAX_RATE = 0.10;

const TYPE_OPTIONS: { value: OrderType; label: string; hint: string; Icon: typeof Bike }[] = [
  { value: 'dine_in', label: 'Dine-In', hint: 'Served at your table', Icon: UtensilsCrossed },
  { value: 'takeaway', label: 'Takeaway', hint: 'Pick up at the counter', Icon: ShoppingBag },
  { value: 'delivery', label: 'Delivery', hint: 'We bring it to you', Icon: Bike },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPlaced: (order: Order) => void;
}

export default function CartSheet({ open, onClose, onPlaced }: Props) {
  const { lines, inc, dec, remove, clear } = useCartStore();
  const subtotal = useCartStore(selectSubtotal);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<'card' | 'cash'>('card');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      fetch('/api/tables')
        .then((r) => r.json())
        .then((d: RestaurantTable[]) => setTables(Array.isArray(d) ? d : []))
        .catch(() => setTables([]));
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep('cart');
      setErrors({});
      setServerError('');
    }
  }, [open]);

  const availableTables = useMemo(
    () => tables.filter((t) => t.status === 'available' || t.table_number === tableNumber),
    [tables, tableNumber],
  );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (orderType === 'dine_in' && !tableNumber) e.table = 'Please choose your table number.';
    if (orderType === 'delivery') {
      if (!name.trim()) e.name = 'Your name is required for delivery.';
      if (phone.trim().replace(/\D/g, '').length < 6) e.phone = 'A valid phone number is required.';
      if (!address.trim()) e.address = 'The delivery address is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async () => {
    if (!validate()) return;
    setPlacing(true);
    setServerError('');
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
          payment_method: payment,
          items: lines.map((l) => ({
            product_id: l.product.id,
            quantity: l.qty,
            sauce_ids: l.sauces.map((s) => s.id),
            supplement_ids: l.supplements.map((s) => s.id),
          })),
        }),
      });
      clear();
      onClose();
      onPlaced(order);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not place the order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/50 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
              {step === 'checkout' && (
                <button onClick={() => setStep('cart')} className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100" aria-label="Back">
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 className="font-display text-lg font-bold text-zinc-900">
                {step === 'cart' ? 'Your cart' : 'Checkout'}
              </h2>
              <span className="ml-auto text-sm font-semibold text-zinc-400">{lines.length} item{lines.length === 1 ? '' : 's'}</span>
            </div>

            <div className="flex-1 overflow-y-auto thin-scroll px-5 py-4">
              {lines.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-400">Your cart is empty. Add something tasty! 🍔</p>
              ) : step === 'cart' ? (
                <ul className="space-y-3">
                  {lines.map((l) => {
                    const unitPrice = l.product.price
                      + l.sauces.reduce((n, s) => n + s.price, 0)
                      + l.supplements.reduce((n, s) => n + s.price, 0);
                    const addOnNames = [...l.sauces, ...l.supplements].map((s) => s.name);
                    return (
                      <li key={l.key} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-2.5">
                        <img src={l.product.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-900">{l.product.name}</p>
                          {addOnNames.length > 0 && (
                            <p className="truncate text-[11px] text-zinc-400">+ {addOnNames.join(', ')}</p>
                          )}
                          <p className="text-sm font-bold text-burnt">{money(unitPrice * l.qty)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => dec(l.key)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm" aria-label="Decrease"><Minus size={13} /></button>
                          <span className="w-5 text-center text-sm font-bold">{l.qty}</span>
                          <button onClick={() => inc(l.key)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm" aria-label="Increase"><Plus size={13} /></button>
                          <button onClick={() => remove(l.key)} className="ml-1 text-zinc-300 hover:text-red-500" aria-label="Remove"><Trash2 size={16} /></button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="space-y-5">
                  {/* order type */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">How would you like your order?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {TYPE_OPTIONS.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setOrderType(t.value)}
                          className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition ${
                            orderType === t.value
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-zinc-100 bg-white text-zinc-500 hover:border-zinc-200'
                          }`}
                        >
                          <t.Icon size={20} />
                          <span className="text-xs font-bold">{t.label}</span>
                          <span className="text-[10px] leading-tight opacity-70">{t.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* dine-in: table picker */}
                  {orderType === 'dine_in' && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Your table number</p>
                      <div className="grid grid-cols-6 gap-2">
                        {availableTables.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTableNumber(t.table_number)}
                            className={`rounded-xl py-2.5 text-sm font-bold transition ${
                              tableNumber === t.table_number
                                ? 'bg-brand-500 text-white shadow-md shadow-orange-500/30'
                                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            }`}
                          >
                            {t.table_number}
                          </button>
                        ))}
                      </div>
                      {errors.table && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.table}</p>}
                    </div>
                  )}

                  {/* delivery: customer details */}
                  {orderType === 'delivery' && (
                    <div className="space-y-3">
                      <div>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name *" className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 ${errors.name ? 'border-red-300' : 'border-zinc-200'}`} />
                        {errors.name && <p className="mt-1 text-xs font-medium text-red-500">{errors.name}</p>}
                      </div>
                      <div>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number *" type="tel" className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 ${errors.phone ? 'border-red-300' : 'border-zinc-200'}`} />
                        {errors.phone && <p className="mt-1 text-xs font-medium text-red-500">{errors.phone}</p>}
                      </div>
                      <div>
                        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address *" rows={2} className={`w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200 ${errors.address ? 'border-red-300' : 'border-zinc-200'}`} />
                        {errors.address && <p className="mt-1 text-xs font-medium text-red-500">{errors.address}</p>}
                      </div>
                    </div>
                  )}

                  {/* notes + payment */}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Notes for the kitchen (optional)</p>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. no onions, extra sauce…" className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-200" />
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Payment</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['card', 'cash'] as const).map((m) => (
                        <button key={m} onClick={() => setPayment(m)} className={`rounded-xl border-2 py-2.5 text-sm font-bold capitalize transition ${payment === m ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-100 text-zinc-500'}`}>
                          {m === 'card' ? '💳 Card' : '💶 Cash'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* totals */}
                  <div className="space-y-1.5 rounded-2xl bg-zinc-50 p-4 text-sm">
                    <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                    <div className="flex justify-between text-zinc-500"><span>VAT (10%)</span><span>{money(tax)}</span></div>
                    <div className="flex justify-between border-t border-zinc-200 pt-2 font-display text-base font-bold text-zinc-900"><span>Total</span><span className="text-burnt">{money(total)}</span></div>
                  </div>

                  {serverError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{serverError}</p>}
                </div>
              )}
            </div>

            {/* footer */}
            {lines.length > 0 && (
              <div className="border-t border-zinc-100 p-4 pb-6">
                {step === 'cart' ? (
                  <button
                    onClick={() => setStep('checkout')}
                    className="flex w-full items-center justify-center gap-1 rounded-full bg-brand-500 py-3.5 font-display text-[15px] font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-600 active:scale-[0.98]"
                  >
                    Checkout · {money(total)} <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    className="w-full rounded-full bg-brand-500 py-3.5 font-display text-[15px] font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60"
                  >
                    {placing ? 'Placing order…' : `Place order · ${money(total)}`}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
