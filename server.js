// Servidor Express local para desenvolvimento
import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { InferenceClient } from '@huggingface/inference';
import { createClient as createSbClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = String(req.headers.origin || '');
  if (ALLOWED_ORIGINS.length && ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  } else if (!ALLOWED_ORIGINS.length) {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  res.set('X-Frame-Options', 'DENY');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Rate limiting simples por IP e caminho (dev server apenas)
const RATE_LIMITS = new Map();
function rateLimit(windowMs = 10000, maxHits = 20) {
  return (req, res, next) => {
    try {
      const ip = (req.ip || 'local').toString();
      const key = `${ip}:${req.path}`;
      const now = Date.now();
      const entry = RATE_LIMITS.get(key) || { hits: 0, start: now };
      if (now - entry.start > windowMs) {
        entry.hits = 0;
        entry.start = now;
      }
      entry.hits++;
      RATE_LIMITS.set(key, entry);
      if (entry.hits > maxHits) {
        return res.status(429).json({ error: 'Too many requests' });
      }
      next();
    } catch { next(); }
  };
}

app.use(rateLimit(10000, 30));
app.use('/api/gerar-texto', rateLimit(60000, 12));
app.use('/api/hf-text', rateLimit(60000, 12));
app.use('/api/gerar-imagem', rateLimit(60000, 8));
app.use('/api/pollinations-image', rateLimit(60000, 20));
app.use('/api/login-google', rateLimit(60000, 10));

// Memória simples para leaderboard diário (apenas em dev server)
const dailyLeaderboardByDay = {};
const tavernDiceEvents = [];
const tavernChampions = [];
let lastSnapshotAt = null;
const tavernCronLogs = [];
const tavernRerollUsage = new Map();


app.all('/api/tavern', (req, res) => {
  try {
    const action = String((req.query && (req.query.action || req.query.a)) || '').toLowerCase();
    if (!action) return res.status(400).json({ error: 'Missing action' });
    if (action === 'dice' && req.method === 'POST') {
      const { heroId, heroName, roll, critical = false, betAmount = null, opponentName = null } = req.body || {};
      if (!heroName || typeof roll !== 'number') return res.status(400).json({ error: 'Parâmetros inválidos' });
      tavernDiceEvents.push({ heroId, heroName, roll, critical: !!critical, betAmount: betAmount, opponentName, created_at: new Date().toISOString() });
      return res.json({ ok: true });
    }
    if (action === 'dice-weekly' && req.method === 'GET') {
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = tavernDiceEvents.filter(ev => new Date(ev.created_at).getTime() >= since);
      const map = {};
      recent.forEach(ev => {
        const name = ev.heroName;
        const r = Number(ev.roll || 0);
        const crit = !!ev.critical;
        const cur = map[name] || { heroName: name, best: 0, crits: 0, count: 0 };
        cur.best = Math.max(cur.best, r);
        cur.crits += crit ? 1 : 0;
        cur.count += 1;
        map[name] = cur;
      });
      const entries = Object.values(map).sort((a,b) => { if (b.best !== a.best) return b.best - a.best; if (b.crits !== a.crits) return b.crits - a.crits; return b.count - a.count; }).slice(0, 50);
      return res.json({ entries });
    }
    if (action === 'dice-weekly-snapshot' && req.method === 'POST') {
      const now = new Date();
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const end = now;
      const recent = tavernDiceEvents.filter(ev => { const t = new Date(ev.created_at).getTime(); return t >= start.getTime() && t <= end.getTime(); });
      const score = {};
      recent.forEach(ev => { const name = ev.heroName; const crit = !!ev.critical; score[name] = (score[name] || 0) + (crit ? 12 : 2); });
      const entries = Object.entries(score).sort((a,b) => b[1] - a[1]);
      const top = entries[0];
      if (!top) return res.json({ ok: true, snapshot: null });
      const [heroName, topScore] = top;
      const snap = { id: `c-${Date.now()}`, week_start: start.toISOString(), week_end: end.toISOString(), hero_name: heroName, score: Number(topScore), created_at: new Date().toISOString() };
      tavernChampions.push(snap);
      tavernCronLogs.push({ executed_at: new Date().toISOString(), status: 'success', message: `Snapshot manual para ${heroName}` });
      return res.json({ ok: true, snapshot: snap });
    }
    if (action === 'dice-weekly-champions' && req.method === 'GET') {
      const list = tavernChampions.slice().sort((a,b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime()).slice(0, 20);
      return res.json({ champions: list });
    }
    if (action === 'dice-weekly-cron-status' && req.method === 'GET') {
      const now = new Date();
      const next = (() => { const d = new Date(now); const day = d.getDay(); const diff = (7 - day) % 7; d.setDate(d.getDate() + diff); d.setHours(23, 59, 0, 0); if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7); return d; })();
      return res.json({ nextSnapshotAt: next.toISOString(), lastSnapshotAt });
    }
    if (action === 'dice-weekly-cron-logs' && req.method === 'GET') {
      const logs = tavernCronLogs.slice().sort((a,b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()).slice(0, 20);
      return res.json({ logs });
    }
    if (action === 'reroll-usage-get' && req.method === 'GET') {
      const heroId = String(req.query.heroId || '');
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' });
      const today = new Date().toDateString();
      const key = `${heroId}|${today}`;
      const count = Number(tavernRerollUsage.get(key) || 0);
      return res.json({ count, cap: 5 });
    }
    if (action === 'reroll-usage-increment' && req.method === 'POST') {
      const { heroId } = req.body || {};
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' });
      const today = new Date().toDateString();
      const key = `${heroId}|${today}`;
      const cap = 5;
      const current = Number(tavernRerollUsage.get(key) || 0);
      if (current >= cap) return res.json({ ok: false, reason: 'cap' });
      tavernRerollUsage.set(key, current + 1);
      return res.json({ ok: true, count: current + 1, cap });
    }
    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error('local /api/tavern error:', err);
    return res.status(500).json({ error: 'Erro no servidor local' });
  }
});

setInterval(() => {
  try {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      const today = now.toDateString();
      if (!lastSnapshotAt || new Date(lastSnapshotAt).toDateString() !== today) {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const end = now;
        const recent = tavernDiceEvents.filter(ev => { const t = new Date(ev.created_at).getTime(); return t >= start.getTime() && t <= end.getTime(); });
        const score = {};
        recent.forEach(ev => { const name = ev.heroName; const crit = !!ev.critical; score[name] = (score[name] || 0) + (crit ? 12 : 2); });
        const entries = Object.entries(score).sort((a,b) => b[1] - a[1]);
        const top = entries[0];
        if (top) {
          const [heroName, topScore] = top;
          const snap = { id: `c-${Date.now()}`, week_start: start.toISOString(), week_end: end.toISOString(), hero_name: heroName, score: Number(topScore), created_at: new Date().toISOString() };
          tavernChampions.push(snap);
        }
        lastSnapshotAt = now.toISOString();
        tavernRerollUsage.clear();
      }
    }
  } catch {}
}, 60000);

const activeEvents = new Map();

function eventPublicView(e, viewerId) {
  if (!e) return null;
  const base = {
    id: e.id,
    name: e.name,
    description: e.description,
    dateTime: e.dateTime,
    locationText: e.locationText,
    lat: e.lat,
    lng: e.lng,
    capacity: e.capacity,
    tags: Array.isArray(e.tags) ? e.tags : [],
    privacy: e.privacy,
    ownerId: e.ownerId,
    createdAt: e.createdAt,
    deleted: !!e.deleted
  };
  const canViewPrivate = e.ownerId === viewerId || (Array.isArray(e.invitedIds) && e.invitedIds.includes(viewerId));
  const priv = e.privacy;
  if (priv === 'public') {
    return {
      ...base,
      attendees: Object.fromEntries(Object.entries(e.attendees || {})),
      invitedIds: Array.isArray(e.invitedIds) ? e.invitedIds : []
    };
  }
  if (priv === 'private') {
    return canViewPrivate ? {
      ...base,
      attendees: Object.fromEntries(Object.entries(e.attendees || {})),
      invitedIds: Array.isArray(e.invitedIds) ? e.invitedIds : []
    } : { ...base };
  }
  return canViewPrivate ? {
    ...base,
    attendees: Object.fromEntries(Object.entries(e.attendees || {})),
    invitedIds: Array.isArray(e.invitedIds) ? e.invitedIds : []
  } : { ...base };
}

app.post('/api/events/create', async (req, res) => {
  try {
    const { name, dateTime, locationText, lat, lng, description, capacity, tags, privacy, ownerId, invitedIds } = req.body || {};
    if (!name || !dateTime || !ownerId) return res.status(400).json({ error: 'name, dateTime e ownerId são obrigatórios' });
    const id = `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const ev = {
      id,
      name: String(name).slice(0, 80),
      description: String(description || '').slice(0, 2000),
      dateTime: new Date(dateTime).toISOString(),
      locationText: String(locationText || '').slice(0, 200),
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      capacity: Math.max(1, Math.min(10000, Number(capacity || 100))),
      tags: Array.isArray(tags) ? tags.slice(0, 20).map(t => String(t).slice(0, 32)) : [],
      privacy: ['public','private','invite'].includes(String(privacy)) ? String(privacy) : 'public',
      ownerId: String(ownerId),
      createdAt: new Date().toISOString(),
      attendees: {},
      invitedIds: Array.isArray(invitedIds) ? invitedIds.map(x => String(x)) : [],
      messages: [],
      media: [],
      ratings: [],
      deleted: false
    };
    activeEvents.set(id, ev);
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('events').upsert({ id: ev.id, name: ev.name, description: ev.description, date_time: ev.dateTime, location_text: ev.locationText, lat: ev.lat, lng: ev.lng, capacity: ev.capacity, tags: ev.tags, privacy: ev.privacy, owner_id: ev.ownerId, created_at: ev.createdAt, deleted: ev.deleted }, { onConflict: 'id' });
      }
    } catch {}
    return res.json({ event: eventPublicView(ev, ownerId) });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar evento' });
  }
});

app.get('/api/events/list', (req, res) => {
  try {
    const viewerId = String(req.query.viewerId || '');
    const tag = String(req.query.tag || '');
    const ownerId = String(req.query.ownerId || '');
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const all = Array.from(activeEvents.values()).filter(e => {
      if (e.deleted) return false;
      if (ownerId && e.ownerId !== ownerId) return false;
      if (tag && !(Array.isArray(e.tags) && e.tags.map(t => String(t).toLowerCase()).includes(tag.toLowerCase()))) return false;
      if (e.privacy === 'public') return true;
      if (e.privacy === 'private') return e.ownerId === viewerId;
      return e.ownerId === viewerId || (Array.isArray(e.invitedIds) && e.invitedIds.includes(viewerId));
    });
    const slice = all.slice(offset, offset + limit).map(e => eventPublicView(e, viewerId));
    return res.json({ events: slice, pagination: { total: all.length, offset, limit, hasMore: offset + limit < all.length } });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar eventos' });
  }
});

app.get('/api/events/recommendations', (req, res) => {
  try {
    const viewerId = String(req.query.viewerId || '');
    const interests = String(req.query.interests || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const all = Array.from(activeEvents.values()).filter(e => {
      if (e.deleted) return false;
      if (e.ownerId === viewerId) return false;
      if (e.privacy !== 'public') return false;
      const count = Object.values(e.attendees || {}).filter(v => v === 'yes').length;
      if (count >= e.capacity) return false;
      if (!interests.length) return true;
      const etags = (Array.isArray(e.tags) ? e.tags : []).map(t => String(t).toLowerCase());
      return interests.some(t => etags.includes(t));
    });
    const slice = all.slice(offset, offset + limit).map(e => eventPublicView(e, viewerId));
    return res.json({ events: slice, pagination: { total: all.length, offset, limit, hasMore: offset + limit < all.length } });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao recomendar eventos' });
  }
});

app.get('/api/events/:id', (req, res) => {
  try {
    const viewerId = String(req.query.viewerId || '');
    const ev = activeEvents.get(String(req.params.id));
    if (!ev || ev.deleted) return res.status(404).json({ error: 'Evento não encontrado' });
    return res.json({ event: eventPublicView(ev, viewerId) });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao obter evento' });
  }
});

app.post('/api/events/:id/update', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { actorId, updates } = req.body || {};
    const ev = activeEvents.get(id);
    if (!ev || ev.deleted) return res.status(404).json({ error: 'Evento não encontrado' });
    if (ev.ownerId !== String(actorId)) return res.status(403).json({ error: 'Apenas o organizador pode alterar' });
    const patch = updates || {};
    if (patch.name) ev.name = String(patch.name).slice(0, 80);
    if (patch.description !== undefined) ev.description = String(patch.description || '').slice(0, 2000);
    if (patch.dateTime) ev.dateTime = new Date(patch.dateTime).toISOString();
    if (patch.locationText !== undefined) ev.locationText = String(patch.locationText || '').slice(0, 200);
    if (typeof patch.lat === 'number') ev.lat = patch.lat;
    if (typeof patch.lng === 'number') ev.lng = patch.lng;
    if (patch.capacity) ev.capacity = Math.max(1, Math.min(10000, Number(patch.capacity)));
    if (Array.isArray(patch.tags)) ev.tags = patch.tags.slice(0, 20).map(t => String(t).slice(0, 32));
    if (patch.privacy && ['public','private','invite'].includes(String(patch.privacy))) ev.privacy = String(patch.privacy);
    if (Array.isArray(patch.invitedIds)) ev.invitedIds = patch.invitedIds.map(x => String(x));
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('events').upsert({ id: ev.id, name: ev.name, description: ev.description, date_time: ev.dateTime, location_text: ev.locationText, lat: ev.lat, lng: ev.lng, capacity: ev.capacity, tags: ev.tags, privacy: ev.privacy, owner_id: ev.ownerId, created_at: ev.createdAt, deleted: ev.deleted }, { onConflict: 'id' });
      }
    } catch {}
    return res.json({ event: eventPublicView(ev, actorId) });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar evento' });
  }
});

app.post('/api/events/:id/delete', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { actorId } = req.body || {};
    const ev = activeEvents.get(id);
    if (!ev || ev.deleted) return res.json({ ok: true });
    if (ev.ownerId !== String(actorId)) return res.status(403).json({ error: 'Apenas o organizador pode excluir' });
    ev.deleted = true;
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('events').upsert({ id: ev.id, deleted: true }, { onConflict: 'id' });
      }
    } catch {}
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir evento' });
  }
});

app.post('/api/events/:id/attend', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { viewerId, status } = req.body || {};
    const ev = activeEvents.get(id);
    if (!ev || ev.deleted) return res.status(404).json({ error: 'Evento não encontrado' });
    const st = String(status || '').toLowerCase();
    if (!['yes','no','maybe'].includes(st)) return res.status(400).json({ error: 'status inválido' });
    const currentCount = Object.values(ev.attendees || {}).filter(v => v === 'yes').length;
    if (st === 'yes' && currentCount >= ev.capacity) return res.status(409).json({ error: 'Limite de participantes atingido' });
    if (!ev.attendees) ev.attendees = {};
    ev.attendees[String(viewerId)] = st;
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('event_attendance').upsert({ event_id: id, user_id: String(viewerId), status: st, updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' });
      }
    } catch {}
    return res.json({ event: eventPublicView(ev, viewerId) });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao confirmar presença' });
  }
});

app.get('/api/events/:id/chat', (req, res) => {
  try {
    const id = String(req.params.id);
    const ev = activeEvents.get(id);
    if (!ev || ev.deleted) return res.status(404).json({ error: 'Evento não encontrado' });
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 100)));
    const msgs = Array.isArray(ev.messages) ? ev.messages.slice(-limit) : [];
    return res.json({ messages: msgs });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar chat' });
  }
});

app.post('/api/events/:id/chat', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { viewerId, text } = req.body || {};
    const ev = activeEvents.get(id);
    if (!ev || ev.deleted) return res.status(404).json({ error: 'Evento não encontrado' });
    const priv = ev.privacy;
    const isAllowed = priv === 'public' || ev.ownerId === String(viewerId) || (Array.isArray(ev.invitedIds) && ev.invitedIds.includes(String(viewerId))) || (ev.attendees && ev.attendees[String(viewerId)]);
    if (!isAllowed) return res.status(403).json({ error: 'Sem permissão para chat' });
    const msg = { id: `em-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, userId: String(viewerId), text: String(text || '').slice(0, 500), ts: Date.now() };
    ev.messages = ev.messages || [];
    ev.messages.push(msg);
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('event_messages').insert({ event_id: id, user_id: String(viewerId), text: msg.text, ts: new Date(msg.ts).toISOString() });
      }
    } catch {}
    return res.json({ ok: true, message: msg });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

app.post('/api/events/:id/media', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { viewerId, url, caption } = req.body || {};
    const ev = activeEvents.get(id);
    if (!ev || ev.deleted) return res.status(404).json({ error: 'Evento não encontrado' });
    const priv = ev.privacy;
    const isAllowed = priv === 'public' || ev.ownerId === String(viewerId) || (Array.isArray(ev.invitedIds) && ev.invitedIds.includes(String(viewerId))) || (ev.attendees && ev.attendees[String(viewerId)]);
    if (!isAllowed) return res.status(403).json({ error: 'Sem permissão para mídia' });
    const item = { id: `md-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, userId: String(viewerId), url: String(url || '').slice(0, 500), caption: String(caption || '').slice(0, 200), ts: Date.now() };
    ev.media = ev.media || [];
    ev.media.push(item);
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('event_media').insert({ event_id: id, user_id: String(viewerId), url: item.url, caption: item.caption, ts: new Date(item.ts).toISOString() });
      }
    } catch {}
    return res.json({ ok: true, media: item });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao compartilhar mídia' });
  }
});

app.get('/api/events/:id/media', (req, res) => {
  try {
    const id = String(req.params.id);
    const ev = activeEvents.get(id);
    if (!ev || ev.deleted) return res.status(404).json({ error: 'Evento não encontrado' });
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 100)));
    const list = Array.isArray(ev.media) ? ev.media.slice(-limit) : [];
    return res.json({ media: list });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar mídia' });
  }
});

app.post('/api/events/:id/rate', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { viewerId, stars, comment } = req.body || {};
    const ev = activeEvents.get(id);
    if (!ev || ev.deleted) return res.status(404).json({ error: 'Evento não encontrado' });
    const eventTime = new Date(ev.dateTime).getTime();
    if (Date.now() < eventTime) return res.status(409).json({ error: 'Avaliação disponível após o evento' });
    const attended = ev.attendees && ev.attendees[String(viewerId)] === 'yes';
    if (!attended) return res.status(403).json({ error: 'Apenas participantes confirmados podem avaliar' });
    const s = Math.max(1, Math.min(5, Number(stars || 0)));
    const r = { id: `rt-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, userId: String(viewerId), stars: s, comment: String(comment || '').slice(0, 500), ts: Date.now() };
    ev.ratings = ev.ratings || [];
    const prevIdx = ev.ratings.findIndex(x => x.userId === String(viewerId));
    if (prevIdx >= 0) ev.ratings[prevIdx] = r; else ev.ratings.push(r);
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('event_ratings').upsert({ event_id: id, user_id: String(viewerId), stars: s, comment: r.comment, ts: new Date(r.ts).toISOString() }, { onConflict: 'event_id,user_id' });
      }
    } catch {}
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao avaliar' });
  }
});


