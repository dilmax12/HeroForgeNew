/**
 * Sistema de Combate - RNG + Atributos
 */

import { Hero, CombatResult, QuestEnemy, Item, Skill, Element } from '../types/hero';
import { SHOP_ITEMS } from './shop';
import { getWeeklyMutatorEnemyElement, getGlobalCritBonus, getEnemyDamageMultiplier } from './replayModifiers';
import { dungeonConfig } from './dungeonConfig';
import { getElementMultiplier, generateRandomElement, computeElementMultiplier, calculateElementalAffinity } from './elementSystem';

// === TIPOS DE COMBATE ===

interface CombatEntity {
  name: string;
  hp: number;
  maxHp: number;
  forca: number;
  destreza: number;
  constituicao: number;
  inteligencia: number;
  sabedoria: number;
  carisma: number;
  armor: number;
  weapon?: {
    name: string;
    atk: number;
    critChance?: number;
  };
}

interface AttackResult {
  hit: boolean;
  damage: number;
  crit: boolean;
  message: string;
}

// === DADOS DOS INIMIGOS ===

const ENEMY_TEMPLATES: Record<string, Partial<CombatEntity>> = {
  'Lobo': {
    hp: 25,
    forca: 6,
    destreza: 8,
    constituicao: 5,
    inteligencia: 2,
    sabedoria: 6,
    carisma: 3,
    armor: 1,
    weapon: { name: 'Presas', atk: 4, critChance: 0.1 }
  },
  'Goblin': {
    hp: 20,
    forca: 4,
    destreza: 9,
    constituicao: 4,
    inteligencia: 5,
    sabedoria: 4,
    carisma: 2,
    armor: 2,
    weapon: { name: 'Adaga Enferrujada', atk: 3, critChance: 0.15 }
  },
  'Bandido': {
    hp: 35,
    forca: 7,
    destreza: 6,
    constituicao: 6,
    inteligencia: 4,
    sabedoria: 5,
    carisma: 4,
    armor: 3,
    weapon: { name: 'Espada Curta', atk: 5, critChance: 0.08 }
  },
  'Esqueleto': {
    hp: 30,
    forca: 5,
    destreza: 7,
    constituicao: 8,
    inteligencia: 3,
    sabedoria: 4,
    carisma: 1,
    armor: 2,
    weapon: { name: 'Espada Antiga', atk: 4, critChance: 0.05 }
  },
  'Troll': {
    hp: 80,
    forca: 12,
    destreza: 3,
    constituicao: 10,
    inteligencia: 2,
    sabedoria: 3,
    carisma: 2,
    armor: 4,
    weapon: { name: 'Clava Gigante', atk: 8, critChance: 0.12 }
  },
  'Guardião de Pedra': {
    hp: 120,
    forca: 14,
    destreza: 2,
    constituicao: 16,
    inteligencia: 3,
    sabedoria: 5,
    carisma: 1,
    armor: 8,
    weapon: { name: 'Punhos Monolíticos', atk: 10, critChance: 0.08 }
  },
  'Rei Goblin': {
    hp: 95,
    forca: 10,
    destreza: 12,
    constituicao: 10,
    inteligencia: 6,
    sabedoria: 4,
    carisma: 6,
    armor: 5,
    weapon: { name: 'Lâmina Real Goblin', atk: 9, critChance: 0.18 }
  },
  'Feiticeiro das Sombras': {
    hp: 90,
    forca: 6,
    destreza: 7,
    constituicao: 9,
    inteligencia: 14,
    sabedoria: 10,
    carisma: 5,
    armor: 3,
    weapon: { name: 'Cajado Obscuro', atk: 11, critChance: 0.15 }
  },
  'Titã de Gelo': {
    hp: 130,
    forca: 13,
    destreza: 4,
    constituicao: 18,
    inteligencia: 4,
    sabedoria: 6,
    carisma: 2,
    armor: 7,
    weapon: { name: 'Martelo Glacial', atk: 12, critChance: 0.12 }
  },
  'Draco Etéreo': {
    hp: 140,
    forca: 15,
    destreza: 8,
    constituicao: 14,
    inteligencia: 8,
    sabedoria: 6,
    carisma: 8,
    armor: 6,
    weapon: { name: 'Garras Etéreas', atk: 13, critChance: 0.2 }
  },
  'Arauto Ígneo': {
    hp: 125,
    forca: 14,
    destreza: 6,
    constituicao: 12,
    inteligencia: 10,
    sabedoria: 5,
    carisma: 4,
    armor: 5,
    weapon: { name: 'Lança Flamejante', atk: 12, critChance: 0.16 }
  }
};

// === LOOT TABLES ===

