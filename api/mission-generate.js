export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { hero = {} } = req.body || {};

    const pickDifficulty = (level) => {
      if (level <= 3) return 'easy';
      if (level <= 7) return 'normal';
      return 'hard';
    };

    const clampProb = (p) => Math.max(0.05, Math.min(0.95, Number(p || 0)));

    const defaultMissionFromHero = (h = {}) => {
      const name = h.name || 'Herói';
      const klass = h.class || h.klass || 'Aventureiro';
      const level = Number(h.level || h.progression?.level || 1) || 1;
      const difficulty = pickDifficulty(level);
      // Alinhar com a lore de "A Balada do Véu Partido"
      const objective = `Selar uma fenda instável do Véu e recuperar um artefato do Véu`;
      const location = `Santuário Velado de Altharion`;
      const challenge = `Ecos do Além, guardiões do Véu e zonas de magia instável`;
      const attrs = h.attributes || {};
      const diffPenalty = difficulty === 'easy' ? 0 : difficulty === 'normal' ? 0.10 : 0.20;
      const probA = clampProb(0.30 + ((Number(attrs.sabedoria) || 0) * 0.05) - diffPenalty);
      const probB = clampProb(0.30 + ((Number(attrs.forca) || 0) * 0.05) - diffPenalty);
      const probC = clampProb(0.30 + ((Number(attrs.destreza) || 0) * 0.05) - diffPenalty);
      return {
        id: `m-${Date.now()}`,
        description: `${name} — ${klass} — Nível ${level}. Objetivo: ${objective}. Local: ${location}. Desafio: ${challenge}. A Guilda dos Aventureiros de Altharion patrocina esta operação.`,
        objective,
        location,
        challenge,
        difficulty,
        choices: [
          { key: 'A', text: 'Estudar a fenda com runas de estabilização (Ordem)', success: probA },
          { key: 'B', text: 'Aproveitar a energia do Véu e avançar (Sombra)', success: probB },
          { key: 'C', text: 'Desviar criaturas e selar com sutileza', success: probC }
        ]
      };
    };

    const mission = defaultMissionFromHero(hero);
    return res.json({ mission });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao gerar missão' });
  }
}
