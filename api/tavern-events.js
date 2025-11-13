// Serverless route: /api/tavern-events
// GET: lista eventos aprovados da Taverna
// POST: cria evento (protegidO por token de admin)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || '';

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
      console.error('tavern-events GET error:', err);
      return res.status(500).json({ error: 'Erro ao obter eventos' });
    }
  }

  if (req.method === 'POST') {
    // Protege criação com token de admin. Não envie service-role em chamadas do cliente.
    const authHeader = req.headers['authorization'] || '';
    const tokenHeader = req.headers['x-admin-token'] || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const isAuthorized = ADMIN_API_TOKEN && (bearer === ADMIN_API_TOKEN || tokenHeader === ADMIN_API_TOKEN);
    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Tenta ler body JSON manualmente, se necessário
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
      console.error('tavern-events POST error:', err);
      return res.status(500).json({ error: 'Erro ao criar evento' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
