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

export async function listEvents(viewerId: string, opts: { tag?: string; ownerId?: string; limit?: number; offset?: number } = {}): Promise<SocialEvent[]> {
  try {
    if (!API_BASE) return [];
    const q = new URLSearchParams();
    if (viewerId) q.set('viewerId', viewerId);
    if (opts.tag) q.set('tag', opts.tag);
    if (opts.ownerId) q.set('ownerId', opts.ownerId);
    if (typeof opts.limit === 'number') q.set('limit', String(opts.limit));
    if (typeof opts.offset === 'number') q.set('offset', String(opts.offset));
    const res = await fetch(makeUrl('/api/events/list', q));
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
    const res = await fetch(makeUrl('/api/events/list', q));
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
  const res = await fetch(makeUrl('/api/events/create'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Falha ao criar evento: ${res.status}`);
  const data = await res.json();
  return data?.event as SocialEvent;
}

export async function getEvent(id: string, viewerId?: string): Promise<SocialEvent | null> {
  const q = new URLSearchParams();
  if (viewerId) q.set('viewerId', viewerId);
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}`, q));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao obter evento: ${res.status}`);
  const data = await res.json();
  return data?.event as SocialEvent;
}

export async function updateEvent(id: string, actorId: string, updates: Partial<Omit<SocialEvent, 'id' | 'ownerId' | 'createdAt'>>): Promise<SocialEvent> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/update`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId, updates }) });
  if (!res.ok) throw new Error(`Falha ao atualizar evento: ${res.status}`);
  const data = await res.json();
  return data?.event as SocialEvent;
}

export async function deleteEvent(id: string, actorId: string): Promise<boolean> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/delete`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId }) });
  if (!res.ok) throw new Error(`Falha ao excluir evento: ${res.status}`);
  const data = await res.json();
  return !!data?.ok;
}

export async function attendEvent(id: string, viewerId: string, status: 'yes' | 'no' | 'maybe'): Promise<SocialEvent> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/attend`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewerId, status }) });
  if (!res.ok) {
    if (res.status === 409) {
      try { const j = await res.json(); throw new Error(j?.error || 'Limite de participantes atingido'); } catch { throw new Error('Limite de participantes atingido'); }
    }
    throw new Error(`Falha ao confirmar presença: ${res.status}`);
  }
  const data = await res.json();
  return data?.event as SocialEvent;
}

export async function fetchEventChat(id: string, signal?: AbortSignal): Promise<EventMessage[]> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/chat`), { signal });
  if (!res.ok) throw new Error(`Falha ao carregar chat: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.messages) ? data.messages as EventMessage[] : [];
}

export async function sendEventChat(id: string, viewerId: string, text: string): Promise<EventMessage> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/chat`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewerId, text }) });
  if (!res.ok) throw new Error(`Falha ao enviar mensagem: ${res.status}`);
  const data = await res.json();
  return data?.message as EventMessage;
}

export async function addEventMedia(id: string, viewerId: string, url: string, caption?: string): Promise<EventMedia> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/media`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewerId, url, caption }) });
  if (!res.ok) throw new Error(`Falha ao adicionar mídia: ${res.status}`);
  const data = await res.json();
  return data?.media as EventMedia;
}

export async function listEventMedia(id: string, signal?: AbortSignal): Promise<EventMedia[]> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/media`), { signal });
  if (!res.ok) throw new Error(`Falha ao listar mídia: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.media) ? data.media as EventMedia[] : [];
}

export async function rateEvent(id: string, viewerId: string, stars: number, comment?: string): Promise<boolean> {
  const res = await fetch(makeUrl(`/api/events/${encodeURIComponent(id)}/rate`), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viewerId, stars, comment }) });
  if (res.status === 409) return false;
  if (!res.ok) throw new Error(`Falha ao avaliar: ${res.status}`);
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
    const res = await fetch(makeUrl('/api/events/recommendations', q));
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
    const res = await fetch(makeUrl('/api/events/recommendations', q));
    if (!res.ok) return { items: [], pagination: { total: 0, offset: Number(opts.offset||0), limit: Number(opts.limit||0), hasMore: false } };
    const data = await res.json();
    const items = Array.isArray(data?.events) ? data.events as SocialEvent[] : [];
    const pagination: Pagination = data?.pagination || { total: items.length, offset: Number(opts.offset||0), limit: Number(opts.limit||items.length||0), hasMore: false };
    return { items, pagination };
  } catch {
    return { items: [], pagination: { total: 0, offset: Number(opts.offset||0), limit: Number(opts.limit||0), hasMore: false } };
  }
}