app.get('/api/events/export', (req, res) => {
  try {
    const ownerId = String(req.query.ownerId || '');
    if (!ownerId) return res.status(400).json({ error: 'ownerId requerido' });
    const list = Array.from(activeEvents.values()).filter(e => e.ownerId === ownerId).map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      dateTime: e.dateTime,
      locationText: e.locationText,
      lat: e.lat,
      lng: e.lng,
      capacity: e.capacity,
      tags: e.tags,
      privacy: e.privacy,
      ownerId: e.ownerId,
      invitedIds: e.invitedIds,
      deleted: !!e.deleted
    }));
    return res.json({ events: list });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao exportar' });
  }
});

app.post('/api/events/import', async (req, res) => {
  try {
    const { actorId, events } = req.body || {};
    if (!actorId || !Array.isArray(events)) return res.status(400).json({ error: 'actorId e events requeridos' });
    const imported = [];
    for (const ev of events) {
      try {
        if (String(ev.ownerId) !== String(actorId)) continue;
        const id = String(ev.id || `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`);
        const obj = {
          id,
          name: String(ev.name || '').slice(0, 80),
          description: String(ev.description || '').slice(0, 2000),
          dateTime: new Date(ev.dateTime || Date.now()).toISOString(),
          locationText: String(ev.locationText || '').slice(0, 200),
          lat: typeof ev.lat === 'number' ? ev.lat : undefined,
          lng: typeof ev.lng === 'number' ? ev.lng : undefined,
          capacity: Math.max(1, Math.min(10000, Number(ev.capacity || 100))),
          tags: Array.isArray(ev.tags) ? ev.tags.slice(0, 20).map(t => String(t).slice(0, 32)) : [],
          privacy: ['public','private','invite'].includes(String(ev.privacy)) ? String(ev.privacy) : 'public',
          ownerId: String(actorId),
          createdAt: new Date().toISOString(),
          attendees: {},
          invitedIds: Array.isArray(ev.invitedIds) ? ev.invitedIds.map(x => String(x)) : [],
          messages: [],
          media: [],
          ratings: [],
          deleted: !!ev.deleted
        };
        activeEvents.set(id, obj);
        imported.push(eventPublicView(obj, actorId));
      } catch {}
    }
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        for (const e of imported) {
          await supabase.from('events').upsert({ id: e.id, name: e.name, description: e.description, date_time: e.dateTime, location_text: e.locationText, lat: e.lat, lng: e.lng, capacity: e.capacity, tags: e.tags, privacy: e.privacy, owner_id: e.ownerId, created_at: e.createdAt, deleted: e.deleted }, { onConflict: 'id' });
        }
      }
    } catch {}
    return res.json({ imported });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao importar' });
  }
});

