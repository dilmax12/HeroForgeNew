import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function nowStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const MM = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${HH}${MM}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase env ausente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' });
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      quests: questsRes.data || []
    };

    // garantir bucket
    try {
      await supabase.storage.createBucket('backups', { public: false });
    } catch {}

    const fileName = `backup-${nowStamp()}.json`;
    const fileContent = JSON.stringify(payload);
    const { error: uploadError } = await supabase.storage.from('backups').upload(fileName, Buffer.from(fileContent), { contentType: 'application/json', upsert: true });
    if (uploadError) {
      return res.status(500).json({ error: uploadError.message || 'Falha ao enviar backup para Storage' });
    }

    return res.status(200).json({ ok: true, file: fileName, size: fileContent.length });
  } catch (err) {
    console.error('backup error', err);
    return res.status(500).json({ error: err?.message || 'Erro ao executar backup' });
  }
}