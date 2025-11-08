// Serverless endpoint para obter leaderboard diário

// Observação: em ambiente serverless, o estado em memória pode não persistir entre instâncias.
// Este arquivo assume que o estado é compartilhado com 'daily-submit' em uma instância aquecida.

// Para MVP, se não houver estado, retorna um mock vazio.

// Usar o mesmo armazenamento global em memória do endpoint de submissão
const leaderboardByDay = (globalThis.__dailyLeaderboard = globalThis.__dailyLeaderboard || {});

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const key = todayKey();
    const entries = Array.isArray(leaderboardByDay[key]) ? leaderboardByDay[key] : [];
    const sorted = entries.slice().sort((a, b) => b.score - a.score);
    return res.json({ date: key, entries: sorted });
  } catch (err) {
    console.error('daily-leaderboard error', err);
    return res.status(500).json({ error: 'Erro ao obter leaderboard diário' });
  }
}
