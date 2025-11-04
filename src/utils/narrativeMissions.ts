import { Quest, QuestChoice, HeroClass } from '../types/hero';
import { Hero, EnhancedQuestChoice, QuestChoiceEffect, DecisionLogEntry } from '../types/hero';
import { useHeroStore } from '../store/heroStore';

// Templates de missões narrativas com escolhas
const NARRATIVE_MISSION_TEMPLATES = [
  {
    id: 'prisoner-rescue',
    title: 'O Prisioneiro Perdido',
    description: 'Um comerciante foi capturado por bandidos. Como você vai lidar com a situação?',
    difficulty: 'medio' as const,
    levelRequirement: 3,
    type: 'narrative' as const,
    location: 'Estrada do Norte',
    narrative: {
      intro: 'Você encontra um acampamento de bandidos na estrada. Através das árvores, você vê um comerciante amarrado próximo a uma fogueira.',
      situation: 'Os bandidos parecem estar discutindo sobre o resgate. Você tem algumas opções de como proceder...'
    },
    choices: [
      {
        id: 'stealth-rescue',
        text: 'Resgate Furtivo',
        description: 'Esperar a noite e tentar resgatar o prisioneiro silenciosamente',
        consequences: {
          reputation: 2,
          xp: 150,
          gold: 50,
          risk: 30,
          reputationChanges: {
            'Guarda da Cidade': 5,
            'Comerciantes': 3,
            'Ladrões': -2
          }
        },
        requirements: {
          level: 3
        }
      },
      {
        id: 'direct-attack',
        text: 'Ataque Direto',
        description: 'Confrontar os bandidos diretamente em combate',
        consequences: {
          reputation: 1,
          xp: 200,
          gold: 100,
          risk: 60,
          reputationChanges: {
            'Guarda da Cidade': 3,
            'Comerciantes': 2,
            'Bandidos': -5
          }
        },
        requirements: {
          level: 4
        }
      },
      {
        id: 'negotiate',
        text: 'Negociar',
        description: 'Tentar negociar a libertação do prisioneiro',
        consequences: {
          reputation: 3,
          xp: 100,
          gold: -50,
          risk: 20,
          reputationChanges: {
            'Comerciantes': 5,
            'Diplomatas': 4,
            'Bandidos': 2
          }
        }
      },
      {
        id: 'ignore',
        text: 'Ignorar',
        description: 'Seguir seu caminho sem se envolver',
        consequences: {
          reputation: -2,
          xp: 0,
          gold: 0,
          risk: 0
        }
      }
    ]
  },
  {
    id: 'cursed-artifact',
    title: 'O Artefato Amaldiçoado',
    description: 'Você encontrou um artefato mágico poderoso, mas ele parece estar amaldiçoado.',
    difficulty: 'dificil' as const,
    levelRequirement: 5,
    type: 'narrative' as const,
    location: 'Ruínas Antigas',
    narrative: {
      intro: 'Nas profundezas de uma ruína antiga, você descobre um orbe brilhante emanando energia mágica.',
      situation: 'O artefato pulsa com poder, mas você sente uma presença sinistra ao redor dele. Sussurros ecoam em sua mente...'
    },
    choices: [
      {
        id: 'take-artifact',
        text: 'Pegar o Artefato',
        description: 'Arriscar a maldição pelo poder que ele oferece',
        consequences: {
          reputation: -1,
          xp: 300,
          gold: 200,
          items: ['orbe-amaldicoado'],
          risk: 70,
          reputationChanges: {
            'Magos Sombrios': 10,
            'Igreja': -8,
            'Estudiosos': 3
          }
        },
        requirements: {
          level: 5
        }
      },
      {
        id: 'purify-artifact',
        text: 'Purificar o Artefato',
        description: 'Tentar remover a maldição com magia sagrada',
        consequences: {
          reputation: 4,
          xp: 250,
          gold: 150,
          items: ['orbe-purificado'],
          risk: 40,
          reputationChanges: {
            'Igreja': 15,
            'Paladinos': 10,
            'Magos Sombrios': -10
          }
        },
        requirements: {
          class: 'clerigo' as HeroClass
        }
      },
      {
        id: 'destroy-artifact',
        text: 'Destruir o Artefato',
        description: 'Destruir o artefato para evitar que cause mal',
        consequences: {
          reputation: 3,
          xp: 200,
          gold: 0,
          risk: 30
        }
      },
      {
        id: 'leave-artifact',
        text: 'Deixar o Artefato',
        description: 'Sair das ruínas sem tocar no artefato',
        consequences: {
          reputation: 1,
          xp: 50,
          gold: 0,
          risk: 0
        }
      }
    ]
  },
  {
    id: 'village-plague',
    title: 'A Praga da Vila',
    description: 'Uma vila está sofrendo com uma praga misteriosa. Os habitantes pedem sua ajuda.',
    difficulty: 'dificil' as const,
    levelRequirement: 6,
    type: 'narrative' as const,
    location: 'Vila de Pedraverde',
    narrative: {
      intro: 'Você chega a uma vila onde metade dos habitantes está doente com uma praga desconhecida.',
      situation: 'O curandeiro local suspeita que a fonte da praga pode estar no poço da vila ou ser causada por magia sombria...'
    },
    choices: [
      {
        id: 'investigate-well',
        text: 'Investigar o Poço',
        description: 'Examinar o poço da vila em busca de contaminação',
        consequences: {
          reputation: 2,
          xp: 180,
          gold: 80,
          risk: 25
        }
      },
      {
        id: 'seek-magical-cure',
        text: 'Buscar Cura Mágica',
        description: 'Procurar por uma solução mágica para a praga',
        consequences: {
          reputation: 3,
          xp: 220,
          gold: 120,
          risk: 45
        },
        requirements: {
          class: 'mago' as HeroClass
        }
      },
      {
        id: 'quarantine-village',
        text: 'Quarentena',
        description: 'Organizar uma quarentena para conter a praga',
        consequences: {
          reputation: 1,
          xp: 100,
          gold: 50,
          risk: 15
        }
      },
      {
        id: 'flee-village',
        text: 'Fugir da Vila',
        description: 'Deixar a vila para evitar contrair a praga',
        consequences: {
          reputation: -3,
          xp: 0,
          gold: 0,
          risk: 0
        }
      }
    ]
  },
  {
    id: 'noble-corruption',
    title: 'A Corrupção do Nobre',
    description: 'Você descobriu evidências de que um nobre local está extorquindo os camponeses.',
    difficulty: 'extremo' as const,
    levelRequirement: 8,
    type: 'narrative' as const,
    location: 'Mansão Dourada',
    narrative: {
      intro: 'Documentos secretos revelam que Lorde Aldric tem extorquido os camponeses locais há anos.',
      situation: 'Você tem evidências suficientes para expô-lo, mas ele é poderoso e tem conexões influentes...'
    },
    choices: [
      {
        id: 'expose-publicly',
        text: 'Exposição Pública',
        description: 'Revelar a corrupção publicamente na praça da cidade',
        consequences: {
          reputation: 5,
          xp: 400,
          gold: 0,
          risk: 80,
          reputationChanges: {
            'Povo': 20,
            'Justiceiros': 15,
            'Nobreza': -15
          }
        },
        requirements: {
          level: 8,
          reputation: 5
        }
      },
      {
        id: 'blackmail-noble',
        text: 'Chantagear o Nobre',
        description: 'Usar as evidências para chantagear o nobre',
        consequences: {
          reputation: -3,
          xp: 200,
          gold: 500,
          risk: 60
        }
      },
      {
        id: 'report-authorities',
        text: 'Reportar às Autoridades',
        description: 'Entregar as evidências às autoridades competentes',
        consequences: {
          reputation: 4,
          xp: 300,
          gold: 200,
          risk: 40
        }
      },
      {
        id: 'confront-directly',
        text: 'Confronto Direto',
        description: 'Confrontar o nobre diretamente em sua mansão',
        consequences: {
          reputation: 2,
          xp: 350,
          gold: 150,
          risk: 90
        },
        requirements: {
          level: 9
        }
      }
    ]
  }
];

