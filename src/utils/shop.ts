/**
 * Sistema de Loja e Economia
 */

import { Item, ItemType, ItemRarity, Hero } from '../types/hero';

// === CATÁLOGO DE ITENS DA LOJA ===

export const SHOP_ITEMS: Item[] = [
  // === CONSUMÍVEIS ===
  {
    id: 'pocao-pequena',
    name: 'Poção de Cura Pequena',
    description: 'Restaura 20 HP instantaneamente',
    type: 'consumable',
    rarity: 'comum',
    price: 25,
    icon: '🧪',
    effects: { hp: 20 }
  },
  {
    id: 'pocao-media',
    name: 'Poção de Cura Média',
    description: 'Restaura 50 HP instantaneamente',
    type: 'consumable',
    rarity: 'raro',
    price: 60,
    icon: '🧪',
    effects: { hp: 50 }
  },
  {
    id: 'pocao-grande',
    name: 'Poção de Cura Grande',
    description: 'Restaura 100 HP instantaneamente',
    type: 'consumable',
    rarity: 'epico',
    price: 150,
    icon: '🧪',
    effects: { hp: 100 }
  },
  {
    id: 'pocao-mana',
    name: 'Poção de Mana',
    description: 'Restaura 30 MP instantaneamente',
    type: 'consumable',
    rarity: 'comum',
    price: 30,
    icon: '🔮',
    effects: { mp: 30 }
  },
  {
    id: 'pergaminho-xp',
    name: 'Pergaminho de Experiência',
    description: 'Concede 50 XP de bônus',
    type: 'consumable',
    rarity: 'raro',
    price: 80,
    icon: '📜',
    effects: { duration: 0 } // Efeito instantâneo
  },
  {
    id: 'elixir-forca',
    name: 'Elixir de Força',
    description: '+2 Força por 60 minutos',
    type: 'consumable',
    rarity: 'raro',
    price: 100,
    icon: '💪',
    bonus: { forca: 2 },
    effects: { duration: 60 }
  },

  // === ARMAS ===
  {
    id: 'espada-ferro',
    name: 'Espada de Ferro',
    description: 'Uma espada confiável de ferro forjado. +3 Força',
    type: 'weapon',
    rarity: 'comum',
    price: 100,
    icon: '⚔️',
    bonus: { forca: 3 }
  },
  {
    id: 'espada-aco',
    name: 'Espada de Aço',
    description: 'Lâmina afiada de aço temperado. +5 Força',
    type: 'weapon',
    rarity: 'raro',
    price: 250,
    icon: '🗡️',
    bonus: { forca: 5 }
  },
  {
    id: 'adaga-sombras',
    name: 'Adaga das Sombras',
    description: 'Lâmina élfica encantada. +3 Destreza, +2 Força',
    type: 'weapon',
    rarity: 'epico',
    price: 400,
    icon: '🗡️',
    bonus: { destreza: 3, forca: 2 }
  },
  {
    id: 'cajado-sabio',
    name: 'Cajado do Sábio',
    description: 'Cajado mágico antigo. +4 Inteligência, +2 Sabedoria',
    type: 'weapon',
    rarity: 'epico',
    price: 450,
    icon: '🪄',
    bonus: { inteligencia: 4, sabedoria: 2 }
  },
  {
    id: 'arco-madeira',
    name: 'Arco de Madeira',
    description: 'Arco simples de madeira resistente. +2 Destreza',
    type: 'weapon',
    rarity: 'comum',
    price: 80,
    icon: '🏹',
    bonus: { destreza: 2 }
  },
  {
    id: 'arco-composto',
    name: 'Arco Composto',
    description: 'Arco avançado com maior alcance. +4 Destreza, +1 Força',
    type: 'weapon',
    rarity: 'raro',
    price: 220,
    icon: '🏹',
    bonus: { destreza: 4, forca: 1 }
  },
  {
    id: 'arco-elfico',
    name: 'Arco Élfico Encantado',
    description: 'Arco élfico com runas mágicas. +5 Destreza, +2 Sabedoria',
    type: 'weapon',
    rarity: 'epico',
    price: 480,
    icon: '🏹',
    bonus: { destreza: 5, sabedoria: 2 }
  },
  {
    id: 'besta-pesada',
    name: 'Besta Pesada',
    description: 'Besta de guerra com grande poder. +3 Força, +3 Destreza',
    type: 'weapon',
    rarity: 'raro',
    price: 320,
    icon: '🏹',
    bonus: { forca: 3, destreza: 3 }
  },

  // === ARMADURAS ===
  {
    id: 'armadura-couro',
    name: 'Armadura de Couro',
    description: 'Proteção básica de couro curtido. +2 Constituição',
    type: 'armor',
    rarity: 'comum',
    price: 75,
    icon: '🦺',
    bonus: { constituicao: 2 }
  },
  {
    id: 'armadura-cota',
    name: 'Cota de Malha',
    description: 'Armadura de anéis entrelaçados. +4 Constituição',
    type: 'armor',
    rarity: 'raro',
    price: 200,
    icon: '🛡️',
    bonus: { constituicao: 4 }
  },
  {
    id: 'armadura-placas',
    name: 'Armadura de Placas',
    description: 'Proteção máxima em placas de aço. +6 Constituição, -1 Destreza',
    type: 'armor',
    rarity: 'epico',
    price: 500,
    icon: '🛡️',
    bonus: { constituicao: 6, destreza: -1 }
  },
  {
    id: 'armadura-couro-tachas',
    name: 'Armadura de Couro com Tachas',
    description: 'Couro reforçado com tachas metálicas. +3 Constituição, +1 Destreza',
    type: 'armor',
    rarity: 'raro',
    price: 180,
    icon: '🦺',
    bonus: { constituicao: 3, destreza: 1 }
  },
  {
    id: 'gibao-elfico',
    name: 'Gibão Élfico',
    description: 'Armadura élfica leve e flexível. +2 Constituição, +3 Destreza',
    type: 'armor',
    rarity: 'epico',
    price: 420,
    icon: '🦺',
    bonus: { constituicao: 2, destreza: 3 }
  },

  // === ACESSÓRIOS ===
  {
    id: 'anel-forca',
    name: 'Anel da Força',
    description: 'Anel mágico que aumenta a força física. +2 Força',
    type: 'accessory',
    rarity: 'raro',
    price: 150,
    icon: '💍',
    bonus: { forca: 2 }
  },
  {
    id: 'amuleto-sabedoria',
    name: 'Amuleto da Sabedoria',
    description: 'Amuleto élfico que clareia a mente. +3 Sabedoria',
    type: 'accessory',
    rarity: 'raro',
    price: 180,
    icon: '🔮',
    bonus: { sabedoria: 3 }
  },
  {
    id: 'colar-carisma',
    name: 'Colar do Carisma',
    description: 'Joia encantada que aumenta o charme. +3 Carisma',
    type: 'accessory',
    rarity: 'epico',
    price: 300,
    icon: '📿',
    bonus: { carisma: 3 }
  },
  {
    id: 'aljava-encantada',
    name: 'Aljava Encantada',
    description: 'Aljava mágica que melhora a precisão. +2 Destreza, +1 Sabedoria',
    type: 'accessory',
    rarity: 'raro',
    price: 200,
    icon: '🏹',
    bonus: { destreza: 2, sabedoria: 1 }
  },
  {
    id: 'bracadeira-arqueiro',
    name: 'Braçadeira do Arqueiro',
    description: 'Proteção para o braço que saca a corda. +3 Destreza',
    type: 'accessory',
    rarity: 'raro',
    price: 160,
    icon: '🛡️',
    bonus: { destreza: 3 }
  },
  {
    id: 'anel-precisao',
    name: 'Anel da Precisão',
    description: 'Anel que aprimora a mira. +2 Destreza, +1 Inteligência',
    type: 'accessory',
    rarity: 'epico',
    price: 280,
    icon: '💍',
    bonus: { destreza: 2, inteligencia: 1 }
  },

  // === COSMÉTICOS ===
  {
    id: 'capa-vermelha',
    name: 'Capa Vermelha',
    description: 'Capa elegante de cor carmesim. Puramente cosmética.',
    type: 'cosmetic',
    rarity: 'comum',
    price: 50,
    icon: '🧥'
  },
  {
    id: 'coroa-ouro',
    name: 'Coroa de Ouro',
    description: 'Coroa dourada para verdadeiros líderes. Cosmética.',
    type: 'cosmetic',
    rarity: 'lendario',
    price: 1000,
    icon: '👑'
  },
  {
    id: 'mascara-sombras',
    name: 'Máscara das Sombras',
    description: 'Máscara misteriosa para heróis discretos. Cosmética.',
    type: 'cosmetic',
    rarity: 'epico',
    price: 200,
    icon: '🎭'
  }
];