const LOOT_TABLES: Record<string, { items: Item[], dropRates: number[] }> = {
  'Lobo': {
    items: [
      { id: 'pele-lobo', name: 'Pele de Lobo', description: 'Material para crafting', type: 'consumable', rarity: 'comum', price: 15 },
      { id: 'pocao-pequena', name: 'Poção de Cura Pequena', description: 'Restaura 20 HP', type: 'consumable', rarity: 'comum', price: 25, effects: { hp: 20 } }
    ],
    dropRates: [0.6, 0.3] // 60% pele, 30% poção
  },
  'Goblin': {
    items: [
      { id: 'moeda-goblin', name: 'Moeda Goblin', description: 'Moeda de valor duvidoso', type: 'consumable', rarity: 'comum', price: 10 },
      { id: 'adaga-ferro', name: 'Adaga de Ferro', description: '+2 Força', type: 'weapon', rarity: 'comum', price: 50, bonus: { forca: 2 } }
    ],
    dropRates: [0.7, 0.2]
  },
  'Bandido': {
    items: [
      { id: 'espada-ferro', name: 'Espada de Ferro', description: '+3 Força', type: 'weapon', rarity: 'raro', price: 100, bonus: { forca: 3 } },
      { id: 'armadura-couro', name: 'Armadura de Couro', description: '+2 Constituição', type: 'armor', rarity: 'comum', price: 75, bonus: { constituicao: 2 } }
    ],
    dropRates: [0.25, 0.4]
  },
  'Esqueleto': {
    items: [
      { id: 'osso-antigo', name: 'Osso Antigo', description: 'Material mágico', type: 'consumable', rarity: 'raro', price: 30 },
      { id: 'pergaminho-xp', name: 'Pergaminho de Experiência', description: '+50 XP', type: 'consumable', rarity: 'raro', price: 80, effects: { duration: 0 } }
    ],
    dropRates: [0.5, 0.2]
  },
  'Guardião de Pedra': {
    items: [
      { id: 'armadura-pedra-rachada', name: 'Armadura de Pedra Rachada', description: '+6 Constituição', type: 'armor', rarity: 'epico', price: 640, bonus: { constituicao: 6 } }
    ],
    dropRates: [0.3]
  },
  'Rei Goblin': {
    items: [
      { id: 'adaga-ferro', name: 'Adaga de Ferro', description: '+2 Força', type: 'weapon', rarity: 'comum', price: 50, bonus: { forca: 2 } },
      { id: 'anel-precisao', name: 'Anel da Precisão', description: '+2 Destreza, +1 Inteligência', type: 'accessory', rarity: 'epico', price: 280, bonus: { destreza: 2, inteligencia: 1 } }
    ],
    dropRates: [0.35, 0.15]
  },
  'Feiticeiro das Sombras': {
    items: [
      { id: 'cajado-arcano', name: 'Cajado Arcano', description: '+4 Inteligência', type: 'weapon', rarity: 'epico', price: 420, bonus: { inteligencia: 4 } }
    ],
    dropRates: [0.25]
  },
  'Titã de Gelo': {
    items: [
      { id: 'cajado-cristal', name: 'Cajado de Cristal', description: '+3 Inteligência, +1 Sabedoria', type: 'weapon', rarity: 'raro', price: 260, bonus: { inteligencia: 3, sabedoria: 1 } }
    ],
    dropRates: [0.3]
  },
  'Draco Etéreo': {
    items: [
      { id: 'asas-lendarias', name: 'Asas Lendárias', description: '+4 Destreza, +2 Inteligência, +1 Sabedoria', type: 'armor', rarity: 'lendario', price: 900, bonus: { destreza: 4, inteligencia: 2, sabedoria: 1 }, slot: 'cape' }
    ],
    dropRates: [0.08]
  },
  'Arauto Ígneo': {
    items: [
      { id: 'espada-flamejante', name: 'Espada Flamejante', description: 'Chance temática de causar dano de fogo.', type: 'weapon', rarity: 'raro', price: 280, bonus: { forca: 5 } }
    ],
    dropRates: [0.25]
  }
};

// === FUNÇÕES DE COMBATE ===

function createEnemyFromTemplate(enemyType: string, level: number = 1): CombatEntity {
  const template = ENEMY_TEMPLATES[enemyType];
  if (!template) {
    throw new Error(`Tipo de inimigo desconhecido: ${enemyType}`);
  }

  const levelMultiplier = 1 + (level - 1) * 0.3;
  
  return {
    name: enemyType,
    hp: Math.floor((template.hp || 20) * levelMultiplier),
    maxHp: Math.floor((template.hp || 20) * levelMultiplier),
    forca: Math.floor((template.forca || 5) * levelMultiplier),
    destreza: Math.floor((template.destreza || 5) * levelMultiplier),
    constituicao: Math.floor((template.constituicao || 5) * levelMultiplier),
    inteligencia: template.inteligencia || 3,
    sabedoria: template.sabedoria || 3,
    carisma: template.carisma || 3,
    armor: Math.floor((template.armor || 0) * levelMultiplier),
    weapon: template.weapon
  };
}

function heroToCombatEntity(hero: Hero): CombatEntity {
  const currentHp = hero.derivedAttributes.currentHp || hero.derivedAttributes.hp;
  
  return {
    name: hero.name,
    hp: currentHp,
    maxHp: hero.derivedAttributes.hp,
    forca: hero.attributes.forca,
    destreza: hero.attributes.destreza,
    constituicao: hero.attributes.constituicao,
    inteligencia: hero.attributes.inteligencia,
    sabedoria: hero.attributes.sabedoria,
    carisma: hero.attributes.carisma,
    armor: hero.derivedAttributes.armorClass,
    weapon: { name: 'Arma Básica', atk: 2, critChance: 0.05 },
    
  };
}

export function resolveAttack(attacker: CombatEntity, defender: CombatEntity, opts?: { ramp?: number; attackElement?: Element; defendElement?: Element; skillBonus?: number; atkAffinity?: number; defResistance?: number; isEnemyAttack?: boolean }): AttackResult {
  // Calcular chance de acerto baseada em destreza
  let baseHit = 50 + (attacker.destreza - defender.destreza) * 3;
  if ((opts?.attackElement || 'physical') === 'thunder') baseHit += 5;
  let hitChance = Math.max(5, Math.min(95, baseHit));
  
  
  const roll = Math.floor(Math.random() * 100) + 1;
  
  if (roll <= hitChance) {
    // Acertou! Calcular dano
    const weaponAtk = attacker.weapon?.atk || 0;
    let baseDamage = attacker.forca + weaponAtk + (opts?.skillBonus || 0);
    
    // Verificar crítico
    let critChance = attacker.weapon?.critChance || 0.05;
    critChance = Math.min(0.95, critChance + getGlobalCritBonus());
    if ((opts?.attackElement || 'physical') === 'air') critChance = Math.min(0.95, critChance + 0.10);
    
    const isCrit = Math.random() < critChance;
    
    // Multiplicadores: crítico, ramp de dano e elemento
    const ramp = opts?.ramp || 1;
    const elemMult = computeElementMultiplier(
      opts?.attackElement || 'physical',
      opts?.defendElement || 'physical',
      opts?.atkAffinity || 0,
      opts?.defResistance || 0
    );
    const effectiveArmor = Math.floor((defender.armor || 0) * (((opts?.defendElement || 'physical') === 'earth') ? 1.20 : 1.0));
    const enemyMult = opts?.isEnemyAttack ? getEnemyDamageMultiplier() : 1;
    const finalDamage = Math.max(1, Math.floor(
      baseDamage * (isCrit ? 1.5 : 1) * ramp * elemMult * enemyMult - effectiveArmor
    ));
    
    const weaponName = attacker.weapon?.name || 'punhos';
    const critText = isCrit ? ' CRÍTICO!' : '';
    const elemText = elemMult > 1 ? ' (super efetivo!)' : (elemMult < 1 ? ' (pouco efetivo)' : '');
    
  return {
    hit: true,
    damage: finalDamage,
    crit: isCrit,
    message: `${attacker.name} ataca com ${weaponName} e causa ${finalDamage} de dano${critText}${elemText}`
  };
  } else {
    return {
      hit: false,
      damage: 0,
      crit: false,
      message: `${attacker.name} erra o ataque!`
    };
  }
}

