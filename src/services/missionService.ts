export interface MissionChoice {
  key: 'A' | 'B' | 'C';
  text: string;
  success: number; // 0..1
}

export interface Mission {
  id: string;
  description: string;
  objective: string;
  location: string;
  challenge: string;
  difficulty: 'easy' | 'normal' | 'hard';
  choices: MissionChoice[];
}

export interface MissionGenerateRequest {
  hero: any;
  context?: any;
}

export interface MissionGenerateResponse {
  mission: Mission;
}

export interface MissionResolveRequest {
  mission: Mission;
  choice: 'A' | 'B' | 'C';
  hero: any;
}

export interface MissionResolveResult {
  success: boolean;
  xp: number;
  title: string;
  loot: string;
  narrative: string;
  roll: number;
  prob: number;
}

function clampProb(p: number) {
  return Math.max(0.05, Math.min(0.95, p));
}

function pickDifficulty(level: number): 'easy' | 'normal' | 'hard' {
  if (level >= 7) return 'hard';
  if (level >= 4) return 'normal';
  return 'easy';
}

function defaultMissionFromHero(hero: any): Mission {
  const name = hero?.name || 'Herói';
  const klass = hero?.class || hero?.klass || 'Aventureiro';
  const level = Number(hero?.level || hero?.progression?.level || 1) || 1;
  const difficulty = pickDifficulty(level);
  const objective = 'Recuperar um artefato antigo perdido';
  const location = 'Ruínas de Valthor';
  const challenge = 'Guardião espectral e armadilhas antigas';
  const attrs = hero?.attributes || {};
  const diffPenalty = difficulty === 'easy' ? 0 : difficulty === 'normal' ? 0.10 : 0.20;
  const probA = clampProb(0.30 + ((Number(attrs.sabedoria) || 0) * 0.05) - diffPenalty);
  const probB = clampProb(0.30 + ((Number(attrs.forca) || 0) * 0.05) - diffPenalty);
  const probC = clampProb(0.30 + ((Number(attrs.destreza) || 0) * 0.05) - diffPenalty);
  return {
    id: `m-${Date.now()}`,
    description: `${name} — ${klass} — Nível ${level}. Objetivo: ${objective}. Local: ${location}. Desafio: ${challenge}.`,
    objective,
    location,
    challenge,
    difficulty,
    choices: [
      { key: 'A', text: 'Investigar rotas alternativas com cautela', success: probA },
      { key: 'B', text: 'Confrontar o guardião diretamente', success: probB },
      { key: 'C', text: 'Usar astúcia para distrair e infiltrar-se', success: probC }
    ]
  };
}

function resolveOutcomeLocal(mission: Mission, choiceKey: 'A' | 'B' | 'C', hero: any): MissionResolveResult {
  const level = Number(hero?.level || hero?.progression?.level || 1) || 1;
  const choice = (mission?.choices || []).find(c => c.key === choiceKey);
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
  return {
    success,
    xp,
    title,
    loot,
    narrative: success ? outcomeTextSuccess : outcomeTextFail,
    roll,
    prob
  };
}

export async function generateMission(req: MissionGenerateRequest): Promise<Mission> {
  let res = await fetch('/api/mission/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  if (!res.ok) {
    // Fallback para função serverless
    const text1 = await res.text();
    if (res.status === 404) {
      res = await fetch('/api/mission-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
    }
    if (!res.ok) {
      // Último fallback: gerar missão localmente para não bloquear o fluxo
      try {
        return defaultMissionFromHero(req.hero);
      } catch {
        const text2 = await res.text().catch(() => '');
        throw new Error(`Falha ao gerar missão: ${res.status} ${(text2 || text1 || '').slice(0,200)}`);
      }
    }
  }
  const data: MissionGenerateResponse = await res.json();
  return data.mission;
}

export async function resolveMission(req: MissionResolveRequest): Promise<MissionResolveResult> {
  let res = await fetch('/api/mission/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  if (!res.ok) {
    const text1 = await res.text();
    if (res.status === 404) {
      res = await fetch('/api/mission-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });
    }
    if (!res.ok) {
      // Fallback local: resolve sem servidor
      try {
        return resolveOutcomeLocal(req.mission, req.choice, req.hero);
      } catch {
        const text2 = await res.text().catch(() => '');
        throw new Error(`Falha ao resolver missão: ${res.status} ${(text2 || text1 || '').slice(0,200)}`);
      }
    }
  }
  const data = await res.json();
  // Express: { result } | Serverless: direct object
  return (data.result || data) as MissionResolveResult;
}
