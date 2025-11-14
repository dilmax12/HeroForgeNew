/**
 * Sistema de Combate - RNG + Atributos
 */

import { Hero, CombatResult, QuestEnemy, Item, Skill, Element } from '../types/hero';
import { SHOP_ITEMS } from './shop';
import { dungeonConfig } from './dungeonConfig';
import { getElementMultiplier, generateRandomElement } from './elementSystem';

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
    weapon: { name: 'Arma Básica', atk: 2, critChance: 0.05 } // TODO: usar equipamento real
  };
}

function resolveAttack(attacker: CombatEntity, defender: CombatEntity, opts?: { ramp?: number; attackElement?: Element; defendElement?: Element; skillBonus?: number }): AttackResult {
  // Calcular chance de acerto baseada em destreza
  const baseHit = 50 + (attacker.destreza - defender.destreza) * 3;
  const hitChance = Math.max(5, Math.min(95, baseHit)); // Entre 5% e 95%
  
  const roll = Math.floor(Math.random() * 100) + 1;
  
  if (roll <= hitChance) {
    // Acertou! Calcular dano
    const weaponAtk = attacker.weapon?.atk || 0;
    const baseDamage = attacker.forca + weaponAtk + (opts?.skillBonus || 0);
    
    // Verificar crítico
    const critChance = attacker.weapon?.critChance || 0.05;
    const isCrit = Math.random() < critChance;
    
    // Multiplicadores: crítico, ramp de dano e elemento
    const ramp = opts?.ramp || 1;
    const elemMult = getElementMultiplier(opts?.attackElement || 'physical', opts?.defendElement || 'physical');
    const finalDamage = Math.max(1, Math.floor(
      baseDamage * (isCrit ? 1.5 : 1) * ramp * elemMult - defender.armor
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
      basePower += user.attributes.sabedoria * 0.3;
      break;
    case 'buff':
      basePower += user.attributes.carisma * 0.2;
      break;
  }
  console.debug('[combat] basePower', basePower);
  
  // Calcular multiplicador elemental
  const elementMultiplier = getElementMultiplier(skill.element || 'physical', targetElement);
  console.debug('[combat] elementMultiplier', elementMultiplier);
  
  // Calcular dano final
  let finalDamage = 0;
  let healing = 0;
  const effects: string[] = [];
  
  if (skill.type === 'attack') {
    const targetDefense = (target as any).constituicao || target.constituicao || 0;
    finalDamage = Math.max(0, Math.floor(basePower * elementMultiplier) - (targetDefense * 0.3));
    console.debug('[combat] attack calc', { targetDefense, finalDamage });
  } else if (skill.type === 'support' && skill.name.includes('Cura')) {
    healing = Math.floor(basePower);
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
  
  // Processar cada inimigo
  for (const questEnemy of enemies) {
    for (let i = 0; i < questEnemy.count; i++) {
      const enemy = createEnemyFromTemplate(questEnemy.type, questEnemy.level || 1);
      const enemyElement: Element = generateRandomElement();
      combatLog.push(`\n--- Enfrentando ${enemy.name} ---`);
      combatLog.push(`Elemento do inimigo: ${enemyElement}`);
      
      // Combate por turnos
      let turn = 1;
      let enemyFled = false;
      const maxTurns = 20; // aumentar teto de turnos
      while (heroEntity.hp > 0 && enemy.hp > 0 && turn <= maxTurns) {
        // Determinar quem ataca primeiro (baseado em destreza)
        const heroFirst = heroEntity.destreza >= enemy.destreza;
        const ramp = 1 + Math.min(0.10 + turn * 0.06, 2.0); // ramp de dano progressivo
        
        if (heroFirst) {
          // Herói ataca primeiro
          // Chance de usar habilidade ofensiva
          const useSkill = (hero.skills && hero.skills.length > 0) && Math.random() < 0.35;
          if (useSkill) {
            const atkSkill = hero.skills.find(s => (s as any).type === 'attack') || hero.skills[0];
            const skillRes = resolveSkillUse(hero, enemy, atkSkill as any);
            enemy.hp = Math.max(0, enemy.hp - Math.floor(skillRes.damage * ramp));
            combatLog.push(`Turno ${turn}: ${skillRes.message}`);
          } else {
            const heroAttack = resolveAttack(heroEntity, enemy, { ramp, attackElement: heroElement, defendElement: enemyElement });
            enemy.hp = Math.max(0, enemy.hp - heroAttack.damage);
            combatLog.push(`Turno ${turn}: ${heroAttack.message}`);
          }
          
          if (enemy.hp > 0) {
            const enemyAttack = resolveAttack(enemy, heroEntity, { ramp, attackElement: enemyElement, defendElement: heroElement });
            heroEntity.hp = Math.max(0, heroEntity.hp - enemyAttack.damage);
            combatLog.push(`${enemyAttack.message}`);
          }
        } else {
          // Inimigo ataca primeiro
          const enemyAttack = resolveAttack(enemy, heroEntity, { ramp, attackElement: enemyElement, defendElement: heroElement });
          heroEntity.hp = Math.max(0, heroEntity.hp - enemyAttack.damage);
          combatLog.push(`Turno ${turn}: ${enemyAttack.message}`);
          
          if (heroEntity.hp > 0) {
            const useSkill = (hero.skills && hero.skills.length > 0) && Math.random() < 0.35;
            if (useSkill) {
              const atkSkill = hero.skills.find(s => (s as any).type === 'attack') || hero.skills[0];
              const skillRes = resolveSkillUse(hero, enemy, atkSkill as any);
              enemy.hp = Math.max(0, enemy.hp - Math.floor(skillRes.damage * ramp));
              combatLog.push(`${skillRes.message}`);
            } else {
              const heroAttack = resolveAttack(heroEntity, enemy, { ramp, attackElement: heroElement, defendElement: enemyElement });
              enemy.hp = Math.max(0, enemy.hp - heroAttack.damage);
              combatLog.push(`${heroAttack.message}`);
            }
          }
        }
        
        // Lógica de fuga do inimigo quando em desvantagem
        const enemyLow = enemy.hp / enemy.maxHp <= 0.25;
        const heroHealthy = heroEntity.hp / heroEntity.maxHp >= 0.5;
        if (!enemyFled && turn >= 8 && enemyLow && heroHealthy) {
          const fleeChance = 0.5 + (0.2 * (heroEntity.destreza > enemy.destreza ? 1 : 0));
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
        const partyBonus = opts.partyBonusPercent || 0; // % adicional
        const accId = hero.inventory?.equippedAccessory;
        const ringBonus = accId && /anel|ring/i.test(accId) ? 2 : 0; // +2% se acessório aparenta ser anel
        const bonusChance = Math.min(0.05 + (floorBias + partyBonus + ringBonus) / 100, 0.35);

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
  
  return {
    victory: true,
    damage: heroEntity.maxHp - heroEntity.hp,
    xpGained: totalXp,
    goldGained: totalGold,
    itemsGained: allLoot,
    log: combatLog
  };
}

// === FUNÇÃO DE AUTO-RESOLVE (PARA MISSÕES RÁPIDAS) ===

export function autoResolveCombat(hero: Hero, enemies: QuestEnemy[], isGuildQuest: boolean = false): CombatResult {
  const heroEntity = heroToCombatEntity(hero);
  let totalPower = heroEntity.forca + heroEntity.destreza + heroEntity.constituicao;
  
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
  const winChance = Math.max(25, Math.min(95, baseWinChance + powerDiff * 2));
  
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
        const accId = hero.inventory?.equippedAccessory;
        const ringBonus = accId && /anel|ring/i.test(accId) ? 2 : 0;
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
      log: combatLog
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
      log: combatLog
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
