import { getCachedSettings } from './settings';

// Symbol/label shown before the amount. DH and DA read a little oddly as a
// prefix (they're usually written after the number), but a single prefix
// format keeps every call site simple for v1 — this is the one place to
// change if that's revisited.
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', MAD: 'DH', DZD: 'DA',
};

// Falls back to € whenever settings haven't loaded yet (e.g. very first
// paint before loadSettings() resolves in App.tsx) or the currency stored
// isn't recognized.
export const money = (n: number): string => {
  const currency = getCachedSettings()?.currency ?? 'EUR';
  const symbol = CURRENCY_SYMBOLS[currency] ?? '€';
  return `${symbol}${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;
};

export const orderNumber = (id: number): string => `#${id + 1000}`;

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString();
}

export const clock = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
