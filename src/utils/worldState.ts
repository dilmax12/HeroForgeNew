/**
 * Sistema de Estado de Mundo - WorldState
 * Gerencia decisões, consequências e persistência narrativa
 */

import { WorldState, DecisionLogEntry, QuestChoiceEffect, Hero, Attribute } from '../types/hero';
import { getGameSettings } from '../store/gameSettingsStore';

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
        guarda: { reputation: 0, alliances: ['clero', 'comerciantes'], enemies: ['ladroes', 'cultistas'], influence: 60 },
        ladroes: { reputation: 0, alliances: ['cultistas'], enemies: ['guarda', 'comerciantes'], influence: 30 },
        clero: { reputation: 0, alliances: ['guarda'], enemies: ['cultistas'], influence: 50 },
        cultistas: { reputation: 0, alliances: ['ladroes'], enemies: ['clero', 'guarda'], influence: 25 },
        comerciantes: { reputation: 0, alliances: ['guarda', 'exploradores'], enemies: ['ladroes'], influence: 45 },
        exploradores: { reputation: 0, alliances: ['comerciantes'], enemies: [], influence: 40 }
      },
      activeEvents: [],
      npcStatus: {
        'Capitão da Guarda': { alive: true, relationToPlayer: (Math.random() < 0.45 ? -5 - Math.floor(Math.random() * 10) : Math.floor(Math.random() * 6)), currentLocation: 'Quartel' },
        'Mercador Aldric': { alive: true, relationToPlayer: (Math.random() < 0.35 ? -5 - Math.floor(Math.random() * 10) : 5), currentLocation: 'Mercado' },
        'Sábia Elara': { alive: true, relationToPlayer: (Math.random() < 0.4 ? -5 - Math.floor(Math.random() * 10) : Math.floor(Math.random() * 4)), currentLocation: 'Biblioteca' },
        'Ferreiro Gorin': { alive: true, relationToPlayer: (Math.random() < 0.3 ? -5 - Math.floor(Math.random() * 10) : Math.floor(Math.random() * 4)), currentLocation: 'Forja' }
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
    let effectsToApply = success ? successEffects : failureEffects;
    try {
      const reputationTargets: Record<string, number> = {};
      effectsToApply.forEach(e => {
        if (e.type === 'reputation' && e.target) {
          reputationTargets[e.target] = (reputationTargets[e.target] || 0) + Math.abs(e.value || 0);
        }
      });
      const topTargets = Object.entries(reputationTargets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([t]) => t);
      effectsToApply = effectsToApply.filter(e => e.type !== 'reputation' || !e.target || topTargets.includes(e.target));
    } catch {}
    const appliedEffects: QuestChoiceEffect[] = [];

    // Aplicar efeitos
    const immediateImpact: any = {};
    const longTermImpact: any = {};

    const factionAlias: Record<string, string> = {
      'Comerciantes': 'Livre',
      'Guarda da Cidade': 'Ordem',
      'Bandidos': 'Sombra',
      'Diplomatas': 'Ordem',
      'Aventureiros': 'Livre'
    };

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
            const targetName = factionAlias[effect.target] || effect.target;
            if (!immediateImpact.reputation) immediateImpact.reputation = {};
            immediateImpact.reputation[targetName] = (effect.value || 0);
            
            // Atualizar WorldState
            if (hero.worldState?.factions[targetName]) {
              hero.worldState.factions[targetName].reputation += (effect.value || 0);
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
        case 'spawn_enemy':
          if (effect.target) {
            if (!longTermImpact.worldEvents) longTermImpact.worldEvents = [];
            longTermImpact.worldEvents.push(`spawn_enemy:${effect.target}`);
            if (hero.worldState) {
              hero.worldState.activeEvents.push(`spawn_enemy:${effect.target}`);
            }
          }
          break;
      }
    });

    // Evento aleatório de sorte
    if (Math.random() < 0.15) {
      if (!longTermImpact.worldEvents) longTermImpact.worldEvents = [];
      longTermImpact.worldEvents.push('luck_blessing');
      if (hero.worldState) {
        hero.worldState.activeEvents.push('luck_blessing');
      }
    }

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
      rollResult: { ...rollResult, threshold: riskThreshold },
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
      const alias: Record<string, string> = {
        'Aventureiros': 'Livre',
        'Comerciantes': 'Livre',
        'Guarda da Cidade': 'Ordem',
        'Bandidos': 'Sombra',
        'Diplomatas': 'Ordem'
      };
      for (const [faction, minRep] of Object.entries(requirements.factionReputation)) {
        const key = alias[faction] || faction;
        const currentRep = hero.worldState.factions[key]?.reputation || 0;
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
    const now = new Date();
    // Migração/defesa: alguns heróis antigos podem ter stamina como número simples
    if (!hero.stamina || typeof (hero.stamina as any) === 'number') {
      const currentValue = typeof (hero.stamina as any) === 'number' ? (hero.stamina as any as number) : 100;
      hero.stamina = {
        current: Math.max(0, Math.min(100, currentValue)),
        max: 100,
        lastRecovery: now.toISOString(),
        // Recuperação padrão: pontos por minuto
        recoveryRate: 5
      };
      return;
    }

    // Recuperação por minuto: recoveryRate = pontos/minuto
    const lastRecovery = new Date(hero.stamina.lastRecovery);
    const minutesElapsed = (now.getTime() - lastRecovery.getTime()) / (1000 * 60);

    if (minutesElapsed >= 1 && hero.stamina.current < hero.stamina.max) {
      const settings = getGameSettings();
      let ratePerMinute = (settings?.regenStaminaPerMin ?? hero.stamina.recoveryRate ?? 5);
      const statsAny = (hero.stats as any) || {};
      const restBuffUntil = statsAny.restBuffActiveUntil ? new Date(statsAny.restBuffActiveUntil).getTime() : 0;
      const inDungeon = Boolean(statsAny.inDungeon);
      if (restBuffUntil && Date.now() < restBuffUntil) ratePerMinute = Math.round(ratePerMinute * (settings?.restBuffStaminaMultiplier ?? 2));
      if (inDungeon) ratePerMinute = Math.max(1, Math.floor(ratePerMinute * (settings?.dungeonRegenMultiplier ?? 0.5)));
      const wholeMinutes = Math.min(5, Math.floor(minutesElapsed));
      const recoveryAmount = Math.max(ratePerMinute, wholeMinutes * ratePerMinute);
      hero.stamina.current = Math.min(hero.stamina.max, hero.stamina.current + recoveryAmount);
      // Atualiza lastRecovery para agora após aplicar a recuperação
      hero.stamina.lastRecovery = now.toISOString();
    }
  }

  /**
   * Regeneração automática de HP e Mana
   * Usa stats.lastActiveAt como referência de tempo para evitar alterar tipos.
   */
  updateVitals(hero: Hero): void {
    const now = new Date();
    // Garantir campos atuais
    if (!hero.derivedAttributes.currentHp) {
      hero.derivedAttributes.currentHp = hero.derivedAttributes.hp;
    }
    if (!hero.derivedAttributes.currentMp) {
      hero.derivedAttributes.currentMp = hero.derivedAttributes.mp;
    }

    // Basear no último timestamp de atividade
    const lastTs = hero.stats?.lastActiveAt ? new Date(hero.stats.lastActiveAt) : now;
    const minutesElapsed = (now.getTime() - lastTs.getTime()) / (1000 * 60);

    if (minutesElapsed >= 1) {
      const wholeMinutes = Math.min(5, Math.floor(minutesElapsed));
      const settings = getGameSettings();
      let hpPerMin = settings?.regenHpPerMin ?? 5;
      let mpPerMin = settings?.regenMpPerMin ?? 5;
      const statsAny = (hero.stats as any) || {};
      const restBuffUntil = statsAny.restBuffActiveUntil ? new Date(statsAny.restBuffActiveUntil).getTime() : 0;
      const inDungeon = Boolean(statsAny.inDungeon);
      const meditationUntil = statsAny.meditationBuffActiveUntil ? new Date(statsAny.meditationBuffActiveUntil).getTime() : 0;
      if (restBuffUntil && Date.now() < restBuffUntil) {
        hpPerMin = Math.round(hpPerMin * (settings?.restBuffHpMpMultiplier ?? 1.5));
        mpPerMin = Math.round(mpPerMin * (settings?.restBuffHpMpMultiplier ?? 1.5));
      }
      if (inDungeon) {
        hpPerMin = Math.max(1, Math.floor(hpPerMin * (settings?.dungeonRegenMultiplier ?? 0.5)));
        mpPerMin = Math.max(1, Math.floor(mpPerMin * (settings?.dungeonRegenMultiplier ?? 0.5)));
      }
      if (meditationUntil && Date.now() < meditationUntil) {
        mpPerMin = mpPerMin + (settings?.meditationMpBonusPerMin ?? 8);
      }
      const hpRegenAmount = Math.max(hpPerMin, wholeMinutes * hpPerMin);
      const mpRegenAmount = Math.max(mpPerMin, wholeMinutes * mpPerMin);

      // HP regen
      if (hero.derivedAttributes.currentHp < hero.derivedAttributes.hp) {
        hero.derivedAttributes.currentHp = Math.min(
          hero.derivedAttributes.hp,
          (hero.derivedAttributes.currentHp || 0) + hpRegenAmount
        );
      }

      // Mana regen
      if (hero.derivedAttributes.currentMp < hero.derivedAttributes.mp) {
        hero.derivedAttributes.currentMp = Math.min(
          hero.derivedAttributes.mp,
          (hero.derivedAttributes.currentMp || 0) + mpRegenAmount
        );
      }

      // Atualizar referência de tempo para próxima contagem
      if (hero.stats) {
        hero.stats.lastActiveAt = now.toISOString() as any;
      }
    }
  }

  canAcceptQuest(hero: Hero, staminaCost: number): boolean {
    this.updateStamina(hero);
    const effective = this.computeEffectiveStaminaCost(hero, staminaCost);
    return (hero.stamina?.current || 100) >= effective;
  }

  consumeStamina(hero: Hero, amount: number): boolean {
    if (!this.canAcceptQuest(hero, amount)) {
      return false;
    }

    if (hero.stamina) {
      const effective = this.computeEffectiveStaminaCost(hero, amount);
      hero.stamina.current -= effective;
    }
    return true;
  }
 
  getMountStaminaReduction(hero: Hero): number {
    try {
      const m = (hero.mounts || []).find(mm => mm.id === hero.activeMountId);
      if (!m) return 0;
      const base = Math.max(0, m.speedBonus || 0);
      const buff = (() => {
        const mb = hero.mountBuff;
        if (!mb?.speedBonus) return 0;
        if (mb.expiresAt && Date.now() > new Date(mb.expiresAt).getTime()) return 0;
        return Math.max(0, mb.speedBonus || 0);
      })();
      const refine = Math.max(0, m.refineLevel || 0);
      const mastery = Math.max(0, m.mastery || 0);
      const masteryStep = Math.floor(mastery / 10); // cada 10 níveis de maestria
      const reduction = (base + buff) * 0.01 + refine * 0.005 + masteryStep * 0.02;
      return Math.max(0, Math.min(0.4, reduction));
    } catch {
      return 0;
    }
  }

  computeEffectiveStaminaCost(hero: Hero, baseCost: number): number {
    const red = this.getMountStaminaReduction(hero);
    const eff = Math.round(baseCost * (1 - red));
    return Math.max(1, eff);
  }
}

export const worldStateManager = WorldStateManager.getInstance();