function generateLoot(enemyType: string): Item[] {
  const lootTable = LOOT_TABLES[enemyType];
  if (!lootTable) return [];
  
  const loot: Item[] = [];
  
  lootTable.items.forEach((item, index) => {
    const dropRate = lootTable.dropRates[index] || 0;
    if (Math.random() < dropRate) {
      loot.push(item);
    }
  });
  const extra: { id: string; chance: number }[] = [
    { id: 'pedra-alma', chance: 0.05 },
    { id: 'essencia-calor', chance: 0.02 },
    { id: 'brasas-magicas', chance: 0.01 }
  ];
  if (enemyType === 'Troll') {
    extra.push({ id: 'essencia-bestial', chance: 0.03 });
    extra.push({ id: 'pergaminho-montaria', chance: 0.02 });
  }
  extra.forEach(({ id, chance }) => {
    if (Math.random() < chance) {
      const it = SHOP_ITEMS.find(i => i.id === id);
      if (it) loot.push(it);
    }
  });
  
  return loot;
}

function calculateXpReward(enemy: CombatEntity, heroLevel: number): number {
  const baseXp = enemy.maxHp + enemy.forca + enemy.destreza;
  const levelDiff = Math.max(1, enemy.maxHp / 20) - heroLevel; // Estimar nível do inimigo
  
  // Mais XP para inimigos de nível similar ou superior
  const multiplier = levelDiff >= 0 ? 1 + (levelDiff * 0.2) : Math.max(0.5, 1 + (levelDiff * 0.1));
  
  return Math.floor(baseXp * multiplier);
}

function calculateGoldReward(enemy: CombatEntity): number {
  return Math.floor((enemy.maxHp + enemy.forca) * 0.8) + Math.floor(Math.random() * 10);
}

// === SISTEMA DE HABILIDADES ===

export interface SkillUseResult {
  damage: number;
  elementMultiplier: number;
  healing?: number;
  effects?: string[];
  success: boolean;
  message: string;
}

/**
 * Resolve o uso de uma habilidade em combate
 */
export function resolveSkillUse(user: Hero, target: Hero | CombatEntity, skill: Skill): SkillUseResult {
  const targetElement = (target as Hero).element || 'physical';
  console.debug('[combat] resolveSkillUse:start', {
    user: user?.name,
    target: (target as any)?.name || 'enemy',
    skill: skill?.name,
    effects: skill?.effects
  });
  
  // Calcular poder base da habilidade
  let basePower = skill.basePower || 0;
  
  // Modificadores baseados em atributos
  switch (skill.type) {
    case 'attack':
      basePower += user.attributes.forca * 0.5;
      break;
    case 'support':
      basePower += user.attributes.inteligencia * 0.3;
      break;
    case 'buff':
      basePower += user.attributes.destreza * 0.2;
      break;
  }
  console.debug('[combat] basePower', basePower);
  
  // Calcular multiplicador elemental
  const elementMultiplier = computeElementMultiplier(
    skill.element || 'physical',
    targetElement,
    calculateElementalAffinity(user.element, skill.element),
    0
  );
  console.debug('[combat] elementMultiplier', elementMultiplier);
  
  // Calcular dano final
  let finalDamage = 0;
  let healing = 0;
  const effects: string[] = [];
  
  if (skill.type === 'attack') {
    const targetDefense = (target as any).constituicao || target.constituicao || 0;
    let dmg = Math.max(0, Math.floor(basePower * elementMultiplier) - (targetDefense * 0.3));
    if ((user.element || 'physical') === 'light' && (skill.element || 'physical') === 'light') {
      dmg = Math.floor(dmg * 1.05);
    }
    finalDamage = dmg;
    console.debug('[combat] attack calc', { targetDefense, finalDamage });
  } else if (skill.type === 'support' && skill.name.includes('Cura')) {
    let healVal = Math.floor(basePower);
    if ((user.element || 'physical') === 'water') healVal = Math.floor(healVal * 1.10);
    if ((user.element || 'physical') === 'light') healVal = Math.floor(healVal * 1.05);
    healing = healVal;
    console.debug('[combat] healing calc', { healing });
  }
  
  // Adicionar efeitos especiais baseados na habilidade
  if (skill.effects) {
    const e = skill.effects;
    const effectTexts: string[] = [];
    if (e.special) effectTexts.push(e.special);
    if (typeof e.heal === 'number' && e.heal > 0) effectTexts.push(`cura ${e.heal}`);
    if (e.buff?.attribute) effectTexts.push(`buff ${String(e.buff.attribute)}`);
    if (e.debuff?.attribute) effectTexts.push(`debuff ${String(e.debuff.attribute)}`);
    effects.push(...effectTexts);
    console.debug('[combat] effects parsed', effectTexts);

    // Ajustes funcionais principais
    if (e.special === 'double_strike' && finalDamage > 0) {
      finalDamage = Math.floor(finalDamage * 2);
    }
    if (e.special === 'lifesteal_small' && finalDamage > 0) {
      let ls = Math.floor(finalDamage * 0.2);
      if ((user.element || 'physical') === 'water') ls = Math.floor(ls * 1.10);
      if ((user.element || 'physical') === 'light') ls = Math.floor(ls * 1.05);
      healing += ls;
    }
    if (e.special === 'heal_over_time') {
      healing += e.heal ? e.heal : Math.floor(basePower * 0.5);
    }
  }
  
  // Determinar sucesso (pode falhar em casos específicos)
  const successRate = 0.9; // 90% de chance base
  const success = Math.random() < successRate;
  console.debug('[combat] success roll', { success });
  
  // Gerar mensagem
  let message = `${user.name} usa ${skill.name}!`;
  if (!success) {
    message += ' Mas falhou!';
    return {
      damage: 0,
      elementMultiplier: 1,
      effects: [],
      success: false,
      message
    };
  }
  
  if (finalDamage > 0) {
    message += ` Causa ${finalDamage} de dano`;
    if (elementMultiplier > 1) {
      message += ' (super efetivo!)';
    } else if (elementMultiplier < 1) {
      message += ' (pouco efetivo)';
    }
  }
  
  if (healing > 0) {
    message += ` Cura ${healing} HP`;
  }
  
  if (effects.length > 0) {
    message += ` (${effects.join(', ')})`;
  }
  
  return {
    damage: finalDamage,
    elementMultiplier,
    healing,
    effects,
    success: true,
    message
  };
}

