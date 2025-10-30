/**
 * Sistema de Combate - RNG + Atributos
 */

import { Hero, CombatResult, QuestEnemy, Item } from '../types/hero';

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

function resolveAttack(attacker: CombatEntity, defender: CombatEntity): AttackResult {
  // Calcular chance de acerto baseada em destreza
  const baseHit = 50 + (attacker.destreza - defender.destreza) * 3;
  const hitChance = Math.max(5, Math.min(95, baseHit)); // Entre 5% e 95%
  
  const roll = Math.floor(Math.random() * 100) + 1;
  
  if (roll <= hitChance) {
    // Acertou! Calcular dano
    const weaponAtk = attacker.weapon?.atk || 0;
    const baseDamage = attacker.forca + weaponAtk;
    
    // Verificar crítico
    const critChance = attacker.weapon?.critChance || 0.05;
    const isCrit = Math.random() < critChance;
    
    // Aplicar multiplicador de crítico e redução de armadura
    const finalDamage = Math.max(1, Math.floor(
      baseDamage * (isCrit ? 1.5 : 1) - defender.armor
    ));
    
    defender.hp = Math.max(0, defender.hp - finalDamage);
    
    const weaponName = attacker.weapon?.name || 'punhos';
    const critText = isCrit ? ' CRÍTICO!' : '';
    
    return {
      hit: true,
      damage: finalDamage,
      crit: isCrit,
      message: `${attacker.name} ataca com ${weaponName} e causa ${finalDamage} de dano${critText}`
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

// === FUNÇÃO PRINCIPAL DE COMBATE ===

export function resolveCombat(hero: Hero, enemies: QuestEnemy[]): CombatResult {
  const combatLog: string[] = [];
  let totalXp = 0;
  let totalGold = 0;
  let allLoot: Item[] = [];
  
  const heroEntity = heroToCombatEntity(hero);
  combatLog.push(`${heroEntity.name} entra em combate!`);
  
  // Processar cada inimigo
  for (const questEnemy of enemies) {
    for (let i = 0; i < questEnemy.count; i++) {
      const enemy = createEnemyFromTemplate(questEnemy.type, questEnemy.level || 1);
      combatLog.push(`\n--- Enfrentando ${enemy.name} ---`);
      
      // Combate por turnos
      let turn = 1;
      while (heroEntity.hp > 0 && enemy.hp > 0 && turn <= 10) { // Máximo 10 turnos
        // Determinar quem ataca primeiro (baseado em destreza)
        const heroFirst = heroEntity.destreza >= enemy.destreza;
        
        if (heroFirst) {
          // Herói ataca primeiro
          const heroAttack = resolveAttack(heroEntity, enemy);
          combatLog.push(`Turno ${turn}: ${heroAttack.message}`);
          
          if (enemy.hp > 0) {
            const enemyAttack = resolveAttack(enemy, heroEntity);
            combatLog.push(`${enemyAttack.message}`);
          }
        } else {
          // Inimigo ataca primeiro
          const enemyAttack = resolveAttack(enemy, heroEntity);
          combatLog.push(`Turno ${turn}: ${enemyAttack.message}`);
          
          if (heroEntity.hp > 0) {
            const heroAttack = resolveAttack(heroEntity, enemy);
            combatLog.push(`${heroAttack.message}`);
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
        const xp = calculateXpReward(enemy, hero.level);
        const gold = calculateGoldReward(enemy);
        const loot = generateLoot(questEnemy.type);
        
        totalXp += xp;
        totalGold += gold;
        allLoot.push(...loot);
        
        combatLog.push(`Recompensas: +${xp} XP, +${gold} ouro`);
        if (loot.length > 0) {
          combatLog.push(`Itens encontrados: ${loot.map(item => item.name).join(', ')}`);
        }
      } else {
        combatLog.push(`Combate inconclusivo - ${enemy.name} foge!`);
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

export function autoResolveCombat(hero: Hero, enemies: QuestEnemy[]): CombatResult {
  const heroEntity = heroToCombatEntity(hero);
  let totalPower = heroEntity.forca + heroEntity.destreza + heroEntity.constituicao;
  
  let enemyPower = 0;
  enemies.forEach(questEnemy => {
    const enemy = createEnemyFromTemplate(questEnemy.type, questEnemy.level || 1);
    enemyPower += (enemy.forca + enemy.destreza + enemy.constituicao) * questEnemy.count;
  });
  
  // Calcular chance de vitória (50% base + diferença de poder)
  const powerDiff = totalPower - enemyPower;
  const winChance = Math.max(10, Math.min(90, 50 + powerDiff * 2));
  
  const victory = Math.random() * 100 < winChance;
  
  if (victory) {
    let totalXp = 0;
    let totalGold = 0;
    let allLoot: Item[] = [];
    
    enemies.forEach(questEnemy => {
      for (let i = 0; i < questEnemy.count; i++) {
        const enemy = createEnemyFromTemplate(questEnemy.type, questEnemy.level || 1);
        totalXp += calculateXpReward(enemy, hero.level);
        totalGold += calculateGoldReward(enemy);
        allLoot.push(...generateLoot(questEnemy.type));
      }
    });
    
    return {
      victory: true,
      damage: Math.floor(Math.random() * 10), // Dano mínimo em auto-resolve
      xpGained: totalXp,
      goldGained: totalGold,
      itemsGained: allLoot,
      log: [`Combate resolvido automaticamente - Vitória!`]
    };
  } else {
    return {
      victory: false,
      damage: Math.floor(heroEntity.maxHp * 0.3), // 30% de dano em derrota
      xpGained: 0,
      goldGained: 0,
      itemsGained: [],
      log: [`Combate resolvido automaticamente - Derrota!`]
    };
  }
}