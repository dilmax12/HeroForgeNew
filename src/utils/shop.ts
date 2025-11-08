/**
 * Sistema de Loja e Economia
 */

import { Item, Hero } from '../types/hero';

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

  // Expansão de consumíveis
  {
    id: 'elixir-agilidade',
    name: 'Elixir de Agilidade',
    description: '+2 Destreza por 60 minutos',
    type: 'consumable',
    rarity: 'raro',
    price: 100,
    icon: '💨',
    bonus: { destreza: 2 },
    effects: { duration: 60 }
  },
  {
    id: 'elixir-intelecto',
    name: 'Elixir de Intelecto',
    description: '+2 Inteligência por 60 minutos',
    type: 'consumable',
    rarity: 'raro',
    price: 100,
    icon: '🧠',
    bonus: { inteligencia: 2 },
    effects: { duration: 60 }
  },
  {
    id: 'pocao-mana-grande',
    name: 'Poção de Mana Grande',
    description: 'Restaura 100 MP instantaneamente',
    type: 'consumable',
    rarity: 'epico',
    price: 160,
    icon: '🔮',
    effects: { mp: 100 }
  },
  {
    id: 'pergaminho-fortuna',
    name: 'Pergaminho de Fortuna',
    description: 'Aumenta ganho de ouro em 10% por 30 minutos',
    type: 'consumable',
    rarity: 'raro',
    price: 120,
    icon: '📜',
    effects: { duration: 30 }
  },

  // === ARMAS ===
  {
    id: 'espada-aprendiz',
    name: 'Espada de Aprendiz',
    description: 'Lâmina leve para iniciantes. +3 Força, +1 Destreza',
    type: 'weapon',
    rarity: 'comum',
    price: 80,
    icon: '🗡️',
    bonus: { forca: 3, destreza: 1 }
  },
  {
    id: 'machado-rustico',
    name: 'Machado Rústico',
    description: 'Pesado e bruto. +4 Força, -1 Destreza',
    type: 'weapon',
    rarity: 'comum',
    price: 100,
    icon: '🪓',
    bonus: { forca: 4, destreza: -1 }
  },
  {
    id: 'arco-simples',
    name: 'Arco Simples',
    description: 'Arco de treino. +3 Destreza (alcance duplo)',
    type: 'weapon',
    rarity: 'comum',
    price: 90,
    icon: '🏹',
    bonus: { destreza: 3 }
  },
  {
    id: 'lamina-viajante',
    name: 'Lâmina do Viajante',
    description: 'Edição limitada. +4 Força, +1 Destreza',
    type: 'weapon',
    rarity: 'raro',
    price: 180,
    icon: '🗡️',
    bonus: { forca: 4, destreza: 1 }
  },
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
    id: 'peitoral-couro-leve',
    name: 'Peitoral de Couro Leve',
    description: 'Proteção ágil. +2 Constituição, +1 Destreza',
    type: 'armor',
    rarity: 'comum',
    price: 75,
    icon: '🛡️',
    bonus: { constituicao: 2, destreza: 1 }
  },
  {
    id: 'tunica-estudioso',
    name: 'Túnica do Estudioso',
    description: 'Favorece o estudo arcano. +1 Constituição, +2 Inteligência',
    type: 'armor',
    rarity: 'comum',
    price: 70,
    icon: '🪶',
    bonus: { constituicao: 1, inteligencia: 2 }
  },
  {
    id: 'armadura-novato',
    name: 'Armadura do Novato',
    description: 'Proteção básica para quem está começando. +3 Constituição',
    type: 'armor',
    rarity: 'comum',
    price: 100,
    icon: '🥋',
    bonus: { constituicao: 3 }
  },
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
  {
    id: 'anel-aventureiro',
    name: 'Anel do Aventureiro',
    description: '+5% XP recebido (temático)',
    type: 'accessory',
    rarity: 'raro',
    price: 120,
    icon: '💍'
  },
  {
    id: 'pingente-sorte',
    name: 'Pingente da Sorte',
    description: 'Chance de evitar armadilhas em masmorras',
    type: 'accessory',
    rarity: 'raro',
    price: 150,
    icon: '📿'
  },
  {
    id: 'brincos-eco',
    name: 'Brincos do Eco',
    description: '+1 em todos os atributos por 10 minutos',
    type: 'accessory',
    rarity: 'epico',
    price: 200,
    icon: '🔔',
    bonus: { forca: 1, destreza: 1, constituicao: 1, inteligencia: 1, sabedoria: 1, carisma: 1 },
    effects: { duration: 10 }
  },
  {
    id: 'amuleto-brisa',
    name: 'Amuleto da Brisa',
    description: '+2 Defesa Mágica / +10% velocidade em masmorras (temático)',
    type: 'accessory',
    rarity: 'raro',
    price: 120,
    icon: '🪶'
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
  ,
  // Molduras e fundos temáticos
  {
    id: 'moldura-dourada',
    name: 'Moldura Dourada',
    description: 'Visual desbloqueável por XP (temático)',
    type: 'cosmetic',
    rarity: 'raro',
    price: 300,
    icon: '🟨'
  },
  {
    id: 'moldura-real',
    name: 'Moldura Real',
    description: 'Visual de prestígio por rank (temático)',
    type: 'cosmetic',
    rarity: 'epico',
    price: 600,
    icon: '👑'
  },
  {
    id: 'fundo-aurora',
    name: 'Fundo Aurora',
    description: 'Visual por reputação (temático)',
    type: 'cosmetic',
    rarity: 'raro',
    price: 350,
    icon: '🌌'
  },

  // === MATERIAIS / NÚCLEOS DE MANA ===
  {
    id: 'nucleo-mana-menor',
    name: 'Núcleo Menor de Mana',
    description: 'Essência bruta para forjas e encantamentos. Não consumível.',
    type: 'material',
    rarity: 'comum',
    price: 40,
    icon: '🔷',
    
  },
  {
    id: 'nucleo-mana',
    name: 'Núcleo de Mana',
    description: 'Núcleo usado em encantamentos e forjas. Não consumível.',
    type: 'material',
    rarity: 'raro',
    price: 90,
    icon: '🔷',
    
  },
  {
    id: 'nucleo-mana-raro',
    name: 'Núcleo Raro de Mana',
    description: 'Núcleo refinado para obras complexas. Não consumível.',
    type: 'material',
    rarity: 'epico',
    price: 220,
    icon: '🔷',
    
  },
  {
    id: 'nucleo-ancestral',
    name: 'Núcleo Ancestral',
    description: 'Núcleo lendário usado em obras-primas. Não consumível.',
    type: 'material',
    rarity: 'lendario',
    price: 500,
    icon: '🔶',
    
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
  // Categoria de materiais oculta na loja; núcleos devem ser vendidos à guilda
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

export type ItemPrefix = 'Flamejante' | 'do Caçador' | 'dos Ecos' | 'Gélido' | 'Trovejante';
export type ItemSuffix = 'da Rapidez' | 'da Fúria' | 'da Precisão' | 'do Guardião';

export interface ProceduralItem {
  id: string;
  name: string;
  baseType: 'espada' | 'arco' | 'cajado' | 'machado';
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  sockets?: number;
  bonus?: Partial<HeroAttributes>;
  elementOverride?: Element;
}

export function generateProceduralItem(seed: number, luck = 0): ProceduralItem {
  const bases: ProceduralItem['baseType'][] = ['espada', 'arco', 'cajado', 'machado'];
  const baseType = bases[seed % bases.length];
  const prefixes: ItemPrefix[] = ['Flamejante', 'do Caçador', 'dos Ecos', 'Gélido', 'Trovejante'];
  const suffixes: ItemSuffix[] = ['da Rapidez', 'da Fúria', 'da Precisão', 'do Guardião'];
  const prefix = prefixes[(seed + 1) % prefixes.length];
  const suffix = suffixes[(seed + 2) % suffixes.length];
  const rarityRoll = (seed % 100) + luck;
  const rarity: ProceduralItem['rarity'] = rarityRoll > 90 ? 'lendario' : rarityRoll > 70 ? 'epico' : rarityRoll > 40 ? 'raro' : 'comum';
  const sockets = rarity === 'lendario' ? 3 : rarity === 'epico' ? 2 : rarity === 'raro' ? 1 : 0;
  const elementOverride: Element | undefined = prefix === 'Flamejante' ? 'fire' : prefix === 'Gélido' ? 'ice' : prefix === 'Trovejante' ? 'thunder' : undefined;
  const bonus = { forca: baseType === 'espada' ? 2 : 0, destreza: baseType === 'arco' ? 2 : 0, inteligencia: baseType === 'cajado' ? 2 : 0 };
  return { id: crypto.randomUUID(), name: `${baseType} ${prefix} ${suffix}`, baseType, rarity, sockets, bonus, elementOverride };
}
