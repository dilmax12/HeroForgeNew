import { Hero } from '../types/hero';
import type { Quest } from '../types/hero';
import { rankSystem } from './rankSystem';
import { RANK_ORDER, RankLevel } from '../types/ranks';

export interface ReputationLevel {
  name: string;
  threshold: number;
  color: string;
  description: string;
  questModifiers: {
    goldBonus: number;
    xpBonus: number;
    specialQuestsUnlocked: string[];
  };
}

export const REPUTATION_LEVELS: ReputationLevel[] = [
  {
    name: 'Desprezado',
    threshold: -1000,
    color: 'text-red-500',
    description: 'Você é visto como um inimigo desta facção',
    questModifiers: { goldBonus: -0.5, xpBonus: -0.3, specialQuestsUnlocked: [] }
  },
  {
    name: 'Hostil',
    threshold: -500,
    color: 'text-red-400',
    description: 'Esta facção não confia em você',
    questModifiers: {
      goldBonus: -0.3,
      xpBonus: -0.2,
      specialQuestsUnlocked: []
    }
  },
  {
    name: 'Desconfiado',
    threshold: -100,
    color: 'text-orange-400',
    description: 'Você é visto com suspeita',
    questModifiers: {
      goldBonus: -0.1,
      xpBonus: 0,
      specialQuestsUnlocked: []
    }
  },
  {
    name: 'Neutro',
    threshold: 0,
    color: 'text-gray-400',
    description: 'Você não tem reputação especial',
    questModifiers: {
      goldBonus: 0,
      xpBonus: 0,
      specialQuestsUnlocked: []
    }
  },
  {
    name: 'Amigável',
    threshold: 100,
    color: 'text-green-400',
    description: 'Esta facção gosta de você',
    questModifiers: {
      goldBonus: 0.1,
      xpBonus: 0.1,
      specialQuestsUnlocked: ['friendly_merchant', 'guild_favor']
    }
  },
  {
    name: 'Respeitado',
    threshold: 500,
    color: 'text-blue-400',
    description: 'Você é respeitado por esta facção',
    questModifiers: {
      goldBonus: 0.25,
      xpBonus: 0.2,
      specialQuestsUnlocked: ['elite_missions', 'faction_secrets']
    }
  },
  {
    name: 'Reverenciado',
    threshold: 1000,
    color: 'text-purple-400',
    description: 'Você é uma lenda para esta facção',
    questModifiers: { goldBonus: 0.5, xpBonus: 0.3, specialQuestsUnlocked: ['legendary_quests', 'faction_champion'] }
  }
];

export const FACTION_DESCRIPTIONS = {
  'Guarda da Cidade': {
    description: 'Defensores da lei e da ordem nas ruas',
    opposingFactions: ['Ladrões', 'Cultistas'],
    allyFactions: ['Clero', 'Comerciantes'],
    minRankRequirement: 'E' as RankLevel
  },
  'Ladrões': {
    description: 'Guildas clandestinas e redes de contrabando',
    opposingFactions: ['Guarda da Cidade', 'Comerciantes'],
    allyFactions: ['Cultistas'],
    minRankRequirement: 'D' as RankLevel
  },
  'Clero': {
    description: 'Ordens sagradas, templos e curandeiros',
    opposingFactions: ['Cultistas'],
    allyFactions: ['Guarda da Cidade'],
    minRankRequirement: 'D' as RankLevel
  },
  'Cultistas': {
    description: 'Seitas profanas e rituais sombrios',
    opposingFactions: ['Clero', 'Guarda da Cidade'],
    allyFactions: ['Ladrões'],
    minRankRequirement: 'B' as RankLevel
  },
  'Comerciantes': {
    description: 'Companhias de comércio, caravanas e mercados',
    opposingFactions: ['Ladrões'],
    allyFactions: ['Guarda da Cidade', 'Exploradores'],
    minRankRequirement: 'E' as RankLevel
  },
  'Exploradores': {
    description: 'Cartógrafos, aventureiros e descobridores de rotas',
    opposingFactions: [],
    allyFactions: ['Comerciantes'],
    minRankRequirement: 'D' as RankLevel
  }
};

export function getReputationLevel(reputation: number): ReputationLevel {
  const levels = [...REPUTATION_LEVELS].reverse();
  return levels.find(level => reputation >= level.threshold) || REPUTATION_LEVELS[0];
}

export function updateHeroReputation(
  hero: Hero, 
  factionName: string, 
  change: number
): Hero {
  const updatedFactions = (hero.reputationFactions || []).map(faction => {
    if (faction.name === factionName) {
      const newReputation = Math.max(-1000, Math.min(1000, faction.reputation + change));
      
      // Aplicar mudanças em facções opostas
      const factionInfo = FACTION_DESCRIPTIONS[factionName as keyof typeof FACTION_DESCRIPTIONS];
      if (factionInfo && change > 0) {
        // Reduzir reputação com facções opostas
        factionInfo.opposingFactions.forEach(opposingFaction => {
          const opposingIndex = (hero.reputationFactions || []).findIndex(f => f.name === opposingFaction);
          if (opposingIndex !== -1) {
            (hero.reputationFactions || [])[opposingIndex].reputation = Math.max(
              -1000, 
              (hero.reputationFactions || [])[opposingIndex].reputation - Math.floor(change * 0.3)
            );
          }
        });
      }
      
      return { ...faction, reputation: newReputation };
    }
    return faction;
  });

  return {
    ...hero,
    reputationFactions: updatedFactions
  };
}

