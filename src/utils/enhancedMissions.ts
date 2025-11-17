/**
 * Sistema de Missões Aprimoradas com Decisões e Consequências
 * Implementa o novo sistema de narrativa procedural
 */

import { EnhancedQuest, EnhancedQuestChoice, Hero } from '../types/hero';
import { worldStateManager } from './worldState';

// Templates de missões com decisões complexas
const ENHANCED_MISSION_TEMPLATES: Omit<EnhancedQuest, 'id' | 'status'>[] = [
  {
    title: 'Bando de Ladrões na Estrada',
    description: 'Um grupo de bandidos está atacando comerciantes na estrada principal.',
    type: 'narrative',
    difficulty: 'medio',
    levelRequirement: 2,
    timeLimit: 3,
    rewards: { gold: 80, xp: 120 },
    repeatable: false,
    location: 'Estrada do Norte',
    narrative: {
      intro: 'Você encontra um grupo de bandidos atacando uma caravana de comerciantes.',
      situation: 'Os bandidos parecem estar em vantagem numérica, mas você pode tentar diferentes abordagens...'
    },
    enhancedChoices: [
      {
        id: 'frontal-attack',
        text: 'Ataque Frontal',
        description: 'Confrontar os bandidos diretamente em combate',
        riskThreshold: 60,
        rollModifiers: {
          attribute: 'forca',
          multiplier: 3,
          bonus: 5
        },
        successEffects: [
          { type: 'gold', value: 120, description: 'Recompensa dos comerciantes' },
          { type: 'xp', value: 150, description: 'Experiência de combate' },
          { type: 'reputation', target: 'Comerciantes', value: 15 },
          { type: 'reputation', target: 'Guarda da Cidade', value: 10 },
          { type: 'reputation', target: 'Bandidos', value: -20 }
        ],
        failureEffects: [
          { type: 'gold', value: -30, description: 'Ferimentos custaram poções' },
          { type: 'reputation', target: 'Bandidos', value: -5 },
          { type: 'npc_relation', target: 'Mercador Aldric', value: 5, description: 'Tentativa valorizada' }
        ],
        requirements: {
          level: 2
        }
      },
      {
        id: 'negotiate',
        text: 'Negociar',
        description: 'Tentar negociar a libertação dos comerciantes',
        riskThreshold: 45,
        rollModifiers: {
          attribute: 'carisma',
          multiplier: 4,
          bonus: 0
        },
        successEffects: [
          { type: 'gold', value: -50, description: 'Pagamento aos bandidos' },
          { type: 'xp', value: 100, description: 'Experiência diplomática' },
          { type: 'reputation', target: 'Comerciantes', value: 20 },
          { type: 'reputation', target: 'Diplomatas', value: 15 },
          { type: 'reputation', target: 'Bandidos', value: 10 }
        ],
        failureEffects: [
          { type: 'world_event', target: 'bandit_ambush', probability: 0.3 },
          { type: 'reputation', target: 'Bandidos', value: -10 }
        ]
      },
      {
        id: 'stealth-rescue',
        text: 'Resgate Furtivo',
        description: 'Esperar a oportunidade e resgatar os comerciantes silenciosamente',
        riskThreshold: 55,
        rollModifiers: {
          attribute: 'destreza',
          multiplier: 3,
          bonus: 10
        },
        successEffects: [
          { type: 'gold', value: 100, description: 'Recompensa dos comerciantes' },
          { type: 'xp', value: 130, description: 'Experiência furtiva' },
          { type: 'reputation', target: 'Comerciantes', value: 25 },
          { type: 'item', target: 'pocao-media', description: 'Presente dos comerciantes' }
        ],
        failureEffects: [
          { type: 'spawn_enemy', target: 'bandit_patrol', probability: 0.4 },
          { type: 'reputation', target: 'Bandidos', value: -15 }
        ],
        requirements: {
          level: 3
        }
      },
      {
        id: 'ignore',
        text: 'Ignorar e Seguir',
        description: 'Não se envolver e continuar seu caminho',
        riskThreshold: 0, // Sempre sucesso
        successEffects: [
          { type: 'reputation', target: 'Comerciantes', value: -10 },
          { type: 'npc_relation', target: 'Mercador Aldric', value: -15 }
        ],
        failureEffects: []
      }
    ],
    storySeeds: {
      context: 'Conflito entre bandidos e comerciantes',
      tone: 'tense',
      previousDecisions: []
    }
  },
  {
    title: 'O Artefato Misterioso',
    description: 'Um artefato antigo foi descoberto, mas parece emanar energia sinistra.',
    type: 'narrative',
    difficulty: 'dificil',
    levelRequirement: 4,
    timeLimit: 3,
    rewards: { gold: 150, xp: 200 },
    repeatable: false,
    location: 'Ruínas Antigas',
    narrative: {
      intro: 'Nas profundezas de ruínas antigas, você encontra um orbe pulsante emanando energia mágica.',
      situation: 'O artefato sussurra em sua mente, prometendo poder, mas você sente uma presença maligna...'
    },
    enhancedChoices: [
      {
        id: 'take-artifact',
        text: 'Pegar o Artefato',
        description: 'Tocar e tentar controlar o poder do artefato',
        riskThreshold: 70,
        rollModifiers: {
          attribute: 'sabedoria',
          multiplier: 2,
          bonus: -10 // Penalidade pela natureza perigosa
        },
        successEffects: [
          { type: 'item', target: 'orbe-poder', description: 'Artefato poderoso' },
          { type: 'xp', value: 250, description: 'Conhecimento arcano' },
          { type: 'world_event', target: 'magical_awakening', probability: 0.2 }
        ],
        failureEffects: [
          { type: 'gold', value: -100, description: 'Maldição custou recursos' },
          { type: 'world_event', target: 'dark_corruption', probability: 0.5 },
          { type: 'npc_relation', target: 'Sábia Elara', value: -20, description: 'Desaprova escolhas perigosas' }
        ],
        requirements: {
          level: 4
        }
      },
      {
        id: 'study-carefully',
        text: 'Estudar com Cuidado',
        description: 'Examinar o artefato sem tocá-lo diretamente',
        riskThreshold: 40,
        rollModifiers: {
          attribute: 'inteligencia',
          multiplier: 3,
          bonus: 5
        },
        successEffects: [
          { type: 'xp', value: 180, description: 'Conhecimento seguro' },
          { type: 'gold', value: 80, description: 'Informações valiosas' },
          { type: 'npc_relation', target: 'Sábia Elara', value: 15 },
          { type: 'reputation', target: 'Diplomatas', value: 10 }
        ],
        failureEffects: [
          { type: 'xp', value: 50, description: 'Conhecimento limitado' }
        ]
      },
      {
        id: 'destroy-artifact',
        text: 'Destruir o Artefato',
        description: 'Tentar destruir o artefato para evitar que cause mal',
        riskThreshold: 65,
        rollModifiers: {
          attribute: 'forca',
          multiplier: 2,
          bonus: 0
        },
        successEffects: [
          { type: 'xp', value: 160, description: 'Ato heroico' },
          { type: 'reputation', target: 'Guarda da Cidade', value: 20 },
          { type: 'world_event', target: 'evil_prevented', probability: 0.8 }
        ],
        failureEffects: [
          { type: 'world_event', target: 'artifact_explosion', probability: 0.6 },
          { type: 'gold', value: -50, description: 'Danos colaterais' }
        ],
        requirements: {
          level: 3
        }
      },
      {
        id: 'leave-untouched',
        text: 'Deixar Intocado',
        description: 'Sair das ruínas sem mexer no artefato',
        riskThreshold: 0,
        successEffects: [
          { type: 'xp', value: 80, description: 'Sabedoria da cautela' },
          { type: 'reputation', target: 'Aventureiros', value: -5, description: 'Considerado cauteloso demais' }
        ],
        failureEffects: []
      }
    ],
    worldStateRequirements: {
      factionReputation: {
        'Aventureiros': 0 // Deve ter pelo menos reputação neutra
      }
    },
    storySeeds: {
      context: 'Descoberta de artefato mágico perigoso',
      tone: 'mysterious',
      previousDecisions: []
    }
  }
];

