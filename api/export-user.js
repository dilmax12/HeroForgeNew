import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || '';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

async function isAdminRequest(req) {
  const authHeader = req.headers['authorization'] || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const tokenHeader = req.headers['x-admin-token'] || '';
  if (ADMIN_API_TOKEN && (bearer === ADMIN_API_TOKEN || tokenHeader === ADMIN_API_TOKEN)) return true;
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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const ok = await isAdminRequest(req);
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });
  const id = (req.query?.id || '').toString();
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: 'Supabase env ausente' });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const [playerRes, heroesRes, questsRes, progressRes] = await Promise.all([
      supabase.from('players').select('*').eq('id', id),
      supabase.from('heroes').select('*').eq('user_id', id),
      supabase.from('quests').select('*').eq('user_id', id),
      supabase.from('player_progress').select('*').eq('user_id', id)
    ]);
    for (const r of [playerRes, heroesRes, questsRes, progressRes]) {
      if (r.error) throw r.error;
    }
    const payload = {
      exported_at: new Date().toISOString(),
      player: Array.isArray(playerRes.data) ? playerRes.data[0] || null : null,
      heroes: heroesRes.data || [],
      quests: questsRes.data || [],
      progress: Array.isArray(progressRes.data) ? progressRes.data[0] || null : null
    };
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(payload));
  } catch (err) {
    console.error('export-user error', err);
    return res.status(500).json({ error: err?.message || 'Erro ao exportar dados' });
  }
}