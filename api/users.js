import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function parseAction(req) {
  try {
    const q = (req.query && (req.query.action || req.query.a)) || null;
    if (q) return String(q);
    const u = new URL(req.url, 'http://localhost');
    return u.searchParams.get('action') || u.searchParams.get('a') || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase server env ausente' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const action = parseAction(req);
  if (!action) return res.status(400).json({ error: 'Missing action' });

  if (action === 'get') {
    const id = (req.query?.id || '').toString();
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const { data, error } = await supabase.from('players').select('*').eq('id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message || 'Falha ao obter perfil' });
    return res.status(200).json({ profile: Array.isArray(data) && data[0] ? data[0] : null });
  }

  if (action === 'upsert') {
    let body = req.body;
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let d = '';
          req.on('data', c => { d += c; });
          req.on('end', () => resolve(d));
          req.on('error', reject);
        });
        if (raw) body = JSON.parse(raw);
      } catch {}
    }
    const { id, username, email, last_login } = body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const uname = (username || '').trim().toLowerCase();
    if (uname) {
      const { data: existing, error: checkErr } = await supabase.from('players').select('id').eq('username', uname).limit(1);
      if (checkErr) return res.status(500).json({ error: checkErr.message || 'Erro ao validar username' });
      const taken = Array.isArray(existing) && existing[0] && existing[0].id !== id;
      if (taken) return res.status(409).json({ error: 'Nome de usuário já em uso' });
    }
    const payload = { id, username: uname || null, email: email || null, last_login: last_login || null };
    const { data, error } = await supabase.from('players').upsert(payload, { onConflict: 'id' }).select('*').limit(1);
    if (error) return res.status(500).json({ error: error.message || 'Falha ao salvar perfil' });
    return res.status(200).json({ profile: Array.isArray(data) && data[0] ? data[0] : null });
  }

  if (action === 'progress') {
    const id = (req.query?.id || '').toString();
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const [heroesRes, questsRes] = await Promise.all([
      supabase.from('heroes').select('data').eq('user_id', id),
      supabase.from('quests').select('status').eq('user_id', id)
    ]);
    if (heroesRes.error) return res.status(500).json({ error: heroesRes.error.message || 'Falha ao ler heróis' });
    if (questsRes.error) return res.status(500).json({ error: questsRes.error.message || 'Falha ao ler missões' });
    const heroes = Array.isArray(heroesRes.data) ? heroesRes.data : [];
    const quests = Array.isArray(questsRes.data) ? questsRes.data : [];
    let playtime = 0;
    let lastLogin = null;
    let achievements = 0;
    heroes.forEach(h => {
      const stats = h?.data?.stats || {};
      playtime += Number(stats.totalPlayTime || 0) || 0;
      const ll = stats.lastLogin ? new Date(stats.lastLogin) : null;
      if (ll && (!lastLogin || ll > lastLogin)) lastLogin = ll;
      const achList = h?.data?.progression?.achievements || [];
      achievements += Array.isArray(achList) ? achList.length : 0;
    });
    const missionsCompleted = quests.filter(q => q.status === 'completed').length;
    return res.status(200).json({ progress: {
      missionsCompleted,
      achievementsUnlocked: achievements,
      playtimeMinutes: playtime,
      lastLogin: lastLogin ? lastLogin.toISOString() : null
    } });
  }

  return res.status(400).json({ error: 'Ação inválida' });
}
  if (action === 'touch-login') {
    const id = (req.query?.id || '').toString();
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('players').update({ last_login: now }).eq('id', id).select('*').limit(1);
    if (error) return res.status(500).json({ error: error.message || 'Falha ao atualizar login' });
    return res.status(200).json({ profile: Array.isArray(data) && data[0] ? data[0] : null });
  }
