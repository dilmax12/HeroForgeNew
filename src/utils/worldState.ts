/**
 * Sistema de Estado de Mundo - WorldState
 * Gerencia decisões, consequências e persistência narrativa
 */

import { WorldState, DecisionLogEntry, QuestChoiceEffect, Hero, Attribute } from '../types/hero';

export class WorldStateManager {
  private static instance: WorldStateManager;

  static getInstance(): WorldStateManager {
    if (!WorldStateManager.instance) {
      WorldStateManager.instance = new WorldStateManager();
    }
    return WorldStateManager.instance;
  }

  /**
   * Inicializa um WorldState vazio para um novo herói
   */
  initializeWorldState(): WorldState {
    return {
      factions: {
        'Guarda da Cidade': { reputation: 0, alliances: [], enemies: [], influence: 50 },
        'Comerciantes': { reputation: 0, alliances: [], enemies: [], influence: 30 },
        'Ladrões': { reputation: 0, alliances: [], enemies: ['Guarda da Cidade'], influence: 20 },
        'Bandidos': { reputation: -10, alliances: [], enemies: ['Guarda da Cidade', 'Comerciantes'], influence: 15 },
        'Diplomatas': { reputation: 0, alliances: [], enemies: [], influence: 25 },
        'Aventureiros': { reputation: 10, alliances: [], enemies: [], influence: 40 }
      },
      activeEvents: [],
      npcStatus: {
        'Capitão da Guarda': { alive: true, relationToPlayer: 0, currentLocation: 'Quartel' },
        'Mercador Aldric': { alive: true, relationToPlayer: 5, currentLocation: 'Mercado' },
        'Sábia Elara': { alive: true, relationToPlayer: 0, currentLocation: 'Biblioteca' },
        'Ferreiro Gorin': { alive: true, relationToPlayer: 0, currentLocation: 'Forja' }
      },
      decisionLog: [],
      worldEvents: [],
      locations: {
        'Vila do Vale': { discovered: true, reputation: 0, questsCompleted: 0 },
        'Bosque Sombrio': { discovered: false, reputation: 0, questsCompleted: 0 },
        'Montanhas Geladas': { discovered: false, reputation: 0, questsCompleted: 0 }
      }
    };
  }

  /**
   * Executa um roll de dados com modificadores
   */
  executeRoll(hero: Hero, rollModifiers?: {
    attribute?: Attribute;
    multiplier?: number;
    bonus?: number;
  }): { roll: number; modifiers: number; total: number } {
    const baseRoll = Math.floor(Math.random() * 100) + 1;
    let modifiers = 0;

    if (rollModifiers) {
      // Modificador por atributo
      if (rollModifiers.attribute) {
        const attributeValue = hero.attributes[rollModifiers.attribute];
        modifiers += attributeValue * (rollModifiers.multiplier || 2);
      }

      // Bônus fixo
      if (rollModifiers.bonus) {
        modifiers += rollModifiers.bonus;
      }

      // Modificador por sorte (se existir)
      const luck = (hero as any).luck || 0;
      modifiers += luck;
    }

    return {
      roll: baseRoll,
      modifiers,
      total: baseRoll + modifiers
    };
  }

  /**
   * Processa uma escolha de quest e suas consequências
   */
  processChoice(
    hero: Hero,
    questId: string,
    choiceId: string,
    choiceText: string,
    successEffects: QuestChoiceEffect[],
    failureEffects: QuestChoiceEffect[] = [],
    riskThreshold: number = 50,
    rollModifiers?: any
  ): {
    success: boolean;
    rollResult: any;
    appliedEffects: QuestChoiceEffect[];
    logEntry: DecisionLogEntry;
  } {
    // Executar roll
    const rollResult = this.executeRoll(hero, rollModifiers);
    const success = rollResult.total >= riskThreshold;
    
    // Determinar efeitos a aplicar
    const effectsToApply = success ? successEffects : failureEffects;
    const appliedEffects: QuestChoiceEffect[] = [];

    // Aplicar efeitos
    const immediateImpact: any = {};
    const longTermImpact: any = {};

    effectsToApply.forEach(effect => {
      // Verificar probabilidade
      if (effect.probability && Math.random() > effect.probability) {
        return;
      }

      appliedEffects.push(effect);

      switch (effect.type) {
        case 'gold':
          immediateImpact.gold = (immediateImpact.gold || 0) + (effect.value || 0);
          break;
        case 'xp':
          immediateImpact.xp = (immediateImpact.xp || 0) + (effect.value || 0);
          break;
        case 'reputation':
          if (effect.target) {
            if (!immediateImpact.reputation) immediateImpact.reputation = {};
            immediateImpact.reputation[effect.target] = (effect.value || 0);
            
            // Atualizar WorldState
            if (hero.worldState?.factions[effect.target]) {
              hero.worldState.factions[effect.target].reputation += (effect.value || 0);
            }
          }
          break;
        case 'item':
          if (effect.target) {
            if (!immediateImpact.items) immediateImpact.items = [];
            immediateImpact.items.push(effect.target);
          }
          break;
        case 'npc_relation':
          if (effect.target && hero.worldState?.npcStatus[effect.target]) {
            hero.worldState.npcStatus[effect.target].relationToPlayer += (effect.value || 0);
            if (!longTermImpact.npcRelations) longTermImpact.npcRelations = {};
            longTermImpact.npcRelations[effect.target] = effect.value || 0;
          }
          break;
        case 'world_event':
          if (effect.target) {
            if (!longTermImpact.worldEvents) longTermImpact.worldEvents = [];
            longTermImpact.worldEvents.push(effect.target);
          }
          break;
      }
    });

    // Criar entrada no log de decisões
    const logEntry: DecisionLogEntry = {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      heroId: hero.id,
      questId,
      choiceId,
      choiceText,
      timestamp: new Date().toISOString(),
      impact: {
        immediate: immediateImpact,
        longTerm: longTermImpact
      },
      rollResult: {
        roll: rollResult.roll,
        modifiers: rollResult.modifiers,
        threshold: riskThreshold,
        success
      }
    };

    // Adicionar ao log do WorldState
    if (hero.worldState) {
      hero.worldState.decisionLog.push(logEntry);
    }

    return {
      success,
      rollResult,
      appliedEffects,
      logEntry
    };
  }

