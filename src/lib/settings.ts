import type { Settings } from './types';

// In-memory cache of the single `settings` row, loaded once (from App.tsx)
// and kept fresh whenever the admin Settings page saves changes. Read
// synchronously by money() in format.ts — see getCachedSettings().
let cached: Settings | null = null;

export function getCachedSettings(): Settings | null {
  return cached;
}

export function setCachedSettings(settings: Settings): void {
  cached = settings;
}

/** Fetches /api/settings (public endpoint) and populates the cache. */
export async function loadSettings(): Promise<Settings | null> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return null;
    const data = (await res.json()) as Settings;
    cached = data;
    return data;
  } catch (err) {
    console.error('Failed to load settings:', err);
    return null;
  }
}