const userProfiles = new Map();
const userFriends = new Map();

app.get('/api/users/profile', (req, res) => {
  try {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const p = userProfiles.get(userId) || { userId, displayName: '', avatarUrl: '', bio: '', interests: [] };
    return res.json({ profile: p });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao obter perfil' });
  }
});

app.post('/api/users/profile', async (req, res) => {
  try {
    const { userId, displayName, avatarUrl, bio, interests } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const p = userProfiles.get(userId) || { userId, displayName: '', avatarUrl: '', bio: '', interests: [] };
    if (displayName !== undefined) p.displayName = String(displayName).slice(0, 60);
    if (avatarUrl !== undefined) p.avatarUrl = String(avatarUrl).slice(0, 500);
    if (bio !== undefined) p.bio = String(bio).slice(0, 1000);
    if (Array.isArray(interests)) p.interests = interests.slice(0, 20).map(t => String(t).slice(0, 32));
    userProfiles.set(userId, p);
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('user_profiles').upsert({ user_id: userId, display_name: p.displayName, avatar_url: p.avatarUrl, bio: p.bio, interests: p.interests }, { onConflict: 'user_id' });
      }
    } catch {}
    return res.json({ profile: p });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao salvar perfil' });
  }
});

app.get('/api/users/friends', (req, res) => {
  try {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const list = Array.from(userFriends.get(userId) || new Set());
    return res.json({ friends: list });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar amigos' });
  }
});

app.post('/api/users/friends/add', async (req, res) => {
  try {
    const { userId, targetId } = req.body || {};
    if (!userId || !targetId) return res.status(400).json({ error: 'userId e targetId requeridos' });
    const setA = userFriends.get(userId) || new Set();
    const setB = userFriends.get(String(targetId)) || new Set();
    setA.add(String(targetId));
    setB.add(String(userId));
    userFriends.set(userId, setA);
    userFriends.set(String(targetId), setB);
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('user_friends').upsert({ user_id: userId, friend_id: String(targetId) }, { onConflict: 'user_id,friend_id' });
        await supabase.from('user_friends').upsert({ user_id: String(targetId), friend_id: userId }, { onConflict: 'user_id,friend_id' });
      }
    } catch {}
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao adicionar amigo' });
  }
});

app.post('/api/users/friends/remove', async (req, res) => {
  try {
    const { userId, targetId } = req.body || {};
    if (!userId || !targetId) return res.status(400).json({ error: 'userId e targetId requeridos' });
    const setA = userFriends.get(userId) || new Set();
    const setB = userFriends.get(String(targetId)) || new Set();
    setA.delete(String(targetId));
    setB.delete(String(userId));
    userFriends.set(userId, setA);
    userFriends.set(String(targetId), setB);
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from('user_friends').delete().eq('user_id', userId).eq('friend_id', String(targetId));
        await supabase.from('user_friends').delete().eq('user_id', String(targetId)).eq('friend_id', userId);
      }
    } catch {}
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover amigo' });
  }
});

app.get('/api/events/history', (req, res) => {
  try {
    const viewerId = String(req.query.viewerId || '');
    if (!viewerId) return res.status(400).json({ error: 'viewerId requerido' });
    const list = Array.from(activeEvents.values()).filter(e => e.attendees && e.attendees[viewerId]).map(e => eventPublicView(e, viewerId));
    return res.json({ events: list });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar histórico' });
  }
});

