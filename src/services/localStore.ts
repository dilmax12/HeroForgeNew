const LS_PREFIX = 'hfn:';

function keyFor(userId: string | null, suffix: string) {
  return `${LS_PREFIX}${userId || 'guest'}:${suffix}`;
}

export function saveLocalHeroes(userId: string | null, heroes: any[]) {
  try { localStorage.setItem(keyFor(userId, 'heroes'), JSON.stringify(heroes || [])); } catch {}
}

export function loadLocalHeroes(userId: string | null): any[] {
  try {
    const raw = localStorage.getItem(keyFor(userId, 'heroes'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveLocalQuests(userId: string | null, quests: any[]) {
  try { localStorage.setItem(keyFor(userId, 'quests'), JSON.stringify(quests || [])); } catch {}
}

export function loadLocalQuests(userId: string | null): any[] {
  try {
    const raw = localStorage.getItem(keyFor(userId, 'quests'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function exportLocalData(userId: string | null): any {
  return {
    heroes: loadLocalHeroes(userId),
    quests: loadLocalQuests(userId)
  };
}

export function importLocalData(userId: string | null, data: any) {
  try {
    if (data?.heroes) saveLocalHeroes(userId, data.heroes);
    if (data?.quests) saveLocalQuests(userId, data.quests);
  } catch {}
}

export function clearLocalData(userId: string | null) {
  try {
    localStorage.removeItem(keyFor(userId, 'heroes'));
    localStorage.removeItem(keyFor(userId, 'quests'));
  } catch {}
}

function toB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(s: string) {
  const bin = atob(s);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(pass: string, salt: Uint8Array) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(pass), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function encryptLocalJson(obj: any, passphrase: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { kdf: 'pbkdf2', salt: toB64(salt.buffer), iv: toB64(iv.buffer), data: toB64(cipher) };
}

export async function decryptLocalJson(payload: any, passphrase: string) {
  const salt = new Uint8Array(fromB64(payload.salt));
  const iv = new Uint8Array(fromB64(payload.iv));
  const key = await deriveKey(passphrase, salt);
  const cipherBuf = fromB64(payload.data);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf);
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plain));
}
export function appendSyncHistory(userId: string | null, entry: { ts: string; heroesImported: number; questsImported: number; heroesIgnored: number }) {
  try {
    const raw = localStorage.getItem(keyFor(userId, 'sync_history'));
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(entry);
    while (arr.length > 10) arr.pop();
    localStorage.setItem(keyFor(userId, 'sync_history'), JSON.stringify(arr));
  } catch {}
}

export function loadSyncHistory(userId: string | null): Array<{ ts: string; heroesImported: number; questsImported: number; heroesIgnored: number }> {
  try {
    const raw = localStorage.getItem(keyFor(userId, 'sync_history'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}