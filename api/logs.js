import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || '';
    const authHeader = req.headers['authorization'] || '';
    const tokenHeader = req.headers['x-admin-token'] || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const isAuth = ADMIN_API_TOKEN && (bearer === ADMIN_API_TOKEN || tokenHeader === ADMIN_API_TOKEN);
    if (!isAuth) return res.status(401).json({ error: 'Unauthorized' });
    const action = (req.query?.action || '').toString();
    if (action === 'get') {
      const name = (req.query?.name || '').toString();
      if (!name) return res.status(400).json({ error: 'Missing name' });
      try {
        try { await supabase.storage.createBucket('logs', { public: false }); } catch {}
        const { data, error } = await supabase.storage.from('logs').download(name);
        if (error) return res.status(500).json({ error: error.message || 'Falha ao baixar log' });
        const buf = Buffer.from(await data.arrayBuffer());
        const content = buf.toString('utf-8');
        try {
          return res.status(200).json({ name, json: JSON.parse(content) });
        } catch {
          return res.status(200).json({ name, content });
        }
      } catch (err) {
        console.error('logs get error', err);
        return res.status(500).json({ error: err?.message || 'Erro ao obter log' });
      }
    }
  }
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase env ausente' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  if (req.method === 'GET') {
    try {
      try { await supabase.storage.createBucket('logs', { public: false }); } catch {}
      const { data, error } = await supabase.storage.from('logs').list('', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) return res.status(500).json({ error: error.message || 'Falha ao listar logs' });
      return res.status(200).json({ files: data || [] });
    } catch (err) {
      console.error('logs list error', err);
      return res.status(500).json({ error: err?.message || 'Erro ao listar logs' });
    }
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
  const event = body || {};
  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  try {
    try { await supabase.storage.createBucket('logs', { public: false }); } catch {}
    const fileName = `${id}.json`;
    const { error: uploadError } = await supabase.storage.from('logs').upload(fileName, Buffer.from(JSON.stringify({ id, ts: new Date().toISOString(), ...event })), { contentType: 'application/json', upsert: true });
    if (uploadError) return res.status(500).json({ error: uploadError.message || 'Falha ao gravar log' });
    return res.status(200).json({ ok: true, id, file: fileName });
  } catch (err) {
    console.error('logs error', err);
    return res.status(500).json({ error: err?.message || 'Erro ao registrar log' });
  }
}