app.get('/api/notifications/list', (req, res) => {
  try {
    const viewerId = String(req.query.viewerId || '');
    if (!viewerId) return res.status(400).json({ error: 'viewerId requerido' });
    const prof = userProfiles.get(viewerId) || { interests: [] };
    const now = Date.now();
    const soonMs = 7 * 24 * 3600 * 1000;
    const ints = (Array.isArray(prof.interests) ? prof.interests : []).map(s => String(s).toLowerCase());
    const items = Array.from(activeEvents.values()).filter(e => {
      if (e.deleted) return false;
      const time = new Date(e.dateTime).getTime();
      if (time < now) return false;
      if (time > now + soonMs) return false;
      if (e.ownerId === viewerId) return false;
      const etags = (Array.isArray(e.tags) ? e.tags : []).map(t => String(t).toLowerCase());
      return ints.length ? ints.some(t => etags.includes(t)) : true;
    }).map(e => ({ id: `n-${e.id}`, type: 'event_recommendation', event: eventPublicView(e, viewerId) }));
    return res.json({ notifications: items });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar notificações' });
  }
});

function scheduleAutoBackup() {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
    setInterval(async () => {
      try {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const [playersRes, heroesRes, questsRes] = await Promise.all([
          supabase.from('players').select('*'),
          supabase.from('heroes').select('*'),
          supabase.from('quests').select('*')
        ]);
        if (playersRes.error || heroesRes.error || questsRes.error) return;
        const payload = {
          timestamp: new Date().toISOString(),
          players: playersRes.data || [],
          heroes: heroesRes.data || [],
          quests: questsRes.data || [],
          events: Array.from(activeEvents.values()).map(e => eventPublicView(e, ''))
        };
        try { await supabase.storage.createBucket('backups', { public: false }); } catch {}
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const HH = String(d.getHours()).padStart(2, '0');
        const fileName = `auto-backup-${yyyy}${mm}${dd}-${HH}.json`;
        const { error: uploadError } = await supabase.storage.from('backups').upload(fileName, Buffer.from(JSON.stringify(payload)), { contentType: 'application/json', upsert: true });
        if (uploadError) return;
        try { await supabase.storage.createBucket('logs', { public: false }); } catch {}
        const log = { type: 'auto-backup', file: fileName, ts: new Date().toISOString(), counts: { players: payload.players.length, heroes: payload.heroes.length, quests: payload.quests.length, events: payload.events.length } };
        await supabase.storage.from('logs').upload(`auto-${fileName}`, Buffer.from(JSON.stringify(log)), { contentType: 'application/json', upsert: true });
      } catch {}
    }, 6 * 60 * 60 * 1000);
  } catch {}
}

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL_ID = process.env.HF_TEXT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
const HF_API_INFERENCE_BASE = `https://router.huggingface.co/hf-inference/models/`;
const HF_IMAGE_MODEL = 'stabilityai/stable-diffusion-2';

// Cliente oficial da Hugging Face para Providers/Router
const hfClient = new InferenceClient(HF_TOKEN, { provider: 'hf-inference' });

// Configuração Groq (OpenAI-compatible) para proxy backend
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = process.env.GROQ_API_URL || process.env.VITE_GROQ_API_URL || 'https://api.groq.com/openai/v1';

// Busca por imagem no Lexica.art (gratuito, sem chave)
async function lexicaSearchImage(prompt) {
  const url = `https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`;
  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Lexica API: ${resp.status} ${resp.statusText} ${txt.slice(0,200)}`);
  }
  const data = await resp.json();
  const first = Array.isArray(data?.images) ? data.images[0] : null;
  const src = first?.src || '';
  if (!src) throw new Error('Lexica: nenhuma imagem encontrada para o prompt');
  return src;
}

function parseHFResponse(data) {
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first.generated_text === 'string') return first.generated_text;
    if (first && typeof first.text === 'string') return first.text;
  }
  if (data && typeof data.generated_text === 'string') return data.generated_text;
  if (data && data.outputs && Array.isArray(data.outputs)) {
    const first = data.outputs[0];
    if (first && typeof first.text === 'string') return first.text;
    if (typeof data.text === 'string') return data.text;
  }
  return '';
}

// Limpa saída de nome gerado, removendo rótulos e epíteto
function normalizeNameOutput(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.replace(/\s+/g, ' ').trim();
  // Remove rótulo Nome:
  t = t.replace(/^Nome\s*[:\-]?\s*/i, '').trim();
  // Corta qualquer parte de epíteto
  t = t.replace(/Ep[íi]teto\s*[:\-].*$/i, '').trim();
  // Primeira linha apenas
  t = t.split(/\r?\n/)[0].trim();
  // Remove aspas
  t = t.replace(/^(["'“”`\[\(])+|(["'“”`\]\)])+$/g, '').trim();
  // Parte antes da primeira vírgula
  t = t.split(',')[0].trim();
  return t;
}

// Gera uma imagem placeholder SVG quando todas as opções falham
function generatePlaceholderImage(prompt) {
  const safeText = (prompt || '').toString().slice(0, 120).replace(/[<>]/g, '');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect x="24" y="24" width="464" height="464" rx="16" fill="#0b0f1a" stroke="#d1a54a" stroke-width="3" opacity="0.8"/>
  <text x="256" y="180" font-family="serif" font-size="28" fill="#f5deb3" text-anchor="middle">Imagem não disponível</text>
  <text x="256" y="220" font-family="serif" font-size="22" fill="#d1a54a" text-anchor="middle">Placeholder</text>
  <text x="256" y="280" font-family="serif" font-size="18" fill="#cbd5e1" text-anchor="middle">${safeText}</text>
  <text x="256" y="450" font-family="serif" font-size="14" fill="#9ca3af" text-anchor="middle">Hero Forge - Fallback</text>
</svg>`;
  const base64 = Buffer.from(svg, 'utf-8').toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Proxy para Groq OpenAI-compatible: chat/completions (evita CORS no cliente)
app.post('/api/groq-openai/chat/completions', async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(400).json({ error: { message: 'GROQ_API_KEY ausente. Defina a variável para habilitar chamadas reais ao Groq.' } });
    }

    const { model, messages, max_tokens, temperature } = req.body || {};

    const url = `${GROQ_API_URL}/chat/completions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model || (process.env.VITE_AI_MODEL || 'llama-3.3-70b-versatile'),
        messages: Array.isArray(messages) ? messages : [],
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1500,
        temperature: typeof temperature === 'number' ? temperature : 0.7
      })
    });

    const text = await resp.text();
    if (!resp.ok) {
      let err;
      try { err = JSON.parse(text); } catch {}
      return res.status(resp.status).json(err || { error: { message: text } });
    }

    const data = JSON.parse(text);
    return res.json(data);
  } catch (err) {
    console.error('Groq proxy error:', err?.message || String(err));
    return res.status(500).json({ error: { message: err?.message || 'Erro ao chamar Groq' } });
  }
});

// === Idle Daily: submissão e leaderboard (MVP Dev) ===
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pickDailyEnemies(level) {
  if (level <= 2) return [{ type: 'Goblin', count: 2, level }, { type: 'Lobo', count: 1, level }];
  if (level <= 5) return [{ type: 'Bandido', count: 1, level }, { type: 'Esqueleto', count: 1, level }];
  return [{ type: 'Troll', count: 1, level }, { type: 'Bandido', count: 2, level }];
}

function simulateDailyRun(hero) {
  const level = Number(hero?.progression?.level || hero?.level || 1);
  const attrs = hero?.attributes || {};
  const power = (attrs.forca || 5) + (attrs.destreza || 5) + (attrs.constituicao || 5) + level;
  const enemies = pickDailyEnemies(level);
  let enemyPower = 0;
  enemies.forEach(e => { enemyPower += (e.level || 1) * (e.count || 1) * 12; });
  const baseWinChance = level <= 2 ? 55 : level <= 5 ? 60 : 65;
  const winChance = Math.max(30, Math.min(90, baseWinChance + (power - enemyPower) * 1));
  const victory = Math.random() * 100 < winChance;
  const xp = victory ? Math.max(20, Math.round(level * 12)) : Math.max(10, Math.round(level * 6));
  const gold = victory ? Math.max(15, Math.round(level * 8)) : Math.max(5, Math.round(level * 4));
  return { victory, xp, gold };
}