export function getAvailableQuestsByReputation(hero: Hero): string[] {
  const availableQuests: string[] = [];
  
  (hero.reputationFactions || []).forEach(faction => {
    const level = getReputationLevel(faction.reputation);
    availableQuests.push(...level.questModifiers.specialQuestsUnlocked);
  });
  
  return [...new Set(availableQuests)]; // Remove duplicatas
}

export function calculateReputationModifiers(hero: Hero, factionName: string) {
  const faction = (hero.reputationFactions || []).find(f => f.name === factionName);
  if (!faction) return { goldBonus: 0, xpBonus: 0 };
  
  const level = getReputationLevel(faction.reputation);
  const info = FACTION_DESCRIPTIONS[factionName as keyof typeof FACTION_DESCRIPTIONS] as any;
  const heroRank = rankSystem.calculateRank(hero);
  const meetsRank = !info?.minRankRequirement || (RANK_ORDER.indexOf(heroRank) >= RANK_ORDER.indexOf(info.minRankRequirement as RankLevel));
  if (!meetsRank) {
    return { goldBonus: 0, xpBonus: 0 };
  }
  return level.questModifiers;
}

export function getReputationColor(reputation: number): string {
  const level = getReputationLevel(reputation);
  return level.color;
}

export function getReputationDescription(reputation: number): string {
  const level = getReputationLevel(reputation);
  return `${level.name}: ${level.description}`;
}

// Função para gerar eventos de reputação baseados nas ações do herói
export function generateReputationEvents(hero: Hero): Array<{
  factionName: string;
  change: number;
  reason: string;
}> {
  const events = [];

  // Exemplo simples de eventos (ajuste conforme sua lógica real)
  // Melhor manter neutro, usando nomes das 3 facções
  if ((hero.completedQuests || []).length > 0) {
    events.push({
      factionName: 'Guarda da Cidade',
      change: 10,
      reason: 'Apoiou a segurança urbana'
    });
    events.push({
      factionName: 'Ladrões',
      change: -3,
      reason: 'Ações que atrapalham redes clandestinas'
    });
  }

  return events;
}

export function formatReputationChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  const color = change > 0 ? 'text-green-400' : 'text-red-400';
  return `<span class="${color}">${sign}${change}</span>`;
}

// Inferir mudanças de reputação com base no conteúdo da missão
export function inferQuestFactionChanges(quest: Quest): Array<{ factionName: string; change: number; reason?: string }> {
  const text = `${quest.title} ${quest.description}`.toLowerCase();
  const baseByDifficulty: Record<string, number> = { rapida: 1, facil: 2, padrao: 3, medio: 5, dificil: 8, epica: 12 };
  const base = baseByDifficulty[quest.difficulty] ?? 3;

  const changes: Array<{ factionName: string; change: number; reason?: string }> = [];

  if (quest.isGuildQuest) {
    const guildBase: Record<string, number> = { facil: 5, medio: 8, dificil: 12, epica: 20 };
    const gb = guildBase[quest.difficulty] ?? 6;
    changes.push({ factionName: 'Guarda da Cidade', change: gb, reason: 'Missão de guilda' });
    return changes;
  }

  if (quest.type === 'exploracao') {
    changes.push({ factionName: 'Exploradores', change: base, reason: 'Exploração e mapeamento' });
  } else if (quest.type === 'caca' || quest.type === 'contrato' || quest.type === 'historia') {
    changes.push({ factionName: 'Guarda da Cidade', change: base, reason: 'Proteção e estabilidade' });
  }

  const keywordMap: Array<{ re: RegExp; faction: string; delta: number; reason: string }> = [
    { re: /(comerciante|mercador|rota|caravana)/, faction: 'Comerciantes', delta: Math.max(1, Math.floor(base * 0.5)), reason: 'Apoio ao comércio' },
    { re: /(cultista|ritual|profano|blasfemo)/, faction: 'Cultistas', delta: -Math.max(1, Math.floor(base * 0.4)), reason: 'Combate a seitas profanas' },
    { re: /(ladrao|roubo|contrabando|clandestino|assassino)/, faction: 'Ladrões', delta: -Math.max(1, Math.floor(base * 0.4)), reason: 'Repressão ao crime' },
    { re: /(resgatar|defender|patrulha|guarda|protege|lei|ordem)/, faction: 'Guarda da Cidade', delta: Math.max(1, Math.floor(base * 0.5)), reason: 'Ações de segurança' },
    { re: /(igreja|templo|cura|sagrado)/, faction: 'Clero', delta: Math.max(1, Math.floor(base * 0.4)), reason: 'Serviço aos templos' },
    { re: /(mapear|explorar|ruínas|descobrir|cartografar)/, faction: 'Exploradores', delta: Math.max(1, Math.floor(base * 0.4)), reason: 'Exploração e cartografia' }
  ];

  keywordMap.forEach(rule => {
    if (rule.re.test(text)) {
      changes.push({ factionName: rule.faction, change: rule.delta, reason: rule.reason });
    }
  });

  const merged: Record<string, { change: number; reason?: string[] }> = {};
  changes.forEach(c => {
    const key = c.factionName;
    merged[key] = merged[key] || { change: 0, reason: [] };
    merged[key].change += c.change;
    if (c.reason) merged[key].reason!.push(c.reason);
  });

  const mergedArray = Object.entries(merged).map(([factionName, info]) => ({ factionName, change: info.change, reason: info.reason?.join('; ') }));
  mergedArray.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return mergedArray.slice(0, 2);
}
