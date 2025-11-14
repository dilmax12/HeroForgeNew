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
    const { data, error } = await supabase.from('player_progress').select('*').eq('user_id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message || 'Falha ao obter progresso' });
    return res.status(200).json({ progress: Array.isArray(data) && data[0] ? data[0] : null });
  }

  if (action === 'delta') {
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
    const { user_id, missionsCompleted = 0, achievementsUnlocked = 0, playtimeMinutes = 0, lastLogin = null } = body || {};
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    const inc = { missions_completed: missionsCompleted, achievements_unlocked: achievementsUnlocked, playtime_minutes: playtimeMinutes };
    try {
      const now = new Date().toISOString();
      const { data: existing } = await supabase.from('player_progress').select('*').eq('user_id', user_id).limit(1);
      if (Array.isArray(existing) && existing[0]) {
        const updates = {
          missions_completed: (existing[0].missions_completed || 0) + inc.missions_completed,
          achievements_unlocked: (existing[0].achievements_unlocked || 0) + inc.achievements_unlocked,
          playtime_minutes: (existing[0].playtime_minutes || 0) + inc.playtime_minutes,
          last_login: lastLogin || existing[0].last_login || null,
          updated_at: now
        };
        const { data, error } = await supabase.from('player_progress').update(updates).eq('user_id', user_id).select('*').limit(1);
        if (error) return res.status(500).json({ error: error.message || 'Falha ao atualizar progresso' });
        return res.status(200).json({ progress: Array.isArray(data) && data[0] ? data[0] : null });
      } else {
        const payload = { user_id, missions_completed: inc.missions_completed, achievements_unlocked: inc.achievements_unlocked, playtime_minutes: inc.playtime_minutes, last_login: lastLogin, updated_at: now };
        const { data, error } = await supabase.from('player_progress').upsert(payload, { onConflict: 'user_id' }).select('*').limit(1);
        if (error) return res.status(500).json({ error: error.message || 'Falha ao criar progresso' });
        return res.status(200).json({ progress: Array.isArray(data) && data[0] ? data[0] : null });
      }
    } catch (err) {
      console.error('player-progress delta error', err);
      return res.status(500).json({ error: 'Erro no servidor ao atualizar progresso' });
    }
  }

  return res.status(400).json({ error: 'Ação inválida' });
}