export const generateNarrativeMission = (heroLevel: number): Quest => {
  // Filtrar missões apropriadas para o nível do herói
  const availableTemplates = NARRATIVE_MISSION_TEMPLATES.filter(
    template => template.levelRequirement <= heroLevel + 2
  );

  if (availableTemplates.length === 0) {
    // Fallback para missão básica se nenhuma estiver disponível
    return generateBasicNarrativeMission(heroLevel);
  }

  const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
  
  return {
    id: `${template.id}-${Date.now()}`,
    title: template.title,
    description: template.description,
    difficulty: template.difficulty,
    levelRequirement: template.levelRequirement,
    rewards: calculateNarrativeRewards(template.difficulty, heroLevel),
    type: template.type,
    status: 'available',
    location: template.location,
    hasChoices: true,
    choices: template.choices,
    narrative: template.narrative
  };
};

const generateBasicNarrativeMission = (heroLevel: number): Quest => {
  return {
    id: `basic-narrative-${Date.now()}`,
    title: 'Decisão Simples',
    description: 'Uma situação que requer uma escolha cuidadosa.',
    difficulty: 'facil',
    levelRequirement: 1,
    rewards: calculateNarrativeRewards('facil', heroLevel),
    type: 'narrative',
    status: 'available',
    hasChoices: true,
    choices: [
      {
        id: 'choice-a',
        text: 'Opção Segura',
        description: 'Escolher o caminho mais seguro',
        consequences: {
          reputation: 1,
          xp: 50,
          gold: 25,
          risk: 10
        }
      },
      {
        id: 'choice-b',
        text: 'Opção Arriscada',
        description: 'Arriscar por uma recompensa maior',
        consequences: {
          reputation: 0,
          xp: 100,
          gold: 75,
          risk: 50
        }
      }
    ],
    narrative: {
      intro: 'Você se depara com uma situação que requer uma decisão.',
      situation: 'Duas opções se apresentam diante de você...'
    }
  };
};

