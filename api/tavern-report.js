// Serverless route: /api/tavern-report
// Registra denúncias de mensagens da Taverna e (opcional) oculta a mensagem.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase server env ausente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' });
  }

  // Tenta ler JSON mesmo quando body vem vazio por limitações do deploy
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    console.error('tavern-report error', err);
    return res.status(500).json({ error: 'Erro no servidor ao registrar denúncia' });
  }
}