// === FUNÇÃO PRINCIPAL DE COMBATE ===

export function resolveCombat(hero: Hero, enemies: QuestEnemy[], opts: { floor?: number; partyBonusPercent?: number } = {}): CombatResult {
  const combatLog: string[] = [];
  let totalXp = 0;
  let totalGold = 0;
  let allLoot: Item[] = [];
  
  const heroEntity = heroToCombatEntity(hero);
  combatLog.push(`${heroEntity.name} entra em combate!`);

  const heroElement: Element = hero.element || 'physical';
  const activePet = (hero.pets || []).find(p => p.id === (hero as any).activePetId);
  let petEnergy = activePet?.energy ?? 0;
  let petEnergyUsed = 0;
  let petCooldownLeft = 0;
  let petDamageTotal = 0;
  let petHealingTotal = 0;
  let petStunCount = 0;
  let heroElementOverride: Element | null = null;
  let heroElementOverrideTurns = 0;
  const petElementSet = new Set<Element>();
  
  // Processar cada inimigo
  for (const questEnemy of enemies) {
    for (let i = 0; i < questEnemy.count; i++) {
      const enemy = createEnemyFromTemplate(questEnemy.type, questEnemy.level || 1);
      let enemyElement: Element = (getWeeklyMutatorEnemyElement() as Element) || generateRandomElement();
      if (enemy.name === 'Guardião de Pedra') enemyElement = 'earth';
      if (enemy.name === 'Rei Goblin') enemyElement = 'air';
      if (enemy.name === 'Feiticeiro das Sombras') enemyElement = 'dark';
      if (enemy.name === 'Titã de Gelo') enemyElement = 'ice';
      if (enemy.name === 'Draco Etéreo') enemyElement = 'thunder';
      if (enemy.name === 'Arauto Ígneo') enemyElement = 'fire';
      combatLog.push(`\n--- Enfrentando ${enemy.name} ---`);
      combatLog.push(`Elemento do inimigo: ${enemyElement}`);
      let enemyBurn = 0;
      let heroBurn = 0;
      
      // Combate por turnos
      let turn = 1;
      let enemyFled = false;
      const maxTurns = 20; // aumentar teto de turnos
      while (heroEntity.hp > 0 && enemy.hp > 0 && turn <= maxTurns) {
        // Determinar quem ataca primeiro (baseado em destreza, Raio +1)
        const heroFirst = (heroEntity.destreza + (heroElement === 'thunder' ? 1 : 0)) >= (enemy.destreza + (enemyElement === 'thunder' ? 1 : 0));
        const ramp = 1 + Math.min(0.10 + turn * 0.06, 2.0);
        if (enemy.name === 'Guardião de Pedra') enemy.armor = Math.floor(enemy.armor * 1.2);
        if (enemy.name === 'Rei Goblin') enemy.destreza = Math.floor(enemy.destreza * 1.15);
        if (enemy.name === 'Feiticeiro das Sombras' && turn % 3 === 0 && enemy.hp > 0) {
          const siphon = Math.floor(3 + Math.random() * 6);
          heroEntity.hp = Math.max(0, heroEntity.hp - siphon);
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + siphon);
          combatLog.push(`🩸 ${enemy.name} drena ${siphon} HP do herói`);
        }
        if (enemy.name === 'Titã de Gelo' && turn % 4 === 0) {
          const chill = Math.floor(2 + Math.random() * 4);
          const oldDex = heroEntity.destreza;
          heroEntity.destreza = Math.max(1, heroEntity.destreza - 1);
          combatLog.push(`❄️ ${enemy.name} reduz a destreza do herói (${oldDex}→${heroEntity.destreza})`);
        }
        if (enemy.name === 'Draco Etéreo' && turn % 3 === 0) {
          const surge = Math.floor(3 + Math.random() * 5);
          enemy.weapon = { ...(enemy.weapon || { name: 'Garras', atk: 10, critChance: 0.2 }), atk: (enemy.weapon?.atk || 10) + 1 };
          combatLog.push(`⚡ ${enemy.name} acumula energia etérea`);
        }
        if (enemyBurn > 0 && enemy.hp > 0) {
          enemy.hp = Math.max(0, enemy.hp - enemyBurn);
          combatLog.push(`🔥 Queimadura causa ${enemyBurn} dano contínuo no inimigo`);
          enemyBurn = 0;
        }
        if (heroBurn > 0 && heroEntity.hp > 0) {
          heroEntity.hp = Math.max(0, heroEntity.hp - heroBurn);
          combatLog.push(`🔥 Queimadura causa ${heroBurn} dano contínuo em ${heroEntity.name}`);
          heroBurn = 0;
        }
        
        if (heroFirst) {
          // Herói ataca primeiro
          // Chance de usar habilidade ofensiva
          const useSkill = (hero.skills && hero.skills.length > 0) && Math.random() < 0.35;
          let stunned = false;
          if (useSkill) {
            const atkSkill = hero.skills.find(s => (s as any).type === 'attack') || hero.skills[0];
            const skillRes = resolveSkillUse(hero, enemy, atkSkill as any);
            enemy.hp = Math.max(0, enemy.hp - Math.floor(skillRes.damage * ramp));
            combatLog.push(`Turno ${turn}: ${skillRes.message}`);
            if (skillRes.healing && skillRes.healing > 0) {
              heroEntity.hp = Math.min(heroEntity.maxHp, heroEntity.hp + skillRes.healing);
            }
            stunned = (skillRes.effects || []).some(e => e.includes('freeze_stun') || e.includes('stun_1'));
          } else {
            const atkElem = heroElementOverride && heroElementOverrideTurns > 0 ? heroElementOverride : heroElement;
            const heroAttack = resolveAttack(heroEntity, enemy, { ramp, attackElement: atkElem, defendElement: enemyElement, atkAffinity: atkElem !== 'physical' && atkElem === heroElement ? 10 : 0, defResistance: 0 });
            enemy.hp = Math.max(0, enemy.hp - heroAttack.damage);
            combatLog.push(`Turno ${turn}: ${heroAttack.message}`);
            if (heroAttack.damage > 0 && (atkElem === 'fire')) {
              enemyBurn = Math.floor(heroAttack.damage * 0.10);
            }
            if (enemy.name === 'Arauto Ígneo' && heroAttack.damage > 0) {
              enemyBurn = Math.max(enemyBurn, Math.floor(heroAttack.damage * 0.15));
            }
            
            if (atkElem === 'dark' && heroAttack.damage > 0) {
              const ls = Math.floor(heroAttack.damage * 0.05);
              if (ls > 0) {
                heroEntity.hp = Math.min(heroEntity.maxHp, heroEntity.hp + ls);
                combatLog.push(`💀 ${heroEntity.name} rouba ${ls} HP`);
              }
            }
          }
          if (activePet?.exclusiveSkill && petEnergy >= 6 && petCooldownLeft <= 0) {
            let extraD = 0;
            let extraH = 0;
            let petStun = false;
            const skill = activePet.exclusiveSkill;
            let cost = 8;
            if (skill === 'Instinto Feral') {
              extraD = Math.floor(2 + Math.random() * 4);
              cost = 8;
            } else if (skill === 'Pulso Arcano') {
              extraD = Math.floor(3 + (hero.attributes.inteligencia || 0) * 0.1);
              cost = 10;
            } else if (skill === 'Aura Sagrada') {
              extraH = Math.floor(2 + Math.random() * 4);
              cost = 9;
            } else if (skill === 'Sussurro Sombrio') {
              petStun = Math.random() < 0.1;
              cost = 12;
            }
            if (petEnergy >= cost) {
              petEnergy -= cost;
              petEnergyUsed += cost;
            } else {
              extraD = 0;
              extraH = 0;
              petStun = false;
            }
            if (extraD > 0 && enemy.hp > 0) {
              enemy.hp = Math.max(0, enemy.hp - extraD);
              const icon = skill === 'Instinto Feral' ? '🐾' : skill === 'Pulso Arcano' ? '🔮' : skill === 'Aura Sagrada' ? '✨' : '🌑';
              combatLog.push(`${icon} Companheiro (${skill}) causa ${extraD} dano extra`);
              petDamageTotal += extraD;
            }
            if (extraH > 0) {
              let h = extraH;
              if ((heroElement || 'physical') === 'water') h = Math.floor(h * 1.10);
              if ((heroElement || 'physical') === 'light') h = Math.floor(h * 1.05);
              heroEntity.hp = Math.min(heroEntity.maxHp, heroEntity.hp + h);
              combatLog.push(`✨ Companheiro restaura ${h} HP`);
              petHealingTotal += h;
            }
            if (petStun) {
              stunned = true;
              combatLog.push(`🌑 Companheiro impede a ação do inimigo`);
              petStunCount += 1;
            }
            const cooldownMap: Record<string, number> = { 'Instinto Feral': 1, 'Pulso Arcano': 2, 'Aura Sagrada': 2, 'Sussurro Sombrio': 3 };
            petCooldownLeft = cooldownMap[skill] || 1;
            const elemMap: Record<string, Element> = { 'Instinto Feral': 'earth', 'Pulso Arcano': 'light', 'Aura Sagrada': 'light', 'Sussurro Sombrio': 'dark' };
            const ov = elemMap[skill];
            if (ov) { heroElementOverride = ov; heroElementOverrideTurns = 1; }
            if (ov) {
              petElementSet.add(ov);
              const icon = ov === 'earth' ? '⛰️' : ov === 'light' ? '✨' : ov === 'dark' ? '🌑' : '🌀';
              combatLog.push(`${icon} Elemento do herói aplicado: ${ov}`);
            }
          }
          
          const enemyStunned = stunned;
          if (enemy.hp > 0 && !enemyStunned) {
          const enemyAttack = resolveAttack(enemy, heroEntity, { ramp, attackElement: enemyElement, defendElement: heroElement, atkAffinity: 0, defResistance: 0, isEnemyAttack: true });
          heroEntity.hp = Math.max(0, heroEntity.hp - enemyAttack.damage);
          combatLog.push(`${enemyAttack.message}`);
          if (enemyAttack.damage > 0 && enemyElement === 'fire') {
            heroBurn = Math.floor(enemyAttack.damage * 0.10);
          }
          if (enemyElement === 'dark' && enemyAttack.damage > 0) {
            const ls = Math.floor(enemyAttack.damage * 0.05);
            if (ls > 0) {
              enemy.hp = Math.min(enemy.maxHp, enemy.hp + ls);
              combatLog.push(`💀 ${enemy.name} rouba ${ls} HP`);
            }
          }
          }
          if (heroElementOverrideTurns > 0) heroElementOverrideTurns = Math.max(0, heroElementOverrideTurns - 1);
        } else {
          // Inimigo ataca primeiro
          const enemyAttack = resolveAttack(enemy, heroEntity, { ramp, attackElement: enemyElement, defendElement: heroElement, atkAffinity: 0, defResistance: 0, isEnemyAttack: true });
          heroEntity.hp = Math.max(0, heroEntity.hp - enemyAttack.damage);
          combatLog.push(`Turno ${turn}: ${enemyAttack.message}`);
          if (enemyAttack.damage > 0 && enemyElement === 'fire') {
            heroBurn = Math.floor(enemyAttack.damage * 0.10);
          }
          if (enemyElement === 'dark' && enemyAttack.damage > 0) {
            const ls = Math.floor(enemyAttack.damage * 0.05);
            if (ls > 0) {
              enemy.hp = Math.min(enemy.maxHp, enemy.hp + ls);
              combatLog.push(`💀 ${enemy.name} rouba ${ls} HP`);
            }
          }
          
          if (heroEntity.hp > 0) {
            const useSkill = (hero.skills && hero.skills.length > 0) && Math.random() < 0.35;
            let stunned = false;
            if (useSkill) {
              const atkSkill = hero.skills.find(s => (s as any).type === 'attack') || hero.skills[0];
              const skillRes = resolveSkillUse(hero, enemy, atkSkill as any);
              enemy.hp = Math.max(0, enemy.hp - Math.floor(skillRes.damage * ramp));
              combatLog.push(`${skillRes.message}`);
              if (skillRes.healing && skillRes.healing > 0) {
                heroEntity.hp = Math.min(heroEntity.maxHp, heroEntity.hp + skillRes.healing);
              }
              stunned = (skillRes.effects || []).some(e => e.includes('freeze_stun') || e.includes('stun_1'));
            } else {
              const atkElem = heroElementOverride && heroElementOverrideTurns > 0 ? heroElementOverride : heroElement;
              const heroAttack = resolveAttack(heroEntity, enemy, { ramp, attackElement: atkElem, defendElement: enemyElement, atkAffinity: atkElem !== 'physical' && atkElem === heroElement ? 10 : 0, defResistance: 0 });
              enemy.hp = Math.max(0, enemy.hp - heroAttack.damage);
              combatLog.push(`${heroAttack.message}`);
              if (heroAttack.damage > 0 && (atkElem === 'fire')) {
                enemyBurn = Math.floor(heroAttack.damage * 0.10);
              }
              if (enemy.name === 'Arauto Ígneo' && heroAttack.damage > 0) {
                enemyBurn = Math.max(enemyBurn, Math.floor(heroAttack.damage * 0.15));
              }
              if ((hero.alignment || '').includes('mal') && heroAttack.damage > 0) {
                const leech = Math.floor(heroAttack.damage * 0.20);
                if (leech > 0) {
                  heroEntity.hp = Math.min(heroEntity.maxHp, heroEntity.hp + leech);
                  combatLog.push(`🩸 ${heroEntity.name} drena ${leech} HP`);
                }
              }
              if (atkElem === 'dark' && heroAttack.damage > 0) {
                const ls = Math.floor(heroAttack.damage * 0.05);
                if (ls > 0) {
                  heroEntity.hp = Math.min(heroEntity.maxHp, heroEntity.hp + ls);
                  combatLog.push(`💀 ${heroEntity.name} rouba ${ls} HP`);
                }
              }
            }
            if (activePet?.exclusiveSkill && petEnergy >= 6 && petCooldownLeft <= 0) {
              let extraD = 0;
              let extraH = 0;
              let petStun = false;
              const skill = activePet.exclusiveSkill;
              let cost = 8;
              if (skill === 'Instinto Feral') {
                extraD = Math.floor(2 + Math.random() * 4);
                cost = 8;
              } else if (skill === 'Pulso Arcano') {
                extraD = Math.floor(3 + (hero.attributes.inteligencia || 0) * 0.1);
                cost = 10;
              } else if (skill === 'Aura Sagrada') {
                extraH = Math.floor(2 + Math.random() * 4);
                cost = 9;
              } else if (skill === 'Sussurro Sombrio') {
                petStun = Math.random() < 0.1;
                cost = 12;
              }
              if (petEnergy >= cost) {
                petEnergy -= cost;
                petEnergyUsed += cost;
              } else {
                extraD = 0;
                extraH = 0;
                petStun = false;
              }
              if (extraD > 0 && enemy.hp > 0) {
                enemy.hp = Math.max(0, enemy.hp - extraD);
                const icon = skill === 'Instinto Feral' ? '🐾' : skill === 'Pulso Arcano' ? '🔮' : skill === 'Aura Sagrada' ? '✨' : '🌑';
                combatLog.push(`${icon} Companheiro (${skill}) causa ${extraD} dano extra`);
                petDamageTotal += extraD;
              }
              if (extraH > 0) {
                heroEntity.hp = Math.min(heroEntity.maxHp, heroEntity.hp + extraH);
                combatLog.push(`✨ Companheiro restaura ${extraH} HP`);
                petHealingTotal += extraH;
              }
              if (petStun) {
                stunned = true;
                combatLog.push(`🌑 Companheiro impede a ação do inimigo`);
                petStunCount += 1;
              }
              const cooldownMap: Record<string, number> = { 'Instinto Feral': 1, 'Pulso Arcano': 2, 'Aura Sagrada': 2, 'Sussurro Sombrio': 3 };
              petCooldownLeft = cooldownMap[skill] || 1;
              const elemMap: Record<string, Element> = { 'Instinto Feral': 'earth', 'Pulso Arcano': 'light', 'Aura Sagrada': 'light', 'Sussurro Sombrio': 'dark' };
              const ov = elemMap[skill];
              if (ov) { heroElementOverride = ov; heroElementOverrideTurns = 1; }
              if (ov) {
                petElementSet.add(ov);
                const icon = ov === 'earth' ? '⛰️' : ov === 'light' ? '✨' : ov === 'dark' ? '🌑' : '🌀';
                combatLog.push(`${icon} Elemento do herói aplicado: ${ov}`);
              }
            }
          }

        if (petCooldownLeft > 0) petCooldownLeft = Math.max(0, petCooldownLeft - 1);
        if (heroElementOverrideTurns > 0) heroElementOverrideTurns = Math.max(0, heroElementOverrideTurns - 1);
        }
        
        // Lógica de fuga do inimigo quando em desvantagem
        const enemyLow = enemy.hp / enemy.maxHp <= 0.25;
        const heroHealthy = heroEntity.hp / heroEntity.maxHp >= 0.5;
        if (!enemyFled && turn >= 8 && enemyLow && heroHealthy) {
          let fleeChance = 0.5 + (0.2 * (heroEntity.destreza > enemy.destreza ? 1 : 0));
          if (Math.random() < fleeChance) {
            enemyFled = true;
            combatLog.push(`${enemy.name} tenta fugir e consegue! Combate encerrado.`);
            break;
          }
        }
        
        turn++;
      }
      
      // Verificar resultado
      if (heroEntity.hp <= 0) {
        combatLog.push(`${heroEntity.name} foi derrotado!`);
        return {
          victory: false,
          damage: heroEntity.maxHp - heroEntity.hp,
          xpGained: 0,
          goldGained: 0,
          itemsGained: [],
          log: combatLog
        };
      }
      
      if (enemy.hp <= 0) {
        combatLog.push(`${enemy.name} foi derrotado!`);
        
        // Calcular recompensas
        const xp = calculateXpReward(enemy, hero.progression.level);
        const gold = calculateGoldReward(enemy);
        const loot = generateLoot(questEnemy.type);

        // Drop universal: Núcleos de Mana
        const level = questEnemy.level || 1;
        const coreCandidates: { id: string; chance: number }[] =
          level >= 20
            ? [
                { id: 'nucleo-mana-raro', chance: 0.20 },
                { id: 'nucleo-ancestral', chance: 0.10 }
              ]
            : level >= 10
            ? [
                { id: 'nucleo-mana', chance: 0.35 },
                { id: 'nucleo-mana-raro', chance: 0.10 }
              ]
            : [
                { id: 'nucleo-mana-menor', chance: 0.40 },
                { id: 'nucleo-mana', chance: 0.15 }
              ];
        coreCandidates.forEach(({ id, chance }) => {
          if (Math.random() < chance) {
            const coreItem = SHOP_ITEMS.find(i => i.id === id);
            if (coreItem) loot.push(coreItem);
          }
        });

        // Bônus adaptativo de loot por andar/party/acessório
        const floor = opts.floor || 1;
        const floorBias = (dungeonConfig.rarityIncreasePerFloor || 0) * floor; // % acumulado
        const partyBonus = opts.partyBonusPercent || 0;
        const accList = [hero.inventory?.equippedRingLeft, hero.inventory?.equippedRingRight, hero.inventory?.equippedNecklace, hero.inventory?.equippedEarringLeft, hero.inventory?.equippedEarringRight].filter(Boolean) as string[];
        const ringBonus = accList.some(id => /anel|ring/i.test(String(id))) ? 2 : 0;
        let bonusChance = Math.min(0.05 + (floorBias + partyBonus + ringBonus) / 100, 0.35);

        if (Math.random() < bonusChance) {
          const eligibleTypes = new Set(['weapon', 'armor', 'accessory']);
          const rarityOrder: Array<'comum' | 'incomum' | 'raro' | 'epico' | 'lendario'> = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
          // Converter viés em um índice mínimo aproximado
          const minIndex = floorBias >= 35 ? 3 : floorBias >= 20 ? 2 : floorBias >= 10 ? 1 : 0;
          const pool = SHOP_ITEMS.filter(i => eligibleTypes.has(i.type) && rarityOrder.indexOf(i.rarity as any) >= minIndex);
          if (pool.length > 0) {
            const bonusItem = pool[Math.floor(Math.random() * pool.length)];
            loot.push(bonusItem);
          }
        }
        
        totalXp += xp;
        totalGold += gold;
        allLoot.push(...loot);
        
        combatLog.push(`Recompensas: +${xp} XP, +${gold} ouro`);
        if (loot.length > 0) {
          combatLog.push(`Itens encontrados: ${loot.map(item => item.name).join(', ')}`);
        }
      } else {
        // inimigo fugiu ou combate encerrou por tempo
        const baseXp = calculateXpReward(enemy, hero.progression.level);
        const reducedXp = Math.floor(baseXp * 0.4);
        totalXp += reducedXp;
        combatLog.push(`Combate inconclusivo - ${enemy.name} foge! Recompensa reduzida: +${reducedXp} XP`);
      }
    }
  }
  
  combatLog.push(`\n=== VITÓRIA! ===`);
  combatLog.push(`Total: +${totalXp} XP, +${totalGold} ouro`);
  if (activePet && (petDamageTotal > 0 || petHealingTotal > 0 || petStunCount > 0)) {
    combatLog.push(`🐾 Contribuição do Companheiro: +${petDamageTotal} dano, +${petHealingTotal} cura, ${petStunCount} controle(s)`);
  }
  
  return {
    victory: true,
    damage: heroEntity.maxHp - heroEntity.hp,
    xpGained: totalXp,
    goldGained: totalGold,
    itemsGained: allLoot,
    log: combatLog,
    petEnergyUsed,
    petDamage: petDamageTotal,
    petHealing: petHealingTotal,
    petStuns: petStunCount,
    petElementHighlights: Array.from(petElementSet)
  };
}

