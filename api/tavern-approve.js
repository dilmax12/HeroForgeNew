// Serverless route: /api/tavern-approve
// GET: lista mensagens pendentes (approved=false)
// POST: altera aprovação de uma mensagem { messageId, approved }

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || '';

function isAuthorized(req) {
  const authHeader = req.headers['authorization'] || '';
  const tokenHeader = req.headers['x-admin-token'] || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return ADMIN_API_TOKEN && (bearer === ADMIN_API_TOKEN || tokenHeader === ADMIN_API_TOKEN);
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase server env ausente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      console.error('tavern-approve GET error', err);
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
      console.error('tavern-approve POST error', err);
      return res.status(500).json({ error: 'Erro ao atualizar aprovação' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

