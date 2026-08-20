import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import type { Product } from '../../lib/types';
import { money } from '../../lib/format';

interface Props {
  product: Product | null;
  onClose: () => void;
  onAdd: (p: Product, qty: number) => void;
}

export default function ProductSheet({ product, onClose, onAdd }: Props) {
  const [qty, setQty] = useState(1);

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
            className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            <div className="relative h-52 bg-orange-100">
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              )}
              <button
                onClick={onClose}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 pb-8">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-zinc-900">{product.name}</h2>
                <span className="font-display text-lg font-bold text-burnt">{money(product.price)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{product.description}</p>

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
                    onAdd(product, qty);
                    onClose();
                  }}
                  className="flex-1 rounded-full bg-brand-500 py-3.5 font-display text-[15px] font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-600 active:scale-[0.98]"
                >
                  Add to cart · {money(product.price * qty)}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
