import { Hero, ReputationFaction } from '../types/hero';

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
    questModifiers: {
      goldBonus: -0.5,
      xpBonus: -0.3,
      specialQuestsUnlocked: []
    }
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
    questModifiers: {
      goldBonus: 0.5,
      xpBonus: 0.3,
      specialQuestsUnlocked: ['legendary_quests', 'faction_champion']
    }
  }
];

export const FACTION_DESCRIPTIONS = {
  'Guarda da Cidade': {
    description: 'Defensores da ordem e da lei nas cidades',
    opposingFactions: ['Ladrões', 'Cultistas'],
    allyFactions: ['Comerciantes', 'Clero']
  },
  'Comerciantes': {
    description: 'Mercadores e artesãos que movem a economia',
    opposingFactions: ['Ladrões'],
    allyFactions: ['Guarda da Cidade']
  },
  'Ladrões': {
    description: 'Organizações criminosas das sombras',
    opposingFactions: ['Guarda da Cidade', 'Clero'],
    allyFactions: ['Cultistas']
  },
  'Clero': {
    description: 'Servos dos deuses e da luz divina',
    opposingFactions: ['Cultistas', 'Ladrões'],
    allyFactions: ['Guarda da Cidade']
  },
  'Cultistas': {
    description: 'Adoradores de entidades sombrias',
    opposingFactions: ['Clero', 'Guarda da Cidade'],
    allyFactions: ['Ladrões']
  },
  'Exploradores': {
    description: 'Aventureiros que desbravam terras desconhecidas',
    opposingFactions: [],
    allyFactions: []
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
  const updatedFactions = hero.reputationFactions.map(faction => {
    if (faction.name === factionName) {
      const newReputation = Math.max(-1000, Math.min(1000, faction.reputation + change));
      
      // Aplicar mudanças em facções opostas
      const factionInfo = FACTION_DESCRIPTIONS[factionName as keyof typeof FACTION_DESCRIPTIONS];
      if (factionInfo && change > 0) {
        // Reduzir reputação com facções opostas
        factionInfo.opposingFactions.forEach(opposingFaction => {
          const opposingIndex = hero.reputationFactions.findIndex(f => f.name === opposingFaction);
          if (opposingIndex !== -1) {
            hero.reputationFactions[opposingIndex].reputation = Math.max(
              -1000, 
              hero.reputationFactions[opposingIndex].reputation - Math.floor(change * 0.3)
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
  
  hero.reputationFactions.forEach(faction => {
    const level = getReputationLevel(faction.reputation);
    availableQuests.push(...level.questModifiers.specialQuestsUnlocked);
  });
  
  return [...new Set(availableQuests)]; // Remove duplicatas
}

export function calculateReputationModifiers(hero: Hero, factionName: string) {
  const faction = hero.reputationFactions.find(f => f.name === factionName);
  if (!faction) return { goldBonus: 0, xpBonus: 0 };
  
  const level = getReputationLevel(faction.reputation);
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
  
  // Exemplo: Baseado em missões completadas
  if (hero.completedQuests.length > 0) {
    const lastQuest = hero.completedQuests[hero.completedQuests.length - 1];
    
    // Lógica simples para determinar mudanças de reputação
    if (lastQuest.type === 'combat') {
      events.push({
        factionName: 'Guarda da Cidade',
        change: 10,
        reason: 'Eliminou ameaças à cidade'
      });
    }
    
    if (lastQuest.difficulty === 'legendary') {
      events.push({
        factionName: 'Exploradores',
        change: 25,
        reason: 'Completou uma missão lendária'
      });
    }
  }
  
  return events;
}

export function formatReputationChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  const color = change > 0 ? 'text-green-400' : 'text-red-400';
  return `<span class="${color}">${sign}${change}</span>`;
}