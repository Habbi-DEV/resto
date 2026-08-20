import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '../lib/types';

export interface CartLine {
  product: Product;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  add: (p: Product, qty?: number) => void;
  inc: (productId: number) => void;
  dec: (productId: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

/**
 * Shared cart (Zustand + localStorage persistence) used by both the
 * customer e-menu and the cashier register.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (p, qty = 1) =>
        set((s) => {
          const i = s.lines.findIndex((l) => l.product.id === p.id);
          if (i >= 0) {
            const lines = [...s.lines];
            lines[i] = { ...lines[i], qty: lines[i].qty + qty };
            return { lines };
          }
          return { lines: [...s.lines, { product: p, qty }] };
        }),
      inc: (id) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.product.id === id ? { ...l, qty: l.qty + 1 } : l)),
        })),
      dec: (id) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.product.id === id ? { ...l, qty: Math.max(1, l.qty - 1) } : l,
          ),
        })),
      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.product.id !== id) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'restolink-cart' },
  ),
);

export const selectCount = (s: CartState): number => s.lines.reduce((n, l) => n + l.qty, 0);
export const selectSubtotal = (s: CartState): number =>
  s.lines.reduce((n, l) => n + l.qty * l.product.price, 0);