// === FUNÇÃO DE AUTO-RESOLVE (PARA MISSÕES RÁPIDAS) ===

export function autoResolveCombat(hero: Hero, enemies: QuestEnemy[], isGuildQuest: boolean = false): CombatResult {
  const heroEntity = heroToCombatEntity(hero);
  let totalPower = heroEntity.forca + heroEntity.destreza + heroEntity.constituicao;
  const activePet = (hero.pets || []).find(p => p.id === (hero as any).activePetId);
  let petEnergyUsed = 0;
  
  let enemyPower = 0;
  enemies.forEach(questEnemy => {
    const enemy = createEnemyFromTemplate(questEnemy.type, questEnemy.level || 1);
    enemyPower += (enemy.forca + enemy.destreza + enemy.constituicao) * questEnemy.count;
  });
  
  // Bônus especial para missões de guilda
  let guildBonus = 0;
  if (isGuildQuest) {
    // Bônus muito maior para tornar missões de guilda viáveis
    guildBonus = hero.progression.level * 30 + 40; // +40 base + 30 por nível
    console.log(`🏰 Bônus de guilda aplicado: +${guildBonus} poder`);
  }
  
  // Calcular chance de vitória (50% base + diferença de poder + bônus de guilda)
  const powerDiff = (totalPower + guildBonus) - enemyPower;
  const baseWinChance = isGuildQuest ? 75 : 50; // Chance base muito maior para missões de guilda
  let winChance = Math.max(25, Math.min(95, baseWinChance + powerDiff * 2));
  if (activePet?.exclusiveSkill && (activePet.energy || 0) >= 12) {
    winChance = Math.min(95, winChance + 7);
    petEnergyUsed += 12;
  }
  
  console.log(`⚔️ Poder do herói: ${totalPower} + ${guildBonus} = ${totalPower + guildBonus}`);
  console.log(`👹 Poder dos inimigos: ${enemyPower}`);
  console.log(`🎲 Chance de vitória: ${winChance.toFixed(1)}%`);
  
  const victory = Math.random() * 100 < winChance;
  
  // Gerar narrativa imersiva do combate
  const generateCombatNarrative = (victory: boolean, enemies: QuestEnemy[], hero: Hero): string[] => {
    const narrative: string[] = [];
    const enemyNames = enemies.map(e => `${e.count} ${e.type}${e.count > 1 ? 's' : ''}`).join(', ');
    
    narrative.push(`⚔️ ${hero.name} enfrenta ${enemyNames} em combate!`);
    
    if (isGuildQuest) {
      narrative.push(`🏰 O poder da guilda fortalece ${hero.name} na batalha!`);
    }
    
    if (victory) {
      narrative.push(`💪 ${hero.name} luta com bravura e determinação!`);
      narrative.push(`⚡ Seus golpes encontram o alvo com precisão mortal!`);
      
      enemies.forEach(questEnemy => {
        if (questEnemy.count === 1) {
          narrative.push(`🗡️ O ${questEnemy.type} é derrotado após uma batalha intensa!`);
        } else {
          narrative.push(`🗡️ Os ${questEnemy.count} ${questEnemy.type}s são derrotados um por um!`);
        }
      });
      
      narrative.push(`🎉 Vitória! ${hero.name} emerge triunfante do combate!`);
    } else {
      narrative.push(`😰 ${hero.name} luta corajosamente, mas os inimigos são muito poderosos!`);
      narrative.push(`💥 Após uma batalha feroz, ${hero.name} é forçado a recuar!`);
      narrative.push(`🩹 Ferido mas vivo, ${hero.name} aprende com a derrota...`);
    }
    
    return narrative;
  };
  
  const combatLog = generateCombatNarrative(victory, enemies, hero);
  
  if (victory) {
    let totalXp = 0;
    let totalGold = 0;
    let allLoot: Item[] = [];
    
    enemies.forEach(questEnemy => {
      for (let i = 0; i < questEnemy.count; i++) {
        const enemy = createEnemyFromTemplate(questEnemy.type, questEnemy.level || 1);
        totalXp += calculateXpReward(enemy, hero.progression.level);
        totalGold += calculateGoldReward(enemy);
        const loot = generateLoot(questEnemy.type);

        // Drop universal de Núcleos de Mana também no auto-resolve
        const level = questEnemy.level || 1;
        const coreCandidates: { id: string; chance: number }[] =
          level >= 20
            ? [
                { id: 'nucleo-mana-raro', chance: 0.20 },
                { id: 'nucleo-ancestral', chance: 0.10 }
              ]
            : level >= 10
            ? [
                { id: 'nucleo-mana', chance: 0.35 },
                { id: 'nucleo-mana-raro', chance: 0.10 }
              ]
            : [
                { id: 'nucleo-mana-menor', chance: 0.40 },
                { id: 'nucleo-mana', chance: 0.15 }
              ];
        coreCandidates.forEach(({ id, chance }) => {
          if (Math.random() < chance) {
            const coreItem = SHOP_ITEMS.find(i => i.id === id);
            if (coreItem) loot.push(coreItem);
          }
        });
        // Aplicar também bônus adaptativo em auto-resolve com viés reduzido
        const eligibleTypes = new Set(['weapon', 'armor', 'accessory']);
        const rarityOrder: Array<'comum' | 'incomum' | 'raro' | 'epico' | 'lendario'> = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
        const accList2 = [hero.inventory?.equippedRingLeft, hero.inventory?.equippedRingRight, hero.inventory?.equippedNecklace, hero.inventory?.equippedEarringLeft, hero.inventory?.equippedEarringRight].filter(Boolean) as string[];
        const ringBonus = accList2.some(id => /anel|ring/i.test(String(id))) ? 2 : 0;
        const baseBias = (dungeonConfig.rarityIncreasePerFloor || 0);
        const minIndex = baseBias >= 20 ? 2 : baseBias >= 10 ? 1 : 0;
        const bonusChance = Math.min(0.03 + (baseBias + ringBonus) / 100, 0.25);
        if (Math.random() < bonusChance) {
          const pool = SHOP_ITEMS.filter(i => eligibleTypes.has(i.type) && rarityOrder.indexOf(i.rarity as any) >= minIndex);
          if (pool.length > 0) {
            loot.push(pool[Math.floor(Math.random() * pool.length)]);
          }
        }
        allLoot.push(...loot);
      }
    });
    
    combatLog.push(`💰 Recompensas: ${totalXp} XP, ${totalGold} moedas de ouro`);
    if (allLoot.length > 0) {
      combatLog.push(`🎒 Itens encontrados: ${allLoot.map(item => item.name).join(', ')}`);
    }
    
    return {
      victory: true,
      damage: Math.floor(Math.random() * 10), // Dano mínimo em auto-resolve
      xpGained: totalXp,
      goldGained: totalGold,
      itemsGained: allLoot,
      log: combatLog,
      petEnergyUsed,
      petDamage: 0,
      petHealing: 0,
      petStuns: 0
    };
  } else {
    const damage = Math.floor(heroEntity.maxHp * 0.3);
    combatLog.push(`💔 ${hero.name} sofre ${damage} pontos de dano na derrota`);
    
    return {
      victory: false,
      damage: damage,
      xpGained: 0,
      goldGained: 0,
      itemsGained: [],
      log: combatLog,
      petEnergyUsed,
      petDamage: 0,
      petHealing: 0,
      petStuns: 0
    };
  }
}

