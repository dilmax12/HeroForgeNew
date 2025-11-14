// Simple persistent image cache using localStorage
// Stores entries keyed by prompt. Each entry has url, expiresAt, and source.

type ImageCacheEntry = {
  url: string;
  expiresAt: number;
  source?: 'lexica' | 'pollinations' | 'hf' | 'other';
};

const STORAGE_KEY = 'hero-forge-image-cache-v2';

function loadStore(): Record<string, ImageCacheEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj as Record<string, ImageCacheEntry>;
    return {};
  } catch {
    return {};
  }
}

function saveStore(store: Record<string, ImageCacheEntry>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

export function getCachedImage(prompt: string): string | null {
  const store = loadStore();
  const entry = store[prompt];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete store[prompt];
    saveStore(store);
    return null;
  }
  const url = entry.url || '';
  if (typeof url === 'string' && url.includes('pollinations.ai')) {
    return `/api/pollinations-image?prompt=${encodeURIComponent(prompt)}&width=512&height=512`;
  }
  return url;
}

export function setCachedImage(prompt: string, url: string, ttlMs: number, source?: ImageCacheEntry['source']) {
  if (typeof url !== 'string') return;
  if (url.startsWith('data:')) return;
  const store = loadStore();
  store[prompt] = {
    url,
    expiresAt: Date.now() + Math.max(ttlMs, 60_000),
    source: source || 'other'
  };
  saveStore(store);
}

export function purgeExpiredCache() {
  const store = loadStore();
  let changed = false;
  for (const key of Object.keys(store)) {
    if (Date.now() > store[key].expiresAt) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) saveStore(store);
}
