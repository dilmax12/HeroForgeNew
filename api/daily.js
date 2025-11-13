// Endpoint consolidado: /api/daily
// Atende tanto leaderboard (GET) quanto submit (POST) via query ?action=leaderboard|submit

// Estado compartilhado em memória (funciona em dev e em serverless aquecido)
const leaderboardByDay = (globalThis.__dailyLeaderboard = globalThis.__dailyLeaderboard || {});

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseAction(req) {
  try {
    // Vercel/Next expõe req.query, mas garantimos fallback via URL
    const q = (req.query && (req.query.action || req.query.a)) || null;
    if (q) return String(q);
    const u = new URL(req.url, 'http://localhost');
    return u.searchParams.get('action') || u.searchParams.get('a') || null;
  } catch { return null; }
}

function pickEnemies(level) {
  if (level <= 2) return [{ type: 'Goblin', count: 2, level }, { type: 'Lobo', count: 1, level }];
  if (level <= 5) return [{ type: 'Bandido', count: 1, level }, { type: 'Esqueleto', count: 1, level }];
  return [{ type: 'Troll', count: 1, level }, { type: 'Bandido', count: 2, level }];
}

function simulateRun(hero) {
  const level = Number(hero?.progression?.level || hero?.level || 1);
  const attrs = hero?.attributes || {};
  const power = (attrs.forca || 5) + (attrs.destreza || 5) + (attrs.constituicao || 5) + level;
  const enemies = pickEnemies(level);
  let enemyPower = 0;
  enemies.forEach(e => { enemyPower += (e.level || 1) * (e.count || 1) * 12; });
  const baseWinChance = level <= 2 ? 55 : level <= 5 ? 60 : 65;
  const winChance = Math.max(30, Math.min(90, baseWinChance + (power - enemyPower) * 1));
  const victory = Math.random() * 100 < winChance;
  const xp = victory ? Math.max(20, Math.round(level * 12)) : Math.max(10, Math.round(level * 6));
  const gold = victory ? Math.max(15, Math.round(level * 8)) : Math.max(5, Math.round(level * 4));
  return { victory, xp, gold };
}

export default async function handler(req, res) {
  try {
    const action = parseAction(req);
    if (req.method === 'GET') {
      // Leaderboard
      if (action && action !== 'leaderboard') {
        return res.status(400).json({ error: 'Ação inválida para GET. Use action=leaderboard.' });
      }
      const key = todayKey();
      const entries = Array.isArray(leaderboardByDay[key]) ? leaderboardByDay[key] : [];
      const sorted = entries.slice().sort((a, b) => b.score - a.score);
      return res.json({ date: key, entries: sorted });
    }

    if (req.method === 'POST') {
      // Submit
      if (action && action !== 'submit') {
        return res.status(400).json({ error: 'Ação inválida para POST. Use action=submit.' });
      }
      // Ler body com fallback manual caso req.body esteja vazio
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

      const { hero } = body || {};
      if (!hero) return res.status(400).json({ error: 'Missing hero' });

      const level = Number(hero?.progression?.level || hero?.level || 1);
      const runsCount = Math.max(1, Math.min(3, level <= 2 ? 1 : level <= 5 ? 2 : 3));
      let xpTotal = 0, goldTotal = 0, victories = 0;
      for (let i = 0; i < runsCount; i++) {
        const r = simulateRun(hero);
        xpTotal += r.xp;
        goldTotal += r.gold;
        victories += r.victory ? 1 : 0;
      }

      const key = todayKey();
      const heroId = hero.id || hero.name || `anon_${Math.random().toString(36).slice(2,7)}`;
      const entry = {
        heroId,
        heroName: hero.name || 'Herói',
        class: hero.class || hero.heroClass || 'Aventureiro',
        xpToday: xpTotal,
        goldToday: goldTotal,
        victoriesToday: victories,
        date: key,
        score: xpTotal * 1.0 + goldTotal * 0.5 + victories * 5
      };

      leaderboardByDay[key] = leaderboardByDay[key] || [];
      const existingIdx = leaderboardByDay[key].findIndex(e => e.heroId === heroId);
      if (existingIdx >= 0) leaderboardByDay[key][existingIdx] = entry; else leaderboardByDay[key].push(entry);

      return res.json({ ok: true, entry });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('daily consolidated error', err);
    return res.status(500).json({ error: 'Erro no endpoint diário' });
  }
}