const calculateNarrativeRewards = (difficulty: string, heroLevel: number) => {
  const baseXP = heroLevel * 10;
  const baseGold = heroLevel * 5;
  
  const multipliers = {
    facil: 1,
    medio: 1.5,
    dificil: 2,
    extremo: 3
  };
  
  const multiplier = multipliers[difficulty as keyof typeof multipliers] || 1;
  
  return {
    xp: Math.floor(baseXP * multiplier),
    gold: Math.floor(baseGold * multiplier)
  };
};

export const processQuestChoice = (
  quest: Quest, 
  choiceId: string, 
  heroLevel: number,
  heroClass: string,
  heroReputation: number
): { success: boolean; outcome: string; rewards: any; reputationChange: number; reputationChanges?: Record<string, number> } => {
  const choice = quest.choices?.find(c => c.id === choiceId);
  
  if (!choice) {
    return {
      success: false,
      outcome: 'Escolha inválida.',
      rewards: {},
      reputationChange: 0
    };
  }

  // Verificar requisitos
  if (choice.requirements) {
    const req = choice.requirements;
    
    if (req.level && heroLevel < req.level) {
      return {
        success: false,
        outcome: `Você precisa ser nível ${req.level} para esta escolha.`,
        rewards: {},
        reputationChange: 0
      };
    }
    
    if (req.class && heroClass !== req.class) {
      return {
        success: false,
        outcome: `Apenas ${req.class}s podem fazer esta escolha.`,
        rewards: {},
        reputationChange: 0
      };
    }
    
    if (req.reputation && heroReputation < req.reputation) {
      return {
        success: false,
        outcome: `Você precisa de mais reputação para esta escolha.`,
        rewards: {},
        reputationChange: 0
      };
    }
  }

  // Calcular sucesso baseado no risco
  const risk = choice.consequences.risk || 0;
  const success = Math.random() * 100 > risk;
  
  if (!success) {
    return {
      success: false,
      outcome: generateFailureOutcome(choice.text),
      rewards: {
        xp: Math.floor((choice.consequences.xp || 0) * 0.3),
        gold: 0
      },
      reputationChange: -1
    };
  }

  // Sucesso - aplicar consequências
  const outcome = generateSuccessOutcome(quest.title, choice.text);
  
  return {
    success: true,
    outcome,
    rewards: {
      xp: choice.consequences.xp || 0,
      gold: choice.consequences.gold || 0,
      items: choice.consequences.items || []
    },
    reputationChange: choice.consequences.reputation || 0,
     reputationChanges: choice.consequences.reputationChanges || {}
  };
};

const generateSuccessOutcome = (questTitle: string, choiceText: string): string => {
  const outcomes = [
    `Sua decisão de "${choiceText}" foi bem-sucedida! A situação foi resolvida de forma satisfatória.`,
    `Você escolheu "${choiceText}" e conseguiu um resultado positivo. Sua reputação na região aumentou.`,
    `A escolha "${choiceText}" provou ser acertada. Você completou a missão com sucesso.`,
    `Sua abordagem "${choiceText}" funcionou perfeitamente. A missão foi concluída com êxito.`
  ];
  
  return outcomes[Math.floor(Math.random() * outcomes.length)];
};