export class EnhancedMissionGenerator {
  private static instance: EnhancedMissionGenerator;

  static getInstance(): EnhancedMissionGenerator {
    if (!EnhancedMissionGenerator.instance) {
      EnhancedMissionGenerator.instance = new EnhancedMissionGenerator();
    }
    return EnhancedMissionGenerator.instance;
  }

  /**
   * Gera uma missão aprimorada baseada no nível do herói e estado do mundo
   */
  generateEnhancedMission(hero: Hero): EnhancedQuest {
    // Filtrar templates apropriados
    const availableTemplates = ENHANCED_MISSION_TEMPLATES.filter(template => {
      // Verificar nível
      if (template.levelRequirement > hero.progression.level) return false;
      
      // Verificar requisitos de WorldState
      if (template.worldStateRequirements) {
        if (!worldStateManager.checkWorldStateRequirements(hero, template.worldStateRequirements)) {
          return false;
        }
      }
      
      return true;
    });

    if (availableTemplates.length === 0) {
      return this.generateFallbackMission(hero);
    }

    // Selecionar template aleatório
    const template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    
    // Gerar story seeds baseado no estado atual
    const storySeeds = worldStateManager.generateStorySeeds(hero);
    
    // Criar missão
    const mission: EnhancedQuest = {
      ...template,
      id: `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'available',
      storySeeds: {
        ...template.storySeeds,
        previousDecisions: storySeeds.previousDecisions,
        tone: storySeeds.tone
      },
      staminaCost: this.calculateStaminaCost(template.difficulty)
    };

    // Garantir exatamente 3 caminhos (A, B, C)
    if (mission.enhancedChoices && mission.enhancedChoices.length > 3) {
      mission.enhancedChoices = mission.enhancedChoices.slice(0, 3);
    }

    return mission;
  }

  /**
   * Calcula o custo de stamina baseado na dificuldade
   */
  private calculateStaminaCost(difficulty: string): number {
    switch (difficulty) {
      case 'facil': return 20;
      case 'medio': return 35;
      case 'dificil': return 50;
      case 'epica': return 70;
      default: return 30;
    }
  }

  /**
   * Gera uma missão de fallback quando nenhum template está disponível
   */
  private generateFallbackMission(_hero: Hero): EnhancedQuest {
    return {
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'Tarefa Simples',
      description: 'Uma tarefa básica para ganhar experiência.',
      type: 'narrative',
      difficulty: 'facil',
      levelRequirement: 1,
      rewards: { gold: 30, xp: 50 },
      repeatable: true,
      status: 'available',
      enhancedChoices: [
        {
          id: 'accept',
          text: 'Aceitar',
          description: 'Aceitar a tarefa',
          riskThreshold: 30,
          successEffects: [
            { type: 'gold', value: 30 },
            { type: 'xp', value: 50 }
          ],
          failureEffects: [
            { type: 'gold', value: 15 },
            { type: 'xp', value: 25 }
          ]
        },
        {
          id: 'decline',
          text: 'Recusar',
          description: 'Recusar a tarefa',
          riskThreshold: 0,
          successEffects: [],
          failureEffects: []
        }
      ],
      storySeeds: {
        context: 'Tarefa básica',
        tone: 'neutral',
        previousDecisions: []
      },
      staminaCost: 20
    };
  }

  /**
   * Processa a escolha de uma missão aprimorada
   */
  processEnhancedChoice(
    hero: Hero,
    mission: EnhancedQuest,
    choiceId: string
  ): {
    success: boolean;
    results: any;
    narrative: string;
  } {
    const choice = mission.enhancedChoices?.find(c => c.id === choiceId);
    if (!choice) {
      throw new Error('Escolha não encontrada');
    }

    // Verificar stamina
    if (!worldStateManager.canAcceptQuest(hero, mission.staminaCost || 30)) {
      return {
        success: false,
        results: { error: 'Stamina insuficiente' },
        narrative: 'Você está muito cansado para aceitar esta missão. Descanse um pouco.'
      };
    }

    // Consumir stamina
    worldStateManager.consumeStamina(hero, mission.staminaCost || 30);

    // Processar escolha
    const result = worldStateManager.processChoice(
      hero,
      mission.id,
      choice.id,
      choice.text,
      choice.successEffects,
      choice.failureEffects,
      choice.riskThreshold,
      choice.rollModifiers
    );

    // Gerar narrativa do resultado
    const narrative = this.generateResultNarrative(choice, result.success, result.rollResult);

    return {
      success: result.success,
      results: result,
      narrative
    };
  }

  /**
   * Gera narrativa do resultado da escolha
   */
  private generateResultNarrative(choice: EnhancedQuestChoice, success: boolean, rollResult: any): string {
    const baseNarrative = success 
      ? `Sua escolha de "${choice.text}" foi bem-sucedida!`
      : `Sua tentativa de "${choice.text}" não saiu como esperado...`;

    const rollNarrative = `(Rolou ${rollResult.roll} + ${rollResult.modifiers} = ${rollResult.total} vs ${rollResult.threshold})`;

    const outcomeNarrative = success
      ? 'As consequências de sua ação se desenrolam favoravelmente.'
      : 'Você terá que lidar com as consequências imprevistas.';

    return `${baseNarrative}\n\n${rollNarrative}\n\n${outcomeNarrative}`;
  }
}

export const enhancedMissionGenerator = EnhancedMissionGenerator.getInstance();
