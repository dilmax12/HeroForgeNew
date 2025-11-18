import { supabase, supabaseConfigured } from '../lib/supabaseClient';

export type SocialEvent = {
  id: string;
  name: string;
  description: string;
  dateTime: string;
  locationText?: string;
  lat?: number;
  lng?: number;
  capacity: number;
  tags: string[];
  privacy: 'public' | 'private' | 'invite';
  ownerId: string;
  createdAt: string;
  attendees?: Record<string, 'yes' | 'no' | 'maybe'>;
  invitedIds?: string[];
  deleted?: boolean;
};

export type EventMessage = { id: string; userId: string; text: string; ts: number };
export type EventMedia = { id: string; userId: string; url: string; caption?: string; ts: number };
export type Pagination = { total: number; offset: number; limit: number; hasMore: boolean };
export type Paged<T> = { items: T[]; pagination: Pagination };
export type PageLinks = { prev?: string; next?: string };

const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_BASE_URL) || (() => {
  try {
    const p = typeof window !== 'undefined' ? window.location.port : '';
    if (p === '4174') return 'http://localhost:3001';
  } catch {}
  return '';
})();

function makeUrl(path: string, qs?: URLSearchParams): string {
  try {
    const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
    const url = new URL(path, base);
    if (qs) url.search = qs.toString();
    return url.toString();
  } catch {
    if (qs) return `${path}?${qs.toString()}`;
    return path;
  }
}

async function authHeaders(userId?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  if (!headers['Authorization'] && userId && !supabaseConfigured) headers['X-User-Id'] = userId;
  return headers;
}

function parseLinkHeader(link?: string | null): PageLinks {
  const out: PageLinks = {};
  if (!link) return out;
  const parts = String(link).split(',');
  for (const p of parts) {
    const m = /<([^>]+)>;\s*rel="(prev|next)"/i.exec(p.trim());
    if (m) {
      const url = m[1];
      const rel = m[2].toLowerCase();
      if (rel === 'prev') out.prev = url; else if (rel === 'next') out.next = url;
    }
  }
  return out;
}

async function handleError(res: Response): Promise<never> {
  if (res.status === 409) {
    throw new Error('Limite de participantes atingido');
  }
  try {
    const j = await res.json();
    const code = j?.code || `HTTP_${res.status}`;
    const msg = j?.message || j?.error || (res.status === 409 ? 'Limite de participantes atingido' : `Falha HTTP ${res.status}`);
    const err = new Error(msg);
    (err as any).code = code;
    (err as any).details = j?.details;
    throw err;
  } catch {
    throw new Error(`Falha HTTP ${res.status}`);
  }
}

export async function listEvents(viewerId: string, opts: { tag?: string; ownerId?: string; limit?: number; offset?: number } = {}): Promise<SocialEvent[]> {
  try {
    if (!API_BASE) return [];
    const q = new URLSearchParams();
    if (viewerId) q.set('viewerId', viewerId);
    if (opts.tag) q.set('tag', opts.tag);
    if (opts.ownerId) q.set('ownerId', opts.ownerId);
    if (typeof opts.limit === 'number') q.set('limit', String(opts.limit));
    if (typeof opts.offset === 'number') q.set('offset', String(opts.offset));
    const headers = await authHeaders(viewerId);
    const res = await fetch(makeUrl('/api/events/list', q), { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.events) ? data.events as SocialEvent[] : [];
  } catch {
    return [];
  }
}

export async function listEventsPaged(viewerId: string, opts: { tag?: string; ownerId?: string; limit?: number; offset?: number } = {}): Promise<Paged<SocialEvent>> {
  try {
    if (!API_BASE) return { items: [], pagination: { total: 0, offset: Number(opts.offset||0), limit: Number(opts.limit||0), hasMore: false } };
    const q = new URLSearchParams();
    if (viewerId) q.set('viewerId', viewerId);
    if (opts.tag) q.set('tag', opts.tag);
    if (opts.ownerId) q.set('ownerId', opts.ownerId);
    if (typeof opts.limit === 'number') q.set('limit', String(opts.limit));
    if (typeof opts.offset === 'number') q.set('offset', String(opts.offset));
    const headers = await authHeaders(viewerId);
    const res = await fetch(makeUrl('/api/events/list', q), { headers });
    if (!res.ok) return { items: [], pagination: { total: 0, offset: Number(opts.offset||0), limit: Number(opts.limit||0), hasMore: false } };
    const data = await res.json();
    const items = Array.isArray(data?.events) ? data.events as SocialEvent[] : [];
    const pagination: Pagination = data?.pagination || { total: items.length, offset: Number(opts.offset||0), limit: Number(opts.limit||items.length||0), hasMore: false };
    return { items, pagination };
  } catch {
    return { items: [], pagination: { total: 0, offset: Number(opts.offset||0), limit: Number(opts.limit||0), hasMore: false } };
  }
}

export async function createEvent(payload: {
  name: string;
  dateTime: string;
  locationText?: string;
  lat?: number;
  lng?: number;
  description?: string;
  capacity?: number;
  tags?: string[];
  privacy?: 'public' | 'private' | 'invite';
  ownerId: string;
  invitedIds?: string[];
}): Promise<SocialEvent> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders(payload.ownerId)) };
  const res = await fetch(makeUrl('/api/events/create'), { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return data?.event as SocialEvent;
}

export async function getEvent(id: string, viewerId?: string): Promise<SocialEvent | null> {
  const q = new URLSearchParams();
  if (viewerId) q.set('viewerId', viewerId);
  const headers = await authHeaders(viewerId);
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}`, q), { headers });
  if (res.status === 404) return null;
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return data?.event as SocialEvent;
}

export async function updateEvent(id: string, actorId: string, updates: Partial<Omit<SocialEvent, 'id' | 'ownerId' | 'createdAt'>>): Promise<SocialEvent> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders(actorId)) };
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/update`), { method: 'POST', headers, body: JSON.stringify({ actorId, updates }) });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return data?.event as SocialEvent;
}

