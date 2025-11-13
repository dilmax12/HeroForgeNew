export default async function handler(req, res) {
  try {
    const action = (req.query?.action || req.body?.action || '').toString();
    if (!action) {
      return res.status(400).json({ error: 'Missing action. Use ?action=generate|resolve' });
    }

    if (action === 'generate') {
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
    }

    if (action === 'resolve') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const { mission, choiceKey, hero = {} } = req.body || {};
      if (!mission || !choiceKey) {
        return res.status(400).json({ error: 'Missing mission or choiceKey' });
      }

      const pickDifficulty = (level) => {
        if (level <= 3) return 'easy';
        if (level <= 7) return 'normal';
        return 'hard';
      };
      const clampProb = (p) => Math.max(0.05, Math.min(0.95, Number(p || 0)));

      const level = Number(hero.level || hero.progression?.level || 1) || 1;
      const choice = (mission?.choices || []).find((c) => c.key === choiceKey);
      const prob = choice ? Number(choice.success) : 0.5;
      const roll = Math.random();
      const success = roll <= prob;
      const difficulty = mission?.difficulty || pickDifficulty(level);

      const baseByDiff = difficulty === 'easy' ? 12 : difficulty === 'normal' ? 20 : 26;
      const baseWithLevel = baseByDiff + Math.min(10, Math.floor(level / 2));
      const xpRaw = success ? Math.round(baseWithLevel * 1.6) : Math.round(baseWithLevel * 0.6);
      const xp = Math.max(10, Math.min(50, xpRaw));

      const lootChance = success ? 0.35 : 0.1;
      const titleChance = success ? 0.2 : 0.05;
      const gotLoot = Math.random() < lootChance;
      const gotTitle = Math.random() < titleChance;
      const loot = gotLoot ? 'Relíquia menor das Ruínas' : '';
      const title = gotTitle ? (difficulty === 'hard' ? 'Quebrador de Guardiões' : 'Eco das Ruínas') : '';
      const outcomeTextSuccess = `Com determinação e ${choice?.text?.toLowerCase() || 'tática cuidadosa'}, o herói supera o desafio em ${mission?.location}. O artefato é recuperado e o caminho fica marcado por passos seguros.`;
      const outcomeTextFail = `A abordagem ${choice?.text?.toLowerCase() || 'arrisca'} sai do controle. O guardião repele o avanço e o herói recua, aprendendo com cada ferida e armadilha ativada.`;

      return res.json({
        success,
        xp,
        title,
        loot,
        narrative: success ? outcomeTextSuccess : outcomeTextFail,
        roll,
        prob,
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro na rota de missões' });
  }
}
