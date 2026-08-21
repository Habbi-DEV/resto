import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import type { Product, Sauce } from '../../lib/types';
import { money } from '../../lib/format';

interface Props {
  product: Product | null;
  onClose: () => void;
  onAdd: (p: Product, qty: number, sauces: Sauce[]) => void;
}

export default function ProductSheet({ product, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(1);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [sauces, setSauces] = useState<Sauce[]>([]);
  const [selectedSauceIds, setSelectedSauceIds] = useState<number[]>([]);

  // Cover photo first, then the gallery — one strip customers can flip through.
  const photos = product
    ? [product.image_url, ...(product.images ?? []).map((i) => i.url)].filter(Boolean)
    : [];

  useEffect(() => {
    if (!product) return;
    setQty(1);
    setPhotoIdx(0);
    setSelectedSauceIds([]);
    fetch('/api/sauces?active=1')
      .then((r) => r.json())
      .then((d: Sauce[]) => setSauces(Array.isArray(d) ? d : []))
      .catch(() => setSauces([]));
  }, [product]);

  const toggleSauce = (id: number) =>
    setSelectedSauceIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const chosenSauces = sauces.filter((s) => selectedSauceIds.includes(s.id));
  const unitPrice = product ? product.price + chosenSauces.reduce((n, s) => n + s.price, 0) : 0;

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/50 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            <div className="relative h-52 shrink-0 bg-orange-100">
              {photos.length > 0 && (
                <img src={photos[photoIdx]} alt={product.name} className="h-full w-full object-cover" />
              )}
              <button
                onClick={onClose}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm backdrop-blur-sm transition hover:bg-white active:scale-90"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm backdrop-blur-sm transition hover:bg-white active:scale-90"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                </>
              )}
              {photos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      aria-label={`Photo ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${i === photoIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-y-auto thin-scroll p-5 pb-8">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-zinc-900">{product.name}</h2>
                <span className="font-display text-lg font-bold text-burnt">{money(unitPrice)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{product.description}</p>

              {sauces.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-400">Sauces</p>
                  <div className="flex flex-wrap gap-2">
                    {sauces.map((s) => {
                      const active = selectedSauceIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleSauce(s.id)}
                          className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${
                            active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-100 bg-white text-zinc-500 hover:border-zinc-200'
                          }`}
                        >
                          {s.name}{s.price > 0 ? ` +${money(s.price)}` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center gap-3">
                <div className="flex items-center gap-4 rounded-full bg-zinc-100 px-2 py-1.5">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm active:scale-90"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-display text-lg font-bold">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(20, q + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm active:scale-90"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    onAdd(product, qty, chosenSauces);
                    onClose();
                  }}
                  className="flex-1 rounded-full bg-brand-500 py-3.5 font-display text-[15px] font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-600 active:scale-[0.98]"
                >
                  Add to cart · {money(unitPrice * qty)}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}