// Endpoint consolidado: /api/tavern
// Ações: ?action=approve (GET/POST), ?action=events (GET/POST), ?action=report (POST)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || '';

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
    if (!isAuthorized(req)) {
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
      const authHeader = req.headers['authorization'] || '';
      const tokenHeader = req.headers['x-admin-token'] || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const isAuth = ADMIN_API_TOKEN && (bearer === ADMIN_API_TOKEN || tokenHeader === ADMIN_API_TOKEN);
      if (!isAuth) {
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

  return res.status(400).json({ error: 'Ação inválida' });
}