// === CATEGORIAS DA LOJA ===

export const SHOP_CATEGORIES = {
  consumables: {
    name: 'Consumíveis',
    icon: '🧪',
    items: SHOP_ITEMS.filter(item => item.type === 'consumable')
  },
  weapons: {
    name: 'Armas',
    icon: '⚔️',
    items: SHOP_ITEMS.filter(item => item.type === 'weapon')
  },
  armor: {
    name: 'Armaduras',
    icon: '🛡️',
    items: SHOP_ITEMS.filter(item => item.type === 'armor')
  },
  accessories: {
    name: 'Acessórios',
    icon: '💍',
    items: SHOP_ITEMS.filter(item => item.type === 'accessory')
  },
  cosmetics: {
    name: 'Cosméticos',
    icon: '👑',
    items: SHOP_ITEMS.filter(item => item.type === 'cosmetic')
  }
};

// === SISTEMA DE RARIDADE E CORES ===

export const RARITY_CONFIG = {
  comum: {
    color: '#9CA3AF', // Gray
    bgColor: '#F3F4F6',
    multiplier: 1.0
  },
  raro: {
    color: '#3B82F6', // Blue
    bgColor: '#EFF6FF',
    multiplier: 1.5
  },
  epico: {
    color: '#8B5CF6', // Purple
    bgColor: '#F5F3FF',
    multiplier: 2.0
  },
  lendario: {
    color: '#F59E0B', // Amber
    bgColor: '#FFFBEB',
    multiplier: 3.0
  }
};