export type MonsterArchetype = 'humano' | 'bestial' | 'elemental' | 'esqueleto' | 'corrupto';
export type MonsterModifier = 'feroz' | 'agil' | 'versatil' | 'morto-vivo' | 'blindado';

export interface GeneratedMonster {
  type: MonsterArchetype;
  tier: number;
  modifiers: MonsterModifier[];
  level: number;
  drops: string[]; // itemIds
  stats: {
    hp: number;
    damage: number;
    speed: number;
    resistances?: Partial<Record<Element, number>>;
  };
}

export function generateMonster(seed: number, difficulty: 'facil' | 'medio' | 'dificil', luck = 0): GeneratedMonster {
  const tier = difficulty === 'facil' ? 1 : difficulty === 'medio' ? 2 : 3;
  const typePool: MonsterArchetype[] = ['humano', 'bestial', 'elemental', 'esqueleto', 'corrupto'];
  const type = typePool[seed % typePool.length];
  const modPool: MonsterModifier[] = ['feroz', 'agil', 'versatil', 'morto-vivo', 'blindado'];
  const modifiers = [modPool[(seed + 3) % modPool.length]];
  const level = tier + Math.floor(luck / 10);
  const stats = { hp: 50 * tier + level * 5, damage: 10 * tier + level, speed: 5 + tier };
  const drops = ['material-bruto', 'pedra-encantamento'];
  return { type, tier, modifiers, level, drops, stats };
}