app.post('/api/daily/submit', async (req, res) => {
  try {
    const { hero } = req.body || {};
    if (!hero) return res.status(400).json({ error: 'Missing hero' });
    const level = Number(hero?.progression?.level || hero?.level || 1);
    const runsCount = Math.max(1, Math.min(3, level <= 2 ? 1 : level <= 5 ? 2 : 3));
    let xpTotal = 0, goldTotal = 0, victories = 0;
    for (let i = 0; i < runsCount; i++) {
      const r = simulateDailyRun(hero);
      xpTotal += r.xp;
      goldTotal += r.gold;
      victories += r.victory ? 1 : 0;
    }
    const key = todayKey();
    const heroId = hero.id || hero.name || `anon_${Math.random().toString(36).slice(2,7)}`;
    const entry = {
      heroId,
      heroName: hero.name || 'Herói',
      class: hero.class || hero.heroClass || 'Aventureiro',
      xpToday: xpTotal,
      goldToday: goldTotal,
      victoriesToday: victories,
      date: key,
      score: xpTotal * 1.0 + goldTotal * 0.5 + victories * 5
    };
    dailyLeaderboardByDay[key] = dailyLeaderboardByDay[key] || [];
    const existingIdx = dailyLeaderboardByDay[key].findIndex(e => e.heroId === heroId);
    if (existingIdx >= 0) dailyLeaderboardByDay[key][existingIdx] = entry; else dailyLeaderboardByDay[key].push(entry);
    return res.json({ ok: true, entry });
  } catch (err) {
    console.error('daily submit error:', err);
    return res.status(500).json({ error: 'Erro ao submeter resultado diário' });
  }
});

app.get('/api/daily/leaderboard', async (_req, res) => {
  try {
    const key = todayKey();
    const entries = Array.isArray(dailyLeaderboardByDay[key]) ? dailyLeaderboardByDay[key] : [];
    const sorted = entries.slice().sort((a, b) => b.score - a.score);
    return res.json({ date: key, entries: sorted });
  } catch (err) {
    console.error('daily leaderboard error:', err);
    return res.status(500).json({ error: 'Erro ao obter leaderboard diário' });
  }
});

// === Criação de Herói via IA (texto + imagem) ===
app.post('/api/hero-create', async (req, res) => {
  try {
    const { race = 'humano', klass = 'guerreiro', attrs = {} } = req.body || {};

    let nameLine = 'Herói Desconhecido';
    let historia = 'Um herói emerge das sombras, buscando seu destino.';
    let frase = 'Por glória e aventura!';
    let image = null;

    if (HF_TOKEN) {
      try {
        const promptText = `Você é um narrador épico. Gere:\n- Nome (1-3 palavras) + epíteto,\n- História de origem 4-6 linhas,\n- Frase de impacto 1 linha.\nContexto: raça: ${race}, classe: ${klass}, atributos: ${JSON.stringify(attrs)}.\nSeja conciso e épico. Saída em texto puro.`;
        const chat = await hfClient.chatCompletion({
          model: MODEL_ID,
          messages: [
            { role: 'system', content: 'Assistente de fantasia' },
            { role: 'user', content: promptText }
          ],
          max_tokens: 180,
          temperature: 0.7
        });
        const content = chat?.choices?.[0]?.message?.content || chat?.generated_text || '';
        const lines = content.split('\n').filter(Boolean);
        nameLine = lines[0] || nameLine;
        historia = lines.slice(1, 4).join('\n') || historia;
        frase = lines.slice(4).join(' ').trim() || frase;
      } catch (err) {
        console.warn('HF text generation fallback:', err?.message || String(err));
      }
    }

    const promptImage = `${nameLine}, ${race} ${klass}, epic fantasy portrait, detailed, studio lighting`;

  if (!image) {
      if (HF_TOKEN) {
        const models = [
          'ByteDance/Hyper-SD',
          process.env.HF_IMAGE_MODEL || 'ByteDance/Hyper-SD',
          'ByteDance/Hyper-SD-Lite',
          'stabilityai/sd-turbo',
          'stabilityai/stable-diffusion-2-1',
          'runwayml/stable-diffusion-v1-5'
        ];
        for (const model of models) {
          try {
            const blob = await hfClient.textToImage({ model, inputs: promptImage, provider: 'hf-inference' });
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            image = `data:image/png;base64,${base64}`;
            break;
          } catch (err) {
            try {
              const base64 = await hfRouterTextToImage(model, promptImage);
              image = `data:image/png;base64,${base64}`;
              break;
            } catch {}
            try {
              const base64 = await hfRouterImageGenerations(model, promptImage, '512x512');
              image = `data:image/png;base64,${base64}`;
              break;
            } catch {}
          }
        }
        if (!image && process.env.HF_IMAGE_ENDPOINT_URL) {
          try {
            const base64 = await hfPaidEndpointImage(process.env.HF_IMAGE_ENDPOINT_URL, promptImage);
            image = `data:image/png;base64,${base64}`;
          } catch {}
        }
      }
      if (!image) {
        try {
          const url = await lexicaSearchImage(`${nameLine}, ${race} ${klass}, fantasy portrait, detailed`);
          image = url;
        } catch {}
      }
      if (!image) {
        image = `/api/pollinations-image?prompt=${encodeURIComponent(promptImage)}&width=512&height=512`;
      }
    }

    if (!image) {
      image = generatePlaceholderImage(`${nameLine} • ${race} ${klass}`);
    }

    return res.json({ name: nameLine, story: historia, phrase: frase, image });
  } catch (err) {
    console.error('hero-create error:', err?.message || String(err));
    return res.status(500).json({ error: 'Erro IA' });
  }
});

// Fallback via API pública de Inference: texto
async function hfApiTextGeneration(model, prompt, maxTokens = 128, temperature = 0.7) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
  const body = {
    inputs: prompt,
    parameters: {
      max_new_tokens: Math.min(maxTokens || 128, 256),
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      return_full_text: false
    }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API Inference ${model}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const ct = resp.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const json = await resp.json();
    return parseHFResponse(json);
  }
  const text = await resp.text();
  try { const json = JSON.parse(text); return parseHFResponse(json); } catch { return text; }
}

// Fallback via API pública de Inference: imagem
async function hfApiTextToImage(model, prompt) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API Inference ${model}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