// === FUNÇÕES DE COMPRA ===

export interface PurchaseResult {
  success: boolean;
  message: string;
  newGold?: number;
  item?: Item;
}

export function canAfford(hero: Hero, item: Item): boolean {
  return hero.progression.gold >= item.price;
}

export function purchaseItem(hero: Hero, itemId: string): PurchaseResult {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  
  if (!item) {
    return {
      success: false,
      message: 'Item não encontrado na loja!'
    };
  }
  
  if (!canAfford(hero, item)) {
    return {
      success: false,
      message: `Ouro insuficiente! Você precisa de ${item.price} ouro, mas tem apenas ${hero.progression.gold}.`
    };
  }
  
  // Verificar se já possui o item (para equipamentos únicos)
  if (item.type !== 'consumable') {
    const currentQuantity = hero.inventory.items[itemId] || 0;
    if (currentQuantity > 0 && (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory')) {
      return {
        success: false,
        message: 'Você já possui este equipamento!'
      };
    }
  }
  
  return {
    success: true,
    message: `${item.name} comprado com sucesso!`,
    newGold: hero.progression.gold - item.price,
    item
  };
}

// === SISTEMA DE VENDA ===

export function sellItem(hero: Hero, itemId: string, quantity: number = 1): PurchaseResult {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  const currentQuantity = hero.inventory.items[itemId] || 0;
  
  if (!item) {
    return {
      success: false,
      message: 'Item não encontrado!'
    };
  }
  
  if (currentQuantity < quantity) {
    return {
      success: false,
      message: `Você não possui ${quantity}x ${item.name}!`
    };
  }
  
  // Preço de venda é 60% do preço de compra
  const sellPrice = Math.floor(item.price * 0.6 * quantity);
  
  return {
    success: true,
    message: `${quantity}x ${item.name} vendido por ${sellPrice} ouro!`,
    newGold: hero.progression.gold + sellPrice,
    item
  };
}

// === SISTEMA DE EQUIPAMENTOS ===

export function equipItem(hero: Hero, itemId: string): { success: boolean; message: string } {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  const hasItem = (hero.inventory.items[itemId] || 0) > 0;
  
  if (!item || !hasItem) {
    return {
      success: false,
      message: 'Você não possui este item!'
    };
  }
  
  if (item.type === 'consumable' || item.type === 'cosmetic') {
    return {
      success: false,
      message: 'Este item não pode ser equipado!'
    };
  }
  
  // Verificar se já tem algo equipado no slot
  let currentEquipped: string | undefined;
  let slotName: string;
  
  switch (item.type) {
    case 'weapon':
      currentEquipped = hero.inventory.equippedWeapon;
      slotName = 'arma';
      break;
    case 'armor':
      currentEquipped = hero.inventory.equippedArmor;
      slotName = 'armadura';
      break;
    case 'accessory':
      currentEquipped = hero.inventory.equippedAccessory;
      slotName = 'acessório';
      break;
    default:
      return {
        success: false,
        message: 'Tipo de item inválido!'
      };
  }
  
  let message = `${item.name} equipado como ${slotName}!`;
  
  if (currentEquipped) {
    const currentItem = SHOP_ITEMS.find(i => i.id === currentEquipped);
    message += ` ${currentItem?.name} foi desequipado.`;
  }
  
  return {
    success: true,
    message
  };
}

// === SISTEMA DE USO DE CONSUMÍVEIS ===

export function useConsumable(hero: Hero, itemId: string): { success: boolean; message: string; effects?: any } {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  const hasItem = (hero.inventory.items[itemId] || 0) > 0;
  
  if (!item || !hasItem) {
    return {
      success: false,
      message: 'Você não possui este item!'
    };
  }
  
  if (item.type !== 'consumable') {
    return {
      success: false,
      message: 'Este item não pode ser usado!'
    };
  }
  
  let message = `${item.name} usado!`;
  const effects: any = {};
  
  // Aplicar efeitos
  if (item.effects?.hp) {
    const currentHp = hero.derivedAttributes.currentHp || hero.derivedAttributes.hp;
    const newHp = Math.min(hero.derivedAttributes.hp, currentHp + item.effects.hp);
    effects.hp = newHp;
    message += ` +${item.effects.hp} HP`;
  }
  
  if (item.effects?.mp) {
    const currentMp = hero.derivedAttributes.currentMp || hero.derivedAttributes.mp;
    const newMp = Math.min(hero.derivedAttributes.mp, currentMp + item.effects.mp);
    effects.mp = newMp;
    message += ` +${item.effects.mp} MP`;
  }
  
  if (item.id === 'pergaminho-xp') {
    effects.xp = 50;
    message += ` +50 XP`;
  }
  
  return {
    success: true,
    message,
    effects
  };
}

// === OFERTAS ESPECIAIS E ROTAÇÃO ===

export function getDailyOffers(): Item[] {
  // Simular ofertas diárias baseadas na data
  const today = new Date().toDateString();
  const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Usar seed para gerar ofertas consistentes por dia
  const rng = () => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };
  
  const offers: Item[] = [];
  const availableItems = SHOP_ITEMS.filter(item => item.rarity !== 'lendario');
  
  // 3 ofertas diárias com desconto
  for (let i = 0; i < 3; i++) {
    const index = Math.floor(rng() * availableItems.length);
    const item = { ...availableItems[index] };
    item.price = Math.floor(item.price * 0.8); // 20% de desconto
    offers.push(item);
  }
  
  return offers;
}

// === SISTEMA DE REPUTAÇÃO E DESCONTOS ===

export function getReputationDiscount(reputation: number): number {
  if (reputation >= 1000) return 0.15; // 15% desconto
  if (reputation >= 500) return 0.10;  // 10% desconto
  if (reputation >= 200) return 0.05;  // 5% desconto
  return 0;
}

export function getDiscountedPrice(item: Item, hero: Hero): number {
  const discount = getReputationDiscount(hero.progression.reputation);
  return Math.floor(item.price * (1 - discount));
}