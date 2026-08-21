import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, ShoppingBag, ShoppingBasket, Star } from 'lucide-react';
import type { Category, Order, Product } from '../lib/types';
import { money, selectCountLabel } from './menu-helpers';
import { useCartStore, selectCount, selectSubtotal } from '../stores/cartStore';
import ProductCard from '../components/customer/ProductCard';
import ProductSheet from '../components/customer/ProductSheet';
import CartSheet from '../components/customer/CartSheet';
import OrderTracker from '../components/customer/OrderTracker';
import Spinner from '../components/ui/Spinner';

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [detail, setDetail] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placed, setPlaced] = useState<Order | null>(null);

  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);
  const add = useCartStore((s) => s.add);

  useEffect(() => {
    Promise.all([fetch('/api/categories').then((r) => r.json()), fetch('/api/products').then((r) => r.json())])
      .then(([cats, prods]) => {
        setCategories(Array.isArray(cats) ? cats.filter((c: Category) => c.is_active) : []);
        setProducts(Array.isArray(prods) ? prods : []);
      })
      .catch((e) => console.error('menu load failed', e))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
    return activeCat === 'all' ? sorted : sorted.filter((p) => p.category_id === activeCat);
  }, [products, activeCat]);

  return (
    <div className="min-h-screen bg-orange-50/70 pb-28">
      <div className="mx-auto max-w-md px-4 md:max-w-3xl lg:max-w-5xl">
        {/* header */}
        <header className="sticky top-0 z-30 -mx-4 bg-orange-50/90 px-4 pb-2 pt-4 backdrop-blur md:mx-0 md:px-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 text-xl shadow-md shadow-orange-500/30">🍽️</div>
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight text-zinc-900">Restolink</h1>
              <p className="text-[11px] font-medium text-zinc-500">E-Menu · order right from your table</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-sm">
              <Star size={12} className="fill-brand-400 text-brand-400" /> 4.9
            </span>
          </div>

          {/* hero strip */}
          <div className="mt-3 rounded-2xl bg-gradient-to-r from-brand-500 to-burnt p-4 text-white shadow-lg shadow-orange-500/25">
            <p className="font-display text-lg font-bold leading-tight">Fresh. Fast. Served with a smile.</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-medium">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5"><Clock size={11} /> ~15 min</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5"><ShoppingBag size={11} /> Dine-in · Takeaway · Delivery</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5"><MapPin size={11} /> 12 Rue Gourmet, Paris</span>
            </div>
          </div>

          {/* category chips */}
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            <button
              onClick={() => setActiveCat('all')}
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${activeCat === 'all' ? 'bg-zinc-900 text-white shadow' : 'bg-white text-zinc-600 shadow-sm'}`}
            >
              ✨ All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition ${activeCat === c.id ? 'bg-zinc-900 text-white shadow' : 'bg-white text-zinc-600 shadow-sm'}`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </header>

        {/* product grid */}
        {loading ? (
          <Spinner label="Loading the menu…" />
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-400">Nothing here yet — check another category!</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={setDetail} onQuickAdd={(prod) => add(prod, 1)} />
            ))}
          </div>
        )}
      </div>

      {/* floating cart bar */}
      {count > 0 && !placed && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between rounded-full bg-zinc-900 px-5 py-4 text-white shadow-2xl transition active:scale-[0.98]"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBasket size={18} className="text-brand-400" />
            {selectCountLabel(count)}
          </span>
          <span className="font-display text-[15px] font-bold">View cart · {money(subtotal)}</span>
        </motion.button>
      )}

      <ProductSheet key={detail?.id ?? 'none'} product={detail} onClose={() => setDetail(null)} onAdd={(p, q, sauces) => add(p, q, sauces)} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} onPlaced={setPlaced} />
      {placed && <OrderTracker order={placed} onClose={() => setPlaced(null)} />}
    </div>
  );
}