// Fallback via Router hf-inference: imagem (substitui API pública desativada)
async function hfRouterTextToImage(model, prompt) {
  const url = `${HF_API_INFERENCE_BASE}${encodeURIComponent(model)}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Router hf-inference image ${model}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

// Fallback via Router v1 chat completions com sufixo de provedor em model
async function hfRouterChatCompletion(model, messages, options = {}) {
  const url = 'https://router.huggingface.co/v1/chat/completions';
  const modelWithProvider = options.provider ? `${model}@${options.provider}` : model;
  const body = {
    model: modelWithProvider,
    messages,
    max_tokens: options.max_tokens || 64,
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.7
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Router v1 chat ${modelWithProvider}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const json = await resp.json();
  return json?.choices?.[0]?.message?.content || '';
}

// Fallback via Router v1: geração de imagens (OpenAI-compatible)
async function hfRouterImageGenerations(model, prompt, size = '512x512') {
  const url = 'https://router.huggingface.co/v1/images/generations';
  const body = { model, prompt, size, n: 1 };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Router v1 images ${model}: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const json = await resp.json();
  const b64 = json?.data?.[0]?.b64_json || '';
  if (!b64 || typeof b64 !== 'string') throw new Error('Router v1 images: resposta sem b64_json');
  return b64;
}

// Fallback opcional: Inference Endpoint gerenciado (pago) se URLs forem configuradas
async function hfPaidEndpointText(url, prompt, maxTokens = 128, temperature = 0.7) {
  const body = {
    inputs: prompt,
    parameters: {
      max_new_tokens: Math.min(maxTokens || 128, 512),
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      return_full_text: false
    }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Paid Endpoint text: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const json = await resp.json();
  return parseHFResponse(json);
}

async function hfPaidEndpointImage(url, prompt) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ inputs: prompt })
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Paid Endpoint image: ${resp.status} ${resp.statusText} ${text.slice(0,200)}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

app.post('/api/gerar-texto', async (req, res) => {
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
  }

  const { tipo, contexto = '' } = req.body || {};
  if (!tipo) {
    return res.status(400).json({ error: 'Campo "tipo" é obrigatório' });
  }

  let prompt = '';
  switch (tipo) {
    case 'missao':
      prompt = `Crie uma missão medieval curta e envolvente para um herói. Contexto: ${contexto}. Forneça um objetivo, local e desafio em 2-3 linhas.`;
      break;
    case 'historia':
      prompt = `Crie a história de origem de um herói medieval em 4-6 linhas. Contexto: ${contexto}. Estilo épico, com tom inspirador e coeso.`;
      break;
    case 'frase':
      prompt = 'Gere uma frase inspiradora de fantasia épica, curta e memorável.';
      break;
    case 'nome':
      prompt = 'Crie um nome original de fantasia medieval para um herói ou heroína (1-3 palavras) e um epíteto estiloso.';
      break;
    default:
      return res.status(400).json({ error: 'Tipo inválido' });
  }

  try {
    const models = [
      MODEL_ID,
      'google/gemma-2b-it',
      'tiiuae/falcon-7b-instruct',
      'Qwen/Qwen2.5-7B-Instruct'
    ];

    for (const model of models) {
      try {
        const data = await hfClient.chatCompletion({
          model,
          messages: [
            { role: 'system', content: 'Você é um assistente de fantasia medieval conciso.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 64,
          temperature: 0.7,
          provider: 'hf-inference'
        });
        let output = (data?.choices?.[0]?.message?.content) || '';
        if (output) {
          if (tipo === 'nome') output = normalizeNameOutput(output);
          return res.json({ resultado: output });
        }
      } catch (err) {
        const msg = (err && err.message) || 'Erro ao gerar';
        console.warn(`HF chatCompletion error (${model}):`, msg);
        // Fallback para textGeneration se chat falhar
        try {
          const gen = await hfClient.textGeneration({
            model,
            inputs: prompt,
            parameters: { max_new_tokens: 128, temperature: 0.7 },
            provider: 'hf-inference'
          });
          let genText = gen?.generated_text || parseHFResponse(gen);
          if (genText) {
            if (tipo === 'nome') genText = normalizeNameOutput(genText);
            return res.json({ resultado: genText });
          }
        } catch (fallbackErr) {
          console.warn(`HF textGeneration fallback error (${model}):`, fallbackErr?.message || String(fallbackErr));
          continue;
        }
      }
    }
    // Fallback: Router v1 com roteamento automático
    try {
      let output = await hfRouterChatCompletion('Qwen/Qwen2.5-7B-Instruct', [
        { role: 'system', content: 'Você é um assistente de fantasia medieval conciso.' },
        { role: 'user', content: prompt }
      ], { max_tokens: 64, temperature: 0.7 });
      if (output) {
        if (tipo === 'nome') output = normalizeNameOutput(output);
        return res.json({ resultado: output });
      }
    } catch (err) {
      console.warn('Router v1 fallback error (Qwen):', err?.message || String(err));
    }
    // Fallback final: Inference Endpoint pago, se configurado
    if (process.env.HF_ENDPOINT_URL) {
      try {
        const output = await hfPaidEndpointText(process.env.HF_ENDPOINT_URL, prompt, 64, 0.7);
        if (output) return res.json({ resultado: output });
      } catch (err) {
        console.warn('Paid Endpoint text error:', err?.message || String(err));
      }
    }
    return res.status(502).json({ error: 'Falha na geração com modelos disponíveis' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao conectar com a IA' });
  }
});

// Rota genérica para prompts livres: /api/hf-text
app.post('/api/hf-text', async (req, res) => {
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
  }

  const { prompt = '', systemMessage = '', maxTokens = 512, temperature = 0.7 } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
  }

  const safePrompt = String(prompt).slice(0, 300);
  const composed = systemMessage
    ? `System: ${systemMessage}\nUser: ${safePrompt}\nAssistant:`
    : safePrompt;

  try {
    const models = [
      MODEL_ID,
      'google/gemma-2b-it',
      'tiiuae/falcon-7b-instruct',
      'Qwen/Qwen2.5-7B-Instruct'
    ];

    for (const model of models) {
      try {
        const data = await hfClient.chatCompletion({
          model,
          messages: [
            ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
            { role: 'user', content: safePrompt }
          ],
          max_tokens: Math.min(Number(maxTokens) || 512, 1024),
          temperature,
          provider: 'hf-inference'
        });
        const output = (data?.choices?.[0]?.message?.content) || '';
        if (output) return res.json({ text: output });
      } catch (err) {
        const msg = (err && err.message) || 'Erro ao gerar';
        console.warn(`HF chatCompletion error (${model}):`, msg);
        // Fallback para textGeneration se chat falhar
        try {
          const gen = await hfClient.textGeneration({
            model,
            inputs: composed,
            parameters: { max_new_tokens: Math.min(maxTokens || 128, 256), temperature: typeof temperature === 'number' ? temperature : 0.7 },
            provider: 'hf-inference'
          });
          const genText = gen?.generated_text || parseHFResponse(gen);
          if (genText) return res.json({ text: genText });
        } catch (fallbackErr) {
          console.warn(`HF textGeneration fallback error (${model}):`, fallbackErr?.message || String(fallbackErr));
          continue;
        }
      }
    }
    // Fallback: Router v1 com roteamento automático
    try {
      const output = await hfRouterChatCompletion('Qwen/Qwen2.5-7B-Instruct', [
        ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
        { role: 'user', content: prompt }
      ], { max_tokens: Math.min(Number(maxTokens) || 512, 1024), temperature });
      if (output) return res.json({ text: output });
    } catch (err) {
      console.warn('Router v1 fallback error (Qwen):', err?.message || String(err));
    }
    // Fallback final: Inference Endpoint pago, se configurado
    if (process.env.HF_ENDPOINT_URL) {
      try {
        const output = await hfPaidEndpointText(process.env.HF_ENDPOINT_URL, composed, maxTokens, temperature);
        if (output) return res.json({ text: output });
      } catch (err) {
        console.warn('Paid Endpoint text error:', err?.message || String(err));
      }
    }
    return res.status(502).json({ error: 'Falha na geração com modelos disponíveis' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao conectar com a IA' });
  }
});

// Rota de geração de imagem via Hugging Face Stable Diffusion
app.post('/api/gerar-imagem', async (req, res) => {
  if (!HF_TOKEN) {
    return res.status(500).json({ error: 'HF_TOKEN não configurado no servidor' });
  }

  const { prompt = '' } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
  }

  try {
    const models = [
      'ByteDance/Hyper-SD',
      process.env.HF_IMAGE_MODEL || 'ByteDance/Hyper-SD',
      'ByteDance/Hyper-SD-Lite',
      'stabilityai/sd-turbo',
      'stabilityai/stable-diffusion-2-1',
      'runwayml/stable-diffusion-v1-5'
    ];

    for (const model of models) {
      try {
        const blob = await hfClient.textToImage({ model, inputs: String(prompt).slice(0, 200), provider: 'hf-inference' });
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        return res.json({ imagem: `data:image/png;base64,${base64}` });
      } catch (err) {
        const msg = (err && err.message) || 'Erro ao gerar imagem';
        console.warn(`HF textToImage error (${model}):`, msg);
        // Tentar fallback via Router hf-inference
        try {
          const base64 = await hfRouterTextToImage(model, prompt);
          return res.json({ imagem: `data:image/png;base64,${base64}` });
        } catch (routerErr) {
          console.warn(`Router hf-inference image fallback error (${model}):`, routerErr?.message || String(routerErr));
          // Tentar fallback via Router v1 OpenAI-compatible
          try {
            const base64 = await hfRouterImageGenerations(model, prompt, '512x512');
            return res.json({ imagem: `data:image/png;base64,${base64}` });
          } catch (routerV1Err) {
            console.warn(`Router v1 images fallback error (${model}):`, routerV1Err?.message || String(routerV1Err));
            continue;
          }
        }
      }
    }
    // Fallback final: Inference Endpoint pago, se configurado
    if (process.env.HF_IMAGE_ENDPOINT_URL) {
      try {
        const base64 = await hfPaidEndpointImage(process.env.HF_IMAGE_ENDPOINT_URL, prompt);
        return res.json({ imagem: `data:image/png;base64,${base64}` });
      } catch (err) {
        console.warn('Paid Endpoint image error:', err?.message || String(err));
      }
    }
    // Fallback gratuito: Lexica.art (retorna URL direta da imagem)
    try {
      const url = await lexicaSearchImage(prompt);
      return res.json({ imagem: url });
    } catch (lexErr) {
      console.warn('Lexica fallback error:', lexErr?.message || String(lexErr));
    }
    // Fallback final: placeholder SVG
    const placeholder = generatePlaceholderImage(prompt);
    return res.json({ imagem: placeholder });
  } catch (error) {
    console.error(error);
    // Em caso de erro inesperado, ainda retorna placeholder
    const placeholder = generatePlaceholderImage(prompt);
    return res.json({ imagem: placeholder });
  }
});

// Rota dedicada: /api/hero-image (GET) usando Lexica
app.get('/api/hero-image', async (req, res) => {
  const prompt = (req.query?.prompt || '').toString();
  if (!prompt) {
    return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
  }
  try {
    const url = await lexicaSearchImage(prompt);
    return res.json({ image: url });
  } catch (err) {
    const msg = err?.message || 'Falha ao buscar imagem';
    return res.status(502).json({ error: msg });
  }
});

// Proxy seguro para imagens do Pollinations (evita ORB/CORB no browser)
app.get('/api/pollinations-image', async (req, res) => {
  try {
    const prompt = (req.query?.prompt || '').toString();
    const width = (req.query?.width || '512').toString();
    const height = (req.query?.height || '512').toString();
    if (!prompt) {
      return res.status(400).json({ error: 'Campo "prompt" é obrigatório' });
    }

    const remoteUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?n=1&width=${encodeURIComponent(width)}&height=${encodeURIComponent(height)}`;
    const resp = await fetch(remoteUrl, { method: 'GET' });
    if (!resp.ok) {
      throw new Error(`Pollinations: ${resp.status} ${resp.statusText}`);
    }
    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const ab = await resp.arrayBuffer();
    const buf = Buffer.from(ab);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=604800');
    return res.status(200).send(buf);
  } catch (err) {
    try {
      const dataUrl = generatePlaceholderImage((req.query?.prompt || '').toString());
      const match = /^data:(.+);base64,(.*)$/.exec(dataUrl || '');
      if (match) {
        const ct = match[1] || 'image/svg+xml';
        const b64 = match[2] || '';
        const buf = Buffer.from(b64, 'base64');
        res.set('Content-Type', ct);
        res.set('Cache-Control', 'no-cache');
        return res.status(200).send(buf);
      }
    } catch {}
    return res.status(502).json({ error: 'Falha ao obter imagem do Pollinations' });
  }
});

