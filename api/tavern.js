// Endpoint consolidado: /api/tavern
// Ações: ?action=approve (GET/POST), ?action=events (GET/POST), ?action=report (POST)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || '';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const TZ_OFFSET_MINUTES = Number(process.env.TAVERN_TZ_OFFSET_MINUTES || 0);

function applyOffset(date) {
  return new Date(date.getTime() + TZ_OFFSET_MINUTES * 60000);
}
function removeOffset(date) {
  return new Date(date.getTime() - TZ_OFFSET_MINUTES * 60000);
}
function getNextWeeklySnapshotTime() {
  const now = applyOffset(new Date());
  const d = new Date(now);
  const day = d.getDay();
  const diff = (7 - day) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  return removeOffset(d);
}
function getLastWeekRange() {
  const now = applyOffset(new Date());
  const end = new Date(now);
  const day = end.getDay();
  const diffToSunday = (7 - day) % 7;
  end.setDate(end.getDate() + diffToSunday);
  end.setHours(23, 59, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  return { start: removeOffset(start), end: removeOffset(end) };
}
function getTodayDateStr() {
  const now = applyOffset(new Date());
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
async function getSetting(supabase, key) {
  try {
    const { data } = await supabase.schema('public').from('tavern_settings').select('value').eq('key', key).limit(1);
    const v = Array.isArray(data) && data[0] ? data[0].value : null;
    return v;
  } catch { return null; }
}
async function getSupportCapBonus(supabase, heroId) {
  try {
    const { data } = await supabase.schema('public').from('tavern_supporters').select('cap_bonus').eq('hero_id', heroId).limit(1);
    const v = Array.isArray(data) && data[0] ? Number(data[0].cap_bonus || 0) : 0;
    return isNaN(v) ? 0 : v;
  } catch { return 0; }
}

function parseAction(req) {
  try {
    const q = (req.query && (req.query.action || req.query.a)) || null;
    if (q) return String(q);
    const u = new URL(req.url, 'http://localhost');
    return u.searchParams.get('action') || u.searchParams.get('a') || null;
  } catch { return null; }
}

function isAuthorized(req) {
  const authHeader = req.headers['authorization'] || '';
  const tokenHeader = req.headers['x-admin-token'] || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return ADMIN_API_TOKEN && (bearer === ADMIN_API_TOKEN || tokenHeader === ADMIN_API_TOKEN);
}

async function isAdminRequest(req) {
  if (isAuthorized(req)) return true;
  const authHeader = req.headers['authorization'] || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!bearer || !SUPABASE_URL) return false;
  try {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${bearer}` } });
    if (!resp.ok) return false;
    const data = await resp.json();
    const email = String(data?.email || '').toLowerCase();
    const id = String(data?.id || '');
    if (ADMIN_EMAILS.length && ADMIN_EMAILS.includes(email)) return true;
    if (ADMIN_USER_IDS.length && ADMIN_USER_IDS.includes(id)) return true;
    return false;
  } catch { return false; }
}

function defaultDailyEvent() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const themes = [
    { title: 'Noite dos Bardos', body: 'Músicos itinerantes animam a Taverna com baladas do Véu.' },
    { title: 'Feira de Artefatos', body: 'Coletores exibem tralhas e relíquias — barganhas e curiosidades.' },
    { title: 'Histórias de Fendas', body: 'Veteranos relatam fissuras recém-controladas e perigos latentes.' },
    { title: 'Concurso de Runas', body: 'Magos competem em entalhar runas estabilizadoras sob pressão.' }
  ];
  const pick = themes[now.getDate() % themes.length];
  return {
    title: pick.title,
    body: pick.body,
    starts_at: start.toISOString(),
    approved: true
  };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase server env ausente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const action = parseAction(req);
  if (!action) return res.status(400).json({ error: 'Missing action' });

  // Aprovação de mensagens
  if (action === 'approve') {
    if (!(await isAdminRequest(req))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .schema('public')
          .from('tavern_messages')
          .select('id, author, content, scope, approved, created_at')
          .eq('approved', false)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) return res.status(500).json({ error: error.message || 'Falha ao listar pendentes' });
        return res.status(200).json({ pending: data || [] });
      } catch (err) {
        console.error('tavern approve GET error', err);
        return res.status(500).json({ error: 'Erro ao listar mensagens pendentes' });
      }
    }
    if (req.method === 'POST') {
      let body = req.body;
      if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        try {
          const raw = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => resolve(data));
            req.on('error', reject);
          });
          if (raw) body = JSON.parse(raw);
        } catch {}
      }
      const { messageId, approved } = body || {};
      if (!messageId || typeof approved !== 'boolean') {
        return res.status(400).json({ error: 'Parâmetros inválidos: messageId e approved (boolean) são obrigatórios' });
      }
      try {
        const { data, error } = await supabase
          .schema('public')
          .from('tavern_messages')
          .update({ approved })
          .eq('id', messageId)
          .select('id, author, content, scope, approved, created_at')
          .single();
        if (error) return res.status(500).json({ error: error.message || 'Falha ao atualizar aprovação' });
        return res.status(200).json({ message: data });
      } catch (err) {
        console.error('tavern approve POST error', err);
        return res.status(500).json({ error: 'Erro ao atualizar aprovação' });
      }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Eventos da Taverna
  if (action === 'events') {
    if (req.method === 'GET') {
      try {
        const { data, error } = await supabase
          .schema('public')
          .from('tavern_events')
          .select('*')
          .eq('approved', true)
          .order('starts_at', { ascending: false })
          .limit(10);
        if (error) return res.status(500).json({ error: 'Falha ao listar eventos' });
        return res.status(200).json({ events: data || [] });
      } catch (err) {
        console.error('tavern events GET error:', err);
        return res.status(500).json({ error: 'Erro ao obter eventos' });
      }
    }
    if (req.method === 'POST') {
      const ok = await isAdminRequest(req);
      if (!ok) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let body = req.body;
      if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        try {
          const raw = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => resolve(data));
            req.on('error', reject);
          });
          if (raw) body = JSON.parse(raw);
        } catch {}
      }

      const { title, body: text, starts_at, approved = true } = body || {};
      const payload = title && text && starts_at ? { title, body: text, starts_at, approved } : defaultDailyEvent();

      try {
        const { data, error } = await supabase
          .schema('public')
          .from('tavern_events')
          .insert(payload)
          .select('*')
          .single();
        if (error) return res.status(500).json({ error: 'Falha ao criar evento' });
        return res.status(200).json({ event: data });
      } catch (err) {
        console.error('tavern events POST error:', err);
        return res.status(500).json({ error: 'Erro ao criar evento' });
      }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Denúncias
  if (action === 'report') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    let body = req.body;
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => resolve(data));
          req.on('error', reject);
        });
        if (raw) body = JSON.parse(raw);
      } catch {}
    }
    const { messageId, reason, autoHide = false, userId } = body || {};
    if (!messageId || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({ error: 'Parâmetros inválidos: messageId e reason (>=3 chars) são obrigatórios' });
    }
    try {
      const { error: insertError } = await supabase
        .from('tavern_reports')
        .insert({ message_id: messageId, reason: reason.trim(), reported_by: userId || null });
      if (insertError) {
        console.error('Erro ao registrar denúncia:', insertError);
        return res.status(500).json({ error: 'Falha ao registrar denúncia' });
      }
      if (autoHide) {
        const { error: updateError } = await supabase
          .from('tavern_messages')
          .update({ approved: false })
          .eq('id', messageId);
        if (updateError) {
          console.warn('Denúncia registrada, mas falhou ao ocultar mensagem:', updateError);
        }
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('tavern report error', err);
      return res.status(500).json({ error: 'Erro no servidor ao registrar denúncia' });
    }
  }

  // Eventos de dados da Taverna
  if (action === 'dice') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    let body = req.body;
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', chunk => { data += chunk; });
          req.on('end', () => resolve(data));
          req.on('error', reject);
        });
        if (raw) body = JSON.parse(raw);
      } catch {}
    }
    const { heroId, heroName, roll, critical = false, betAmount = null, opponentName = null } = body || {};
    if (!heroId || !heroName || typeof roll !== 'number') {
      return res.status(400).json({ error: 'Parâmetros inválidos: heroId, heroName e roll são obrigatórios' });
    }
    try {
      const { error } = await supabase
        .schema('public')
        .from('tavern_dice_events')
        .insert({ hero_id: heroId, hero_name: heroName, roll, critical, bet_amount: betAmount, opponent_name: opponentName, created_at: new Date().toISOString() });
      if (error) return res.status(500).json({ error: error.message || 'Falha ao inserir evento' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('tavern dice POST error', err);
      return res.status(500).json({ error: 'Erro ao registrar evento de dados' });
    }
  }

  // Ranking semanal de dados
  if (action === 'dice-weekly') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .schema('public')
        .from('tavern_dice_events')
        .select('hero_name, roll, critical, created_at')
        .gte('created_at', since)
        .limit(1000);
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter eventos' });
      const map = {};
      (data || []).forEach(ev => {
        const name = ev.hero_name;
        const r = Number(ev.roll || 0);
        const crit = !!ev.critical;
        const cur = map[name] || { heroName: name, best: 0, crits: 0, count: 0 };
        cur.best = Math.max(cur.best, r);
        cur.crits += crit ? 1 : 0;
        cur.count += 1;
        map[name] = cur;
      });
      const entries = Object.values(map).sort((a,b) => {
        if (b.best !== a.best) return b.best - a.best;
        if (b.crits !== a.crits) return b.crits - a.crits;
        return b.count - a.count;
      }).slice(0, 50);
      return res.status(200).json({ entries });
    } catch (err) {
      console.error('tavern dice-weekly GET error', err);
      return res.status(500).json({ error: 'Erro ao gerar ranking semanal' });
    }
  }

  if (action === 'dice-weekly-next') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      const qtz = url.searchParams.get('tz_offset_min');
      if (qtz) {
        const v = Number(qtz);
        if (!isNaN(v)) process.env.TAVERN_TZ_OFFSET_MINUTES = String(v);
      } else {
        const v = await getSetting(supabase, 'tz_offset_min');
        if (v) process.env.TAVERN_TZ_OFFSET_MINUTES = String(v);
      }
      const next = getNextWeeklySnapshotTime();
      return res.status(200).json({ nextSnapshotAt: next.toISOString() });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao calcular próxima execução' });
    }
  }

  if (action === 'settings-get') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const { data, error } = await supabase.schema('public').from('tavern_settings').select('key,value');
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter configurações' });
      return res.status(200).json({ settings: data || [] });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao obter configurações' });
    }
  }

  if (action === 'settings-set') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!(await isAdminRequest(req))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let body = req.body;
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => { let data = ''; req.on('data', c => { data += c; }); req.on('end', () => resolve(data)); req.on('error', reject); });
        if (raw) body = JSON.parse(raw);
      } catch {}
    }
    const { tz_offset_min, reroll_daily_cap } = body || {};
    try {
      if (typeof tz_offset_min === 'number') {
        const up = await supabase.schema('public').from('tavern_settings').upsert({ key: 'tz_offset_min', value: String(tz_offset_min) }).select('*').single();
        if (up.error) return res.status(500).json({ error: up.error.message || 'Falha ao salvar configuração' });
      }
      if (typeof reroll_daily_cap === 'number') {
        const up2 = await supabase.schema('public').from('tavern_settings').upsert({ key: 'reroll_daily_cap', value: String(reroll_daily_cap) }).select('*').single();
        if (up2.error) return res.status(500).json({ error: up2.error.message || 'Falha ao salvar configuração' });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao salvar configuração' });
    }
  }

  if (action === 'reroll-usage-get') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      const heroId = url.searchParams.get('heroId');
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' });
      const { data, error } = await supabase
        .schema('public')
        .from('tavern_reroll_usage')
        .select('count')
        .eq('hero_id', heroId)
        .eq('usage_date', getTodayDateStr())
        .limit(1);
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter uso diário' });
      const count = Array.isArray(data) && data[0] ? Number(data[0].count || 0) : 0;
      const capStr = await getSetting(supabase, 'reroll_daily_cap');
      const baseCap = capStr ? Number(capStr) : 5;
      const bonus = await getSupportCapBonus(supabase, heroId);
      const cap = baseCap + bonus;
      return res.status(200).json({ count, cap });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao obter uso diário' });
    }
  }

  if (action === 'reroll-usage-increment') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      let body = req.body;
      if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        const raw = await new Promise((resolve, reject) => { let data = ''; req.on('data', c => { data += c; }); req.on('end', () => resolve(data)); req.on('error', reject); });
        if (raw) body = JSON.parse(raw);
      }
      const { heroId } = body || {};
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' });
      const today = getTodayDateStr();
      const capStr = await getSetting(supabase, 'reroll_daily_cap');
      const baseCap = capStr ? Number(capStr) : 5;
      const bonus = await getSupportCapBonus(supabase, heroId);
      const cap = baseCap + bonus;
      const { data } = await supabase
        .schema('public')
        .from('tavern_reroll_usage')
        .select('*')
        .eq('hero_id', heroId)
        .eq('usage_date', today)
        .limit(1);
      const row = Array.isArray(data) && data[0] ? data[0] : null;
      const current = row ? Number(row.count || 0) : 0;
      if (current >= cap) return res.status(200).json({ ok: false, reason: 'cap' });
      if (row) {
        const up = await supabase.schema('public').from('tavern_reroll_usage').update({ count: current + 1, updated_at: new Date().toISOString() }).eq('hero_id', heroId).eq('usage_date', today);
        if (up.error) return res.status(500).json({ error: up.error.message || 'Falha ao atualizar uso' });
      } else {
        const ins = await supabase.schema('public').from('tavern_reroll_usage').insert({ hero_id: heroId, usage_date: today, count: 1 });
        if (ins.error) return res.status(500).json({ error: ins.error.message || 'Falha ao registrar uso' });
      }
      return res.status(200).json({ ok: true, count: current + 1, cap });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao incrementar uso' });
    }
  }

  if (action === 'reroll-usage-history') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      const heroId = url.searchParams.get('heroId');
      const daysStr = url.searchParams.get('days');
      const days = daysStr ? Number(daysStr) : 7;
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' });
      const end = applyOffset(new Date());
      const start = new Date(end.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .schema('public')
        .from('tavern_reroll_usage')
        .select('usage_date, count')
        .eq('hero_id', heroId)
        .gte('usage_date', start.toISOString().slice(0,10))
        .lte('usage_date', end.toISOString().slice(0,10))
        .order('usage_date', { ascending: true });
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter histórico' });
      const capStr = await getSetting(supabase, 'reroll_daily_cap');
      const baseCap = capStr ? Number(capStr) : 5;
      const bonus = await getSupportCapBonus(supabase, heroId);
      const cap = baseCap + bonus;
      return res.status(200).json({ history: data || [], cap });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao obter histórico' });
    }
  }

  if (action === 'supporter-set') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      let body = req.body;
      if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
        const raw = await new Promise((resolve, reject) => { let data = ''; req.on('data', c => { data += c; }); req.on('end', () => resolve(data)); req.on('error', reject); });
        if (raw) body = JSON.parse(raw);
      }
      const { heroId, cap_bonus } = body || {};
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' });
      const bonus = Number(cap_bonus || 0);
      const up = await supabase.schema('public').from('tavern_supporters').upsert({ hero_id: heroId, cap_bonus: bonus }).select('*').single();
      if (up.error) return res.status(500).json({ error: up.error.message || 'Falha ao definir bônus' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao definir bônus' });
    }
  }

  if (action === 'dice-weekly-snapshot') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!(await isAdminRequest(req))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const end = now;
      const { data, error } = await supabase
        .schema('public')
        .from('tavern_dice_events')
        .select('hero_name, roll, critical, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .limit(2000);
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter eventos' });
      const score = {};
      (data || []).forEach(ev => {
        const name = ev.hero_name;
        const isDice = true;
        const crit = !!ev.critical;
        score[name] = (score[name] || 0) + (isDice ? (crit * 10 + 2) : 0);
      });
      const entries = Object.entries(score).sort((a,b) => b[1] - a[1]);
      const top = entries[0];
      if (!top) return res.status(200).json({ ok: true, snapshot: null });
      const [heroName, topScore] = top;
      const ins = await supabase
        .schema('public')
        .from('tavern_weekly_champions')
        .insert({ week_start: start.toISOString(), week_end: end.toISOString(), hero_name: heroName, score: topScore })
        .select('*')
        .single();
      if (ins.error) {
        try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'error', message: ins.error.message || 'Falha ao salvar snapshot' }); } catch {}
        return res.status(500).json({ error: ins.error.message || 'Falha ao salvar snapshot' });
      }
      try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'success', message: `Snapshot manual para ${heroName}` }); } catch {}
      return res.status(200).json({ ok: true, snapshot: ins.data });
    } catch (err) {
      console.error('tavern dice-weekly-snapshot POST error', err);
      try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'error', message: String(err?.message || err) }); } catch {}
      return res.status(500).json({ error: 'Erro ao criar snapshot semanal' });
    }
  }

  if (action === 'dice-weekly-snapshot-auto') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!(await isAdminRequest(req))) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const range = getLastWeekRange();
      const { data: existing, error: exErr } = await supabase
        .schema('public')
        .from('tavern_weekly_champions')
        .select('id')
        .gte('week_start', range.start.toISOString())
        .lte('week_end', range.end.toISOString())
        .limit(1);
      if (exErr) return res.status(500).json({ error: exErr.message || 'Falha ao verificar campeão' });
      if (Array.isArray(existing) && existing.length > 0) {
        try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'skipped', message: 'Snapshot já existente' }); } catch {}
        return res.status(200).json({ ok: true, skipped: true });
      }
      const { data, error } = await supabase
        .schema('public')
        .from('tavern_dice_events')
        .select('hero_name, roll, critical, created_at')
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
        .limit(5000);
      if (error) {
        try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'error', message: error.message || 'Falha ao obter eventos' }); } catch {}
        return res.status(500).json({ error: error.message || 'Falha ao obter eventos' });
      }
      const score = {};
      (data || []).forEach(ev => {
        const name = ev.hero_name;
        const crit = !!ev.critical;
        score[name] = (score[name] || 0) + (crit ? 12 : 2);
      });
      const entries = Object.entries(score).sort((a,b) => b[1] - a[1]);
      const top = entries[0];
      if (!top) {
        try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'empty', message: 'Sem eventos na semana' }); } catch {}
        return res.status(200).json({ ok: true, snapshot: null });
      }
      const [heroName, topScore] = top;
      const ins = await supabase
        .schema('public')
        .from('tavern_weekly_champions')
        .insert({ week_start: range.start.toISOString(), week_end: range.end.toISOString(), hero_name: heroName, score: topScore })
        .select('*')
        .single();
      if (ins.error) {
        try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'error', message: ins.error.message || 'Falha ao salvar snapshot' }); } catch {}
        return res.status(500).json({ error: ins.error.message || 'Falha ao salvar snapshot' });
      }
      try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'success', message: `Snapshot semanal para ${heroName}` }); } catch {}
      return res.status(200).json({ ok: true, snapshot: ins.data });
    } catch (err) {
      try { await supabase.schema('public').from('tavern_cron_logs').insert({ status: 'error', message: String(err?.message || err) }); } catch {}
      return res.status(500).json({ error: 'Erro ao criar snapshot semanal' });
    }
  }

  if (action === 'dice-weekly-champions') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const { data, error } = await supabase
        .schema('public')
        .from('tavern_weekly_champions')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(20);
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter campeões' });
      return res.status(200).json({ champions: data || [] });
    } catch (err) {
      console.error('tavern dice-weekly-champions GET error', err);
      return res.status(500).json({ error: 'Erro ao obter campeões' });
    }
  }

  if (action === 'dice-weekly-cron-status') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const next = getNextWeeklySnapshotTime();
      const { data, error } = await supabase
        .schema('public')
        .from('tavern_weekly_champions')
        .select('week_end')
        .order('week_end', { ascending: false })
        .limit(1);
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter último snapshot' });
      const last = Array.isArray(data) && data[0] ? data[0].week_end : null;
      return res.status(200).json({ nextSnapshotAt: next.toISOString(), lastSnapshotAt: last });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao obter status do cron' });
    }
  }

  return res.status(400).json({ error: 'Ação inválida' });
}
  if (action === 'dice-weekly-cron-logs') {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
      const { data, error } = await supabase
        .schema('public')
        .from('tavern_cron_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(20);
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter logs' });
      return res.status(200).json({ logs: data || [] });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao obter logs' });
    }
  }

