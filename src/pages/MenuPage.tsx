import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, ShoppingBag, ShoppingBasket, UtensilsCrossed, X } from 'lucide-react';
import type { Category, Order, Product } from '../lib/types';
import { money } from './menu-helpers';
import { useSettings } from '../lib/settings';
import { useCartStore, selectCount, selectSubtotal } from '../stores/cartStore';
import ProductCard from '../components/customer/ProductCard';
import ProductSheet from '../components/customer/ProductSheet';
import CartSheet from '../components/customer/CartSheet';
import OrderTracker from '../components/customer/OrderTracker';
import Spinner from '../components/ui/Spinner';

// Small, self-contained dictionary for the fixed shell text on this page
// only (header, nav, loading/empty states, search). Category and product
// names come from the admin panel and are shown as entered — there's no
// stored translation for them, so they don't switch with the toggle.
// Sauce/supplement labels, the cart, and checkout aren't covered either;
// wiring those up would need a proper translation store, a bigger job than
// this page's own text.
const STRINGS = {
  en: {
    all: 'All',
    loading: 'Loading the menu…',
    empty: 'Nothing here yet — check another category!',
    searchPlaceholder: 'Search products…',
    noResults: (q: string) => `No products match "${q}"`,
    menu: 'Menu',
    search: 'Search',
    viewCart: 'View cart',
    item: (n: number) => (n === 1 ? '1 item' : `${n} items`),
  },
  fr: {
    all: 'Tout',
    loading: 'Chargement du menu…',
    empty: 'Rien ici pour le moment — essayez une autre catégorie !',
    searchPlaceholder: 'Rechercher un produit…',
    noResults: (q: string) => `Aucun produit ne correspond à "${q}"`,
    menu: 'Menu',
    search: 'Recherche',
    viewCart: 'Voir le panier',
    item: (n: number) => (n === 1 ? '1 article' : `${n} articles`),
  },
} as const;

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [detail, setDetail] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'fr'>('en');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  // The last placed order and whether its tracker is currently shown are
  // kept separate: closing the tracker (via its own X, or by tapping the
  // bell again) shouldn't forget the order, so the bell can bring it back.
  const [order, setOrder] = useState<Order | null>(null);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [orderUnseen, setOrderUnseen] = useState(false);

  const t = STRINGS[lang];
  const settings = useSettings();
  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);
  const add = useCartStore((s) => s.add);

  useEffect(() => {
    Promise.all([fetch('/api/categories').then((r) => r.json()), fetch('/api/products').then((r) => r.json())])
      .then(([cats, prods]) => {
        // Keep the full list (including inactive categories) for the chip
        // strip's own bookkeeping — it filters to active ones itself.
        setCategories(Array.isArray(cats) ? cats : []);
        setProducts(Array.isArray(prods) ? prods : []);
      })
      .catch((e) => console.error('menu load failed', e))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
    const byCat = activeCat === 'all' ? sorted : sorted.filter((p) => p.category_id === activeCat);
    const q = search.trim().toLowerCase();
    return q ? byCat.filter((p) => p.name.toLowerCase().includes(q)) : byCat;
  }, [products, activeCat, search]);

  return (
    <div className="min-h-screen bg-zinc-50 pb-36">
      <div className="mx-auto max-w-md px-4 md:max-w-3xl lg:max-w-5xl">
        {/* header */}
        <header className="sticky top-0 z-30 -mx-4 border-b border-zinc-100 bg-white/90 px-4 pb-3 pt-4 backdrop-blur md:mx-0 md:px-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-brand-500 text-lg shadow-sm shadow-orange-500/30">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                '🍽️'
              )}
            </div>
            <h1 className="font-display text-[17px] font-extrabold tracking-tight text-zinc-900">{settings?.restaurant_name || 'Restolink'}</h1>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-full bg-zinc-100 p-0.5">
                <button
                  onClick={() => setLang('en')}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${lang === 'en' ? 'bg-brand-500 text-white' : 'text-zinc-500'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang('fr')}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${lang === 'fr' ? 'bg-brand-500 text-white' : 'text-zinc-500'}`}
                >
                  FR
                </button>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                aria-label="Cart"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100"
              >
                <ShoppingBag size={19} />
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* category rail */}
          <div className="no-scrollbar -mx-4 mt-3.5 flex gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            <button onClick={() => setActiveCat('all')} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition ${activeCat === 'all' ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-zinc-100'}`}>
                ✨
              </span>
              <span className={`text-[10px] font-semibold ${activeCat === 'all' ? 'text-brand-600' : 'text-zinc-500'}`}>{t.all}</span>
            </button>
            {categories.filter((c) => c.is_active).map((c) => (
              <button key={c.id} onClick={() => setActiveCat(c.id)} className="flex shrink-0 flex-col items-center gap-1.5">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition ${activeCat === c.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-zinc-100'}`}>
                  {c.icon}
                </span>
                <span className={`max-w-[56px] truncate text-[10px] font-semibold ${activeCat === c.id ? 'text-brand-600' : 'text-zinc-500'}`}>
                  {c.name}
                </span>
              </button>
            ))}
          </div>

          {/* inline search — opened from the bottom nav */}
          {searchOpen && (
            <div className="mt-3">
              <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-2.5">
                <Search size={16} className="shrink-0 text-zinc-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="flex-1 bg-transparent text-[13px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="shrink-0 text-zinc-400" aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* product grid */}
        {loading ? (
          <Spinner label={t.loading} />
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-400">{search ? t.noResults(search) : t.empty}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={setDetail} onQuickAdd={(prod) => add(prod, 1)} />
            ))}
          </div>
        )}
      </div>

      {/* floating cart bar — sits just above the bottom nav */}
      {count > 0 && !trackerOpen && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-20 z-40 mx-auto flex max-w-md items-center justify-between rounded-full bg-zinc-900 px-5 py-4 text-white shadow-2xl transition active:scale-[0.98]"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBasket size={18} className="text-brand-400" />
            {t.item(count)}
          </span>
          <span className="font-display text-[15px] font-bold">{t.viewCart} · {money(subtotal)}</span>
        </motion.button>
      )}

      {/* bottom nav — Menu / Search / order status */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-around px-6 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 md:max-w-3xl lg:max-w-5xl">
          <button onClick={() => setSearchOpen(false)} className="flex flex-col items-center gap-0.5">
            <UtensilsCrossed size={19} className={!searchOpen ? 'text-zinc-900' : 'text-zinc-400'} />
            <span className={`text-[10px] font-semibold ${!searchOpen ? 'text-zinc-900' : 'text-zinc-400'}`}>{t.menu}</span>
          </button>
          <button onClick={() => setSearchOpen((v) => !v)} className="flex flex-col items-center gap-0.5">
            <Search size={19} className={searchOpen ? 'text-zinc-900' : 'text-zinc-400'} />
            <span className={`text-[10px] font-semibold ${searchOpen ? 'text-zinc-900' : 'text-zinc-400'}`}>{t.search}</span>
          </button>
          <button
            onClick={() => {
              if (!order) return;
              setTrackerOpen(true);
              setOrderUnseen(false);
            }}
            disabled={!order}
            aria-label="Order status"
            title={order ? undefined : 'No active order yet'}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${order ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-300'}`}
          >
            <Bell size={17} />
            {orderUnseen && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
          </button>
        </div>
      </nav>

      <ProductSheet key={detail?.id ?? 'none'} product={detail} onClose={() => setDetail(null)} onAdd={(p, q, sauces, supplements) => add(p, q, sauces, supplements)} />
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onPlaced={(o) => {
          setOrder(o);
          setTrackerOpen(true);
          setOrderUnseen(true);
        }}
      />
      {order && trackerOpen && <OrderTracker order={order} onClose={() => setTrackerOpen(false)} />}
    </div>
  );
}