  /**
   * Verifica se um herói atende aos requisitos de WorldState para uma quest
   */
  checkWorldStateRequirements(hero: Hero, requirements: any): boolean {
    if (!hero.worldState || !requirements) return true;

    // Verificar reputação com facções
    if (requirements.factionReputation) {
      for (const [faction, minRep] of Object.entries(requirements.factionReputation)) {
        const currentRep = hero.worldState.factions[faction]?.reputation || 0;
        if (currentRep < (minRep as number)) {
          return false;
        }
      }
    }

    // Verificar status de NPCs
    if (requirements.npcStatus) {
      for (const [npc, mustBeAlive] of Object.entries(requirements.npcStatus)) {
        const npcData = hero.worldState.npcStatus[npc];
        if (!npcData || npcData.alive !== mustBeAlive) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Gera story seeds baseado no estado atual do mundo
   */
  generateStorySeeds(hero: Hero): {
    context: string;
    tone: string;
    previousDecisions: string[];
  } {
    const worldState = hero.worldState;
    if (!worldState) {
      return {
        context: `Herói ${hero.name}, classe ${hero.class}, nível ${hero.progression.level}`,
        tone: 'heroic',
        previousDecisions: []
      };
    }

    // Analisar reputação para determinar tom
    const avgReputation = Object.values(worldState.factions)
      .reduce((sum, faction) => sum + faction.reputation, 0) / Object.keys(worldState.factions).length;
    
    let tone = 'neutral';
    if (avgReputation > 20) tone = 'heroic';
    else if (avgReputation < -20) tone = 'dark';
    else if (avgReputation > 0) tone = 'hopeful';
    else tone = 'melancholic';

    // Coletar decisões recentes
    const recentDecisions = worldState.decisionLog
      .slice(-5)
      .map(entry => entry.choiceText);

    // Construir contexto
    const factionSummary = Object.entries(worldState.factions)
      .filter(([_, data]) => Math.abs(data.reputation) > 10)
      .map(([name, data]) => `${name}: ${data.reputation > 0 ? 'aliado' : 'inimigo'}`)
      .join(', ');

    const context = `Herói ${hero.name}, ${hero.class} nível ${hero.progression.level}. ` +
      `Reputação: ${factionSummary || 'neutro'}. ` +
      `Decisões recentes afetaram o mundo.`;

    return {
      context,
      tone,
      previousDecisions: recentDecisions
    };
  }

  /**
   * Atualiza stamina do herói
   */
  updateStamina(hero: Hero): void {
    if (!hero.stamina) {
      hero.stamina = {
        current: 100,
        max: 100,
        lastRecovery: new Date().toISOString(),
        recoveryRate: 10
      };
      return;
    }

    const now = new Date();
    const lastRecovery = new Date(hero.stamina.lastRecovery);
    const hoursElapsed = (now.getTime() - lastRecovery.getTime()) / (1000 * 60 * 60);
    
    if (hoursElapsed >= 1) {
      const recoveryAmount = Math.floor(hoursElapsed) * hero.stamina.recoveryRate;
      hero.stamina.current = Math.min(hero.stamina.max, hero.stamina.current + recoveryAmount);
      hero.stamina.lastRecovery = now.toISOString();
    }
  }

  /**
   * Verifica se o herói tem stamina suficiente para uma missão
   */
  canAcceptQuest(hero: Hero, staminaCost: number): boolean {
    this.updateStamina(hero);
    return (hero.stamina?.current || 100) >= staminaCost;
  }

  /**
   * Consome stamina para uma missão
   */
  consumeStamina(hero: Hero, amount: number): boolean {
    if (!this.canAcceptQuest(hero, amount)) {
      return false;
    }

    if (hero.stamina) {
      hero.stamina.current -= amount;
    }
    return true;
  }
}

export const worldStateManager = WorldStateManager.getInstance();