const generateFailureOutcome = (choiceText: string): string => {
  const outcomes = [
    `Infelizmente, sua tentativa de "${choiceText}" não deu certo. Você aprendeu com o erro.`,
    `A escolha "${choiceText}" não teve o resultado esperado. Às vezes as coisas não saem como planejado.`,
    `Sua abordagem "${choiceText}" falhou desta vez. Você ganha experiência mesmo com o fracasso.`,
    `A decisão de "${choiceText}" não foi bem-sucedida, mas você ainda aprende algo valioso.`
  ];
  
  return outcomes[Math.floor(Math.random() * outcomes.length)];
};

export const getNarrativeMissionsByDifficulty = (difficulty: string) => {
  return NARRATIVE_MISSION_TEMPLATES.filter(template => template.difficulty === difficulty);
};

export const getAllNarrativeMissions = () => {
  return NARRATIVE_MISSION_TEMPLATES;
};


export function rollDecision(hero: Hero, choice: EnhancedQuestChoice, partySize = 1): { roll: number; modifiers: number; threshold: number; success: boolean } {
  const baseRoll = Math.floor(Math.random() * 100) + 1;
  const attrs = hero.attributes;
  const affinityBonus = hero.derivedAttributes?.luck ? Math.floor(hero.derivedAttributes.luck / 2) : 0;
  const attrMod = choice.rollModifiers?.attribute ? Math.floor((attrs[choice.rollModifiers.attribute] || 0) * (choice.rollModifiers.multiplier || 1)) + (choice.rollModifiers.bonus || 0) : 0;
  const partyBonus = Math.min(10, Math.floor((partySize - 1) * 2));
  const modifiers = affinityBonus + attrMod + partyBonus;
  const threshold = choice.riskThreshold ?? 50;
  const success = baseRoll + modifiers >= threshold;
  return { roll: baseRoll, modifiers, threshold, success };
}

export function applyChoiceConsequences(heroId: string, choice: EnhancedQuestChoice, success: boolean) {
  const effects = success ? choice.successEffects : (choice.failureEffects || []);
  const store = useHeroStore.getState();
  effects.forEach(effect => {
    switch (effect.type) {
      case 'gold':
        if (typeof effect.value === 'number') store.gainGold(heroId, effect.value);
        break;
      case 'xp':
        if (typeof effect.value === 'number') store.gainXP(heroId, effect.value);
        break;
      case 'reputation':
        if (effect.target && typeof effect.value === 'number') store.updateReputation(heroId, effect.target, effect.value);
        break;
      case 'item':
        if (effect.target) store.addItemToInventory(heroId, effect.target, 1);
        break;
      case 'npc_relation':
      case 'world_event':
      case 'spawn_enemy':
        // Persistência e eventos do mundo podem ser registrados no worldState
        // Integração detalhada abaixo em store.makeQuestChoice
        break;
      default:
        break;
    }
  });
}

export function recordDecision(heroId: string, questId: string, choice: EnhancedQuestChoice, outcome: { roll: number; modifiers: number; threshold: number; success: boolean }) {
  const entry: DecisionLogEntry = {
    id: crypto.randomUUID(),
    heroId,
    questId,
    choiceId: choice.id,
    choiceText: choice.text,
    timestamp: new Date().toISOString(),
    impact: { immediate: {}, longTerm: {} },
    rollResult: outcome
  };
  const store = useHeroStore.getState();
  // Atualiza worldState persistente do herói
  const hero = store.getSelectedHero();
  if (!hero) return;
  hero.worldState = hero.worldState || { factions: {}, activeEvents: [], npcStatus: {}, decisionLog: [], worldEvents: [], locations: {} };
  hero.worldState.decisionLog.push(entry);
  store.updateHero(hero.id, { worldState: hero.worldState, updatedAt: new Date().toISOString() });
}

export interface DungeonLayer { enemies: string[]; events: string[]; rewardHint?: string; }
export interface DungeonRun { id: string; seed: number; layers: DungeonLayer[]; completed?: boolean; metaProgress?: Record<string, number>; }

export function generateDungeonRun(seed: number, layers = 3): DungeonRun {
  const generated: DungeonLayer[] = Array.from({ length: layers }).map((_, i) => ({
    enemies: [`tier-${i + 1}-corrupto`, `tier-${i + 1}-bestial`],
    events: i === 1 ? ['tempestade'] : [],
    rewardHint: i === layers - 1 ? 'baú raro' : 'materiais'
  }));
  return { id: crypto.randomUUID(), seed, layers: generated, completed: false, metaProgress: {} };
}