export async function deleteEvent(id: string, actorId: string): Promise<boolean> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders(actorId)) };
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/delete`), { method: 'POST', headers, body: JSON.stringify({ actorId }) });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return !!data?.ok;
}

export async function attendEvent(id: string, viewerId: string, status: 'yes' | 'no' | 'maybe'): Promise<SocialEvent> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders(viewerId)) };
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/attend`), { method: 'POST', headers, body: JSON.stringify({ viewerId, status }) });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return data?.event as SocialEvent;
}

export async function fetchEventChat(id: string, signal?: AbortSignal): Promise<EventMessage[]> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/chat`), { signal });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return Array.isArray(data?.messages) ? data.messages as EventMessage[] : [];
}

export async function sendEventChat(id: string, viewerId: string, text: string): Promise<EventMessage> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders(viewerId)) };
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/chat`), { method: 'POST', headers, body: JSON.stringify({ viewerId, text }) });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return data?.message as EventMessage;
}

export async function addEventMedia(id: string, viewerId: string, url: string, caption?: string): Promise<EventMedia> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders(viewerId)) };
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/media`), { method: 'POST', headers, body: JSON.stringify({ viewerId, url, caption }) });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return data?.media as EventMedia;
}

export async function listEventMedia(id: string, signal?: AbortSignal): Promise<EventMedia[]> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/media`), { signal });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return Array.isArray(data?.media) ? data.media as EventMedia[] : [];
}

export async function rateEvent(id: string, viewerId: string, stars: number, comment?: string): Promise<boolean> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders(viewerId)) };
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/rate`), { method: 'POST', headers, body: JSON.stringify({ viewerId, stars, comment }) });
  if (!res.ok) return handleError(res);
  const data = await res.json();
  return !!data?.ok;
}

export async function recommendEvents(viewerId: string, interestsCsv?: string, opts: { limit?: number; offset?: number } = {}): Promise<SocialEvent[]> {
  try {
    const q = new URLSearchParams();
    if (viewerId) q.set('viewerId', viewerId);
    if (interestsCsv) q.set('interests', interestsCsv);
    if (typeof opts.limit === 'number') q.set('limit', String(opts.limit));
    if (typeof opts.offset === 'number') q.set('offset', String(opts.offset));
    const headers = await authHeaders(viewerId);
    const res = await fetch(makeUrl('/api/events/recommendations', q), { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.events) ? data.events as SocialEvent[] : [];
  } catch {
    return [];
  }
}

export async function recommendEventsPaged(viewerId: string, interestsCsv?: string, opts: { limit?: number; offset?: number } = {}): Promise<Paged<SocialEvent>> {
  try {
    const q = new URLSearchParams();
    if (viewerId) q.set('viewerId', viewerId);
    if (interestsCsv) q.set('interests', interestsCsv);
    if (typeof opts.limit === 'number') q.set('limit', String(opts.limit));
    if (typeof opts.offset === 'number') q.set('offset', String(opts.offset));
    const headers = await authHeaders(viewerId);
    const res = await fetch(makeUrl('/api/events/recommendations', q), { headers });
    if (!res.ok) return { items: [], pagination: { total: 0, offset: Number(opts.offset||0), limit: Number(opts.limit||0), hasMore: false } };
    const data = await res.json();
    const items = Array.isArray(data?.events) ? data.events as SocialEvent[] : [];
    const pagination: Pagination = data?.pagination || { total: items.length, offset: Number(opts.offset||0), limit: Number(opts.limit||items.length||0), hasMore: false };
    return { items, pagination };
  } catch {
    return { items: [], pagination: { total: 0, offset: Number(opts.offset||0), limit: Number(opts.limit||0), hasMore: false } };
  }
}