// Login com Google: valida ID token via endpoint tokeninfo
const LOGIN_FAILS = new Map();
app.post('/api/login-google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: 'Credencial Google ausente' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID não configurado' });
  }

  try {
    const ip = (req.ip || 'local').toString();
    const f = LOGIN_FAILS.get(ip) || { fails: 0, since: Date.now(), lockedUntil: 0 };
    const now = Date.now();
    if (f.lockedUntil && now < f.lockedUntil) {
      return res.status(429).json({ error: 'Bloqueado temporariamente por falhas de login' });
    }
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload = await verifyRes.json();

    if (!verifyRes.ok) {
      const message = payload?.error_description || payload?.error || 'Falha ao validar token';
      f.fails = (f.fails || 0) + 1;
      if (f.fails >= 5) {
        f.lockedUntil = now + 15 * 60 * 1000;
      }
      LOGIN_FAILS.set(ip, f);
      return res.status(401).json({ error: message });
    }

    if (payload.aud !== clientId) {
      f.fails = (f.fails || 0) + 1;
      if (f.fails >= 5) {
        f.lockedUntil = now + 15 * 60 * 1000;
      }
      LOGIN_FAILS.set(ip, f);
      return res.status(401).json({ error: 'Token inválido para este cliente' });
    }

    const user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified
    };

    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const now = new Date().toISOString();
        await supabase.from('players').upsert({ id: user.sub, email: user.email || null, last_login: now }, { onConflict: 'id' });
      }
    } catch {}

    LOGIN_FAILS.delete(ip);
    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao validar token Google' });
  }
});

// Preparação de monetização: expõe configuração básica
app.get('/api/monetization/config', async (_req, res) => {
  const stripePublic = process.env.STRIPE_PUBLIC_KEY || '';
  const stripeEnabled = !!process.env.STRIPE_SECRET_KEY;
  const storeEnabled = true; // Loja já existe no app
  const adsenseClientId = process.env.ADSENSE_CLIENT_ID || '';
  const adSlotBannerTop = process.env.ADSENSE_SLOT_BANNER_TOP || '';
  const adSlotInterstitial = process.env.ADSENSE_SLOT_INTERSTITIAL || '';
  return res.json({
    stripeEnabled,
    stripePublicKey: stripePublic,
    storeEnabled,
    adsenseClientId,
    adSlotBannerTop,
    adSlotInterstitial
  });
});

// === Pagamentos (stub dev): criar sessão e verificar ===
app.post('/api/payments/create-checkout-session', (req, res) => {
  try {
    const { productId } = req.body || {};
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    if (secretKey) {
      const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
      const forwardedProto = (req.headers['x-forwarded-proto'] && String(req.headers['x-forwarded-proto'])) || '';
      const forwardedHost = (req.headers['x-forwarded-host'] && String(req.headers['x-forwarded-host'])) || '';
      const publicOrigin = process.env.PUBLIC_ORIGIN || '';
      const hdrOrigin = (req.headers.origin && String(req.headers.origin)) || '';
      const origin = publicOrigin || (forwardedHost ? `${forwardedProto || 'https'}://${forwardedHost}` : (hdrOrigin || 'http://localhost:4173'));
      const priceMap = {
        'remove-ads': process.env.STRIPE_PRICE_REMOVE_ADS || '',
        'season-pass': process.env.STRIPE_PRICE_SEASON_PASS || ''
      };
      let priceId = (priceMap[productId] || '');
      if (!priceId && productId && productId.startsWith('frame-')) priceId = process.env.STRIPE_PRICE_FRAME || '';
      if (!priceId && productId && productId.startsWith('theme-')) priceId = process.env.STRIPE_PRICE_THEME || '';
      if (priceId) {
        stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/premium?checkout=success&p=${encodeURIComponent(productId || '')}&sid={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/premium?checkout=cancel`
        }).then(session => {
          return res.json({ ok: true, sessionId: session.id, redirectUrl: session.url });
        }).catch(err => {
          console.error('stripe checkout error:', err?.message || String(err));
          const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
          return res.json({ ok: true, sessionId });
        });
        return;
      }
    }
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    return res.json({ ok: true, sessionId });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    return res.status(500).json({ ok: false });
  }
});

app.post('/api/payments/verify', (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId requerido' });
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    if (secretKey && sessionId.startsWith('cs_')) {
      const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
      stripe.checkout.sessions.retrieve(String(sessionId)).then(sess => {
        const paid = sess.payment_status === 'paid' || sess.status === 'complete';
        return res.json({ ok: paid });
      }).catch(err => {
        console.error('stripe verify error:', err?.message || String(err));
        return res.json({ ok: false });
      });
      return;
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('payments verify error:', err);
    return res.status(500).json({ ok: false });
  }
});

app.post('/api/metrics/ingest', rateLimit(60000, 60), async (req, res) => {
  try {
    const payload = req.body || {};
    const id = `metrics-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        try { await supabase.storage.createBucket('metrics', { public: false }); } catch {}
        const buf = Buffer.from(JSON.stringify({ id, ts: new Date().toISOString(), payload }), 'utf-8');
        await supabase.storage.from('metrics').upload(`${id}.json`, buf, { contentType: 'application/json', upsert: true });
      }
    } catch {}
    return res.json({ id });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao ingerir métricas' });
  }
});

app.get('/api/metrics/daily', async (_req, res) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.json({ days: [] });
    const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    try { await supabase.storage.createBucket('metrics', { public: false }); } catch {}
    const { data: files, error } = await supabase.storage.from('metrics').list('', { limit: 1000 });
    if (error) return res.status(500).json({ error: error.message });
    const daysMap = new Map();
    for (const f of (files || [])) {
      try {
        const { data: blob } = await supabase.storage.from('metrics').download(f.name);
        if (!blob) continue;
        const txt = await blob.text();
        const json = JSON.parse(txt || '{}');
        const ts = json?.ts || new Date().toISOString();
        const day = ts.split('T')[0];
        const kpi = json?.payload?.kpi || json?.kpi || {};
        const installs = json?.payload?.installs || json?.installs || 0;
        const purchases = json?.payload?.purchases || json?.purchases || 0;
        const cur = daysMap.get(day) || { day, installs: 0, purchases: 0, sessions: 0, dau: 0, revenue: 0, themeSwitches: 0, frameSwitches: 0 };
        cur.installs += Number(installs || 0);
        cur.purchases += Number(purchases || 0);
        cur.sessions += Number(kpi?.overview?.totalSessions || 0);
        cur.dau = Math.max(Number(kpi?.engagement?.dailyActiveUsers || 0), cur.dau);
        const cust = json?.payload?.customizations || json?.customizations || {};
        cur.themeSwitches += Number(cust?.themeSwitches || 0);
        cur.frameSwitches += Number(cust?.frameSwitches || 0);
        daysMap.set(day, cur);
      } catch {}
    }
    const days = Array.from(daysMap.values()).sort((a,b) => a.day.localeCompare(b.day)).slice(-30);
    return res.json({ days });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao agregar métricas' });
  }
});

app.get('/api/metrics/summary', async (_req, res) => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.json({ installs: 0, purchases: 0, revenue: 0 });
    const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    try { await supabase.storage.createBucket('metrics', { public: false }); } catch {}
    const { data: files } = await supabase.storage.from('metrics').list('', { limit: 1000 });
    let installs = 0, purchases = 0;
    for (const f of (files || [])) {
      try {
        const { data: blob } = await supabase.storage.from('metrics').download(f.name);
        if (!blob) continue;
        const txt = await blob.text();
        const json = JSON.parse(txt || '{}');
        installs += Number((json?.payload?.installs ?? json?.installs) || 0);
        purchases += Number((json?.payload?.purchases ?? json?.purchases) || 0);
      } catch {}
    }
    // Estimar receita por compra usando preço padrão
    const defaultPrice = Number(process.env.DEFAULT_PURCHASE_PRICE || '4.99');
    const revenue = Number((purchases * defaultPrice).toFixed(2));
    return res.json({ installs, purchases, revenue });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao sumarizar métricas' });
  }
});

// --------------------------
// Missões: gerar e resolver
// --------------------------

function pickDifficulty(level = 1) {
  if (level <= 3) return 'easy';
  if (level <= 7) return 'normal';
  return 'hard';
}

function clampProb(p) { return Math.max(0.05, Math.min(0.95, p)); }

function defaultMissionFromHero(hero = {}) {
  const name = hero.name || 'Herói';
  const klass = hero.class || hero.klass || 'Aventureiro';
  const level = Number(hero.level || hero.progression?.level || 1) || 1;
  const difficulty = pickDifficulty(level);
  const objective = `Recuperar um artefato antigo perdido`;
  const location = `Ruínas de Valthor`;
  const challenge = `Guardião espectral e armadilhas antigas`;
  // Probabilidade segundo regra: 30% + atributo*5% - dificuldade*10%
  const attrs = hero.attributes || {};
  const diffPenalty = difficulty === 'easy' ? 0 : difficulty === 'normal' ? 0.10 : 0.20;
  const probA = clampProb(0.30 + ((Number(attrs.sabedoria) || 0) * 0.05) - diffPenalty); // Investigação cuidadosa
  const probB = clampProb(0.30 + ((Number(attrs.forca) || 0) * 0.05) - diffPenalty);     // Confronto direto
  const probC = clampProb(0.30 + ((Number(attrs.destreza) || 0) * 0.05) - diffPenalty);  // Astúcia/infiltração
  return {
    id: `m-${Date.now()}`,
    description: `${name} — ${klass} — Nível ${level}. Objetivo: ${objective}. Local: ${location}. Desafio: ${challenge}.`,
    objective,
    location,
    challenge,
    difficulty,
    choices: [
      { key: 'A', text: 'Investigar rotas alternativas com cautela', success: probA },
      { key: 'B', text: 'Confrontar o guardião diretamente', success: probB },
      { key: 'C', text: 'Usar astúcia para distrair e infiltrar-se', success: probC }
    ]
  };
}

app.post('/api/mission/generate', async (req, res) => {
  try {
    const { hero = {}, context = {} } = req.body || {};
    // Se desejar, poderíamos chamar IA aqui usando hfClient, mas manteremos simples e robusto
    const mission = defaultMissionFromHero({ ...hero, ...context });
    return res.json({ mission });
  } catch (err) {
    console.error('mission/generate error:', err?.message || String(err));
    return res.status(500).json({ error: 'Falha ao gerar missão' });
  }
});

function resolveOutcome(mission, choiceKey, level = 1) {
  const choice = (mission?.choices || []).find(c => c.key === choiceKey);
  const prob = choice ? Number(choice.success) : 0.5;
  const roll = Math.random();
  const success = roll <= prob;
  const difficulty = mission?.difficulty || pickDifficulty(level);
  // XP curto 10–50: base + multiplicador
  const baseByDiff = difficulty === 'easy' ? 12 : difficulty === 'normal' ? 20 : 26;
  const baseWithLevel = baseByDiff + Math.min(10, Math.floor(level / 2));
  const xpRaw = success ? Math.round(baseWithLevel * 1.6) : Math.round(baseWithLevel * 0.6);
  const xp = Math.max(10, Math.min(50, xpRaw));
  const lootChance = success ? 0.35 : 0.1;
  const titleChance = success ? 0.2 : 0.05;
  const gotLoot = Math.random() < lootChance;
  const gotTitle = Math.random() < titleChance;
  const loot = gotLoot ? 'Relíquia menor das Ruínas' : '';
  const title = gotTitle ? (difficulty === 'hard' ? 'Quebrador de Guardiões' : 'Eco das Ruínas') : '';
  const outcomeTextSuccess = `Com determinação e ${choice?.text?.toLowerCase() || 'tática cuidadosa'}, o herói supera o desafio em ${mission?.location}. O artefato é recuperado e o caminho fica marcado por passos seguros.`;
  const outcomeTextFail = `A abordagem ${choice?.text?.toLowerCase() || 'arrisca'} sai do controle. O guardião repele o avanço e o herói recua, aprendendo com cada ferida e armadilha ativada.`;
  return {
    success,
    xp,
    title,
    loot,
    narrative: success ? outcomeTextSuccess : outcomeTextFail,
    roll,
    prob
  };
}

app.post('/api/mission/resolve', async (req, res) => {
  try {
    const { mission, choice, hero = {} } = req.body || {};
    const level = Number(hero.level || hero.progression?.level || 1) || 1;
    if (!mission || !choice) return res.status(400).json({ error: 'Campos "mission" e "choice" são obrigatórios' });
    const result = resolveOutcome(mission, String(choice), level);
    return res.json({ result });
  } catch (err) {
    console.error('mission/resolve error:', err?.message || String(err));
    return res.status(500).json({ error: 'Falha ao resolver missão' });
  }
});

const PORT = process.env.PORT || 3001;

// Backup manual em dev: /api/backup
app.get('/api/backup', async (_req, res) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase env ausente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' });
  }
  const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const [playersRes, heroesRes, questsRes] = await Promise.all([
      supabase.from('players').select('*'),
      supabase.from('heroes').select('*'),
      supabase.from('quests').select('*')
    ]);
    if (playersRes.error) throw playersRes.error;
    if (heroesRes.error) throw heroesRes.error;
    if (questsRes.error) throw questsRes.error;
    const payload = {
      timestamp: new Date().toISOString(),
      players: playersRes.data || [],
      heroes: heroesRes.data || [],
      quests: questsRes.data || [],
      events: Array.from(activeEvents.values()).map(e => eventPublicView(e, ''))
    };
    try { await supabase.storage.createBucket('backups', { public: false }); } catch {}
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    const fileName = `backup-${yyyy}${mm}${dd}-${HH}${MM}.json`;
    const { error: uploadError } = await supabase.storage.from('backups').upload(fileName, Buffer.from(JSON.stringify(payload)), { contentType: 'application/json', upsert: true });
    if (uploadError) return res.status(500).json({ error: uploadError.message || 'Falha ao enviar backup' });
    try {
      try { await supabase.storage.createBucket('logs', { public: false }); } catch {}
      const log = { type: 'backup', file: fileName, ts: new Date().toISOString(), counts: { players: payload.players.length, heroes: payload.heroes.length, quests: payload.quests.length } };
      await supabase.storage.from('logs').upload(`backup-${yyyy}${mm}${dd}-${HH}${MM}.json`, Buffer.from(JSON.stringify(log)), { contentType: 'application/json', upsert: true });
    } catch {}
    return res.json({ ok: true, file: fileName, size: JSON.stringify(payload).length });
  } catch (err) {
    console.error('dev backup error', err);
    return res.status(500).json({ error: err?.message || 'Erro ao executar backup' });
  }
});
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Servidor IA rodando na porta ${PORT}`);
    scheduleAutoBackup();
  });
}
export default app;
app.post('/api/logs', rateLimit(60000, 100), async (req, res) => {
  try {
    const id = `log-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    const payload = req.body || {};
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createSbClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        try { await supabase.storage.createBucket('client_logs', { public: false }); } catch {}
        const buf = Buffer.from(JSON.stringify({ id, ts: new Date().toISOString(), payload }), 'utf-8');
        await supabase.storage.from('client_logs').upload(`${id}.json`, buf, { contentType: 'application/json', upsert: true });
      }
    } catch {}
    return res.json({ id });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao registrar log' });
  }
});
