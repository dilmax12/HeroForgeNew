/**
 * Sistema de Loja e Economia
 */

import { Item, Hero, HeroAttributes } from '../types/hero';
import { RankLevel } from '../types/ranks';

// === CATÁLOGO DE ITENS DA LOJA ===

export const SHOP_ITEMS: Item[] = [
  // === ITENS NARRATIVOS (ARTEFATOS) ===
  {
    id: 'orbe-amaldicoado',
    name: 'Orbe Amaldiçoado',
    description: 'Artefato sombrio que exala energia maligna. Não consumível.',
    type: 'material',
    rarity: 'epico',
    price: 500,
    icon: '🕳️',
    currency: 'arcaneEssence'
  },
  {
    id: 'orbe-purificado',
    name: 'Orbe Purificado',
    description: 'Artefato purificado por magia sagrada. Não consumível.',
    type: 'material',
    rarity: 'raro',
    price: 480,
    icon: '🔮',
    currency: 'glory'
  },
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
    id: 'contrato-montaria',
    name: 'Contrato de Estábulo',
    description: 'Permite recrutar uma montaria aleatória.',
    type: 'consumable',
    rarity: 'raro',
    price: 300,
    icon: '📜'
  },
  {
    id: 'kit-montaria',
    name: 'Kit de Montaria',
    description: 'Pacote com itens para montar e evoluir: contrato, pergaminho, essência bestial e pedra mágica.',
    type: 'bundle',
    rarity: 'raro',
    price: 950,
    icon: '🎁'
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
  // === Mascotes: Itens de Câmara de Eclosão ===
  {
    id: 'essencia-calor',
    name: 'Essência de Calor',
    description: 'Acelera a incubação de ovos em 15 minutos.',
    type: 'consumable',
    rarity: 'comum',
    price: 35,
    icon: '🔥'
  },
  {
    id: 'brasas-magicas',
    name: 'Brasas Mágicas',
    description: 'Acelera a incubação de ovos em 1 hora.',
    type: 'consumable',
    rarity: 'raro',
    price: 120,
    icon: '♨️'
  },
  {
    id: 'pedra-alma',
    name: 'Pedra de Alma',
    description: 'Canaliza energia para evolução de mascotes (+300 XP).',
    type: 'consumable',
    rarity: 'epico',
    price: 200,
    icon: '🪨'
  },
  {
    id: 'racao-basica',
    name: 'Ração Básica de Mascote',
    description: '+50 XP para mascotes ao alimentar.',
    type: 'consumable',
    rarity: 'comum',
    price: 30,
    icon: '🍖'
  },
  {
    id: 'racao-deluxe',
    name: 'Ração Deluxe de Mascote',
    description: '+150 XP para mascotes ao alimentar.',
    type: 'consumable',
    rarity: 'raro',
    price: 90,
    icon: '🍗'
  },
  {
    id: 'essencia-vinculo',
    name: 'Essência de Vínculo',
    description: 'Aprimora o vínculo com o mascote, aumentando seus bônus em 1%.',
    type: 'consumable',
    rarity: 'raro',
    price: 140,
    icon: '🔗'
  },
  {
    id: 'tonico-companheiro',
    name: 'Tônico do Companheiro',
    description: 'Restaura 50 de energia do mascote ativo.',
    type: 'consumable',
    rarity: 'raro',
    price: 120,
    icon: '⚡'
  },
  {
    id: 'tonico-descanso',
    name: 'Tônico de Descanso',
    description: 'Reduz 20 pontos de Fadiga imediatamente',
    type: 'consumable',
    rarity: 'comum',
    price: 35,
    icon: '☕',
    effects: { fatigue: 20 }
  },
  {
    id: 'elixir-vigor',
    name: 'Elixir de Vigor',
    description: 'Reduz 40 pontos de Fadiga imediatamente',
    type: 'consumable',
    rarity: 'raro',
    price: 95,
    icon: '⚗️',
    effects: { fatigue: 40 }
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
    bonus: { forca: 3, destreza: 1 },
    slot: 'mainHand'
  },
  {
    id: 'machado-rustico',
    name: 'Machado Rústico',
    description: 'Pesado e bruto. +4 Força, -1 Destreza',
    type: 'weapon',
    rarity: 'comum',
    price: 100,
    icon: '🪓',
    bonus: { forca: 4, destreza: -1 },
    slot: 'mainHand'
  },
  {
    id: 'arco-simples',
    name: 'Arco Simples',
    description: 'Arco de treino. +3 Destreza (alcance duplo)',
    type: 'weapon',
    rarity: 'comum',
    price: 90,
    icon: '🏹',
    bonus: { destreza: 3 },
    slot: 'mainHand'
  },
  {
    id: 'lamina-viajante',
    name: 'Lâmina do Viajante',
    description: 'Edição limitada. +4 Força, +1 Destreza',
    type: 'weapon',
    rarity: 'raro',
    price: 180,
    icon: '🗡️',
    bonus: { forca: 4, destreza: 1 },
    slot: 'mainHand'
  },
  {
    id: 'escudo-madeira',
    name: 'Escudo de Madeira',
    description: 'Proteção simples para a mão secundária. +2 Constituição',
    type: 'weapon',
    rarity: 'comum',
    price: 90,
    icon: '🛡️',
    bonus: { constituicao: 2 },
    slot: 'offHand'
  },
  {
    id: 'adaga-leve',
    name: 'Adaga Leve',
    description: 'Perfeita para mão secundária. +2 Destreza',
    type: 'weapon',
    rarity: 'comum',
    price: 85,
    icon: '🗡️',
    bonus: { destreza: 2 },
    slot: 'offHand'
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
    bonus: { inteligencia: 4, sabedoria: 2 },
    currency: 'arcaneEssence',
    setId: 'arcanista'
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
    bonus: { destreza: 5, sabedoria: 2 },
    currency: 'glory',
    setId: 'elfico'
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

  // === ARREMESSO DO FORJADOR: NOVAS ARMAS ===
  {
    id: 'lanca-guarda',
    name: 'Lança da Guarda',
    description: 'Leve e resistente, usada pelos sentinelas da cidade. +3 Força, +1 Constituição',
    type: 'weapon',
    rarity: 'comum',
    price: 110,
    icon: '🗡️',
    bonus: { forca: 3, constituicao: 1 }
  },
  {
    id: 'machado-ferro',
    name: 'Machado de Ferro',
    description: 'Perfeito para quem confia mais na força que na técnica. +4 Força',
    type: 'weapon',
    rarity: 'comum',
    price: 120,
    icon: '🪓',
    bonus: { forca: 4 }
  },
  {
    id: 'espada-flamejante',
    name: 'Espada Flamejante',
    description: 'Brilha como um sol em batalha. Chance temática de causar dano de fogo.',
    type: 'weapon',
    rarity: 'raro',
    price: 280,
    icon: '🔥',
    bonus: { forca: 5 }
  },
  {
    id: 'martelo-guerra',
    name: 'Martelo de Guerra',
    description: 'Seu impacto ecoa como trovão. +6 Força, +3 Constituição',
    type: 'weapon',
    rarity: 'epico',
    price: 520,
    icon: '🔨',
    bonus: { forca: 6, constituicao: 3 },
    currency: 'glory'
  },
  {
    id: 'katana-vento',
    name: 'Katana do Vento',
    description: 'A lâmina canta ao cortar o ar. +4 Força, +5 Destreza',
    type: 'weapon',
    rarity: 'epico',
    price: 540,
    icon: '🗡️',
    bonus: { forca: 4, destreza: 5 },
    currency: 'glory'
  },
  {
    id: 'lanca-aurora',
    name: 'Lança da Aurora',
    description: 'Símbolo dos cavaleiros celestiais. +6 Força, +2 Sabedoria (sagrado)',
    type: 'weapon',
    rarity: 'epico',
    price: 560,
    icon: '🗡️',
    bonus: { forca: 6, sabedoria: 2 },
    currency: 'glory',
    setId: 'aurora'
  },
  {
    id: 'espada-ultimo-heroi',
    name: 'Espada do Último Herói',
    description: 'Forjada nas chamas do destino. Bônus temático de crítico/XP.',
    type: 'weapon',
    rarity: 'lendario',
    price: 1200,
    icon: '⚔️',
    bonus: { forca: 8, carisma: 2 },
    currency: 'arcaneEssence',
    setId: 'eterno'
  },

  // === ARMAS — LISTA CURADA ===
  // Guerreiro / Gladiador
  {
    id: 'espada-longa-ferro',
    name: 'Espada Longa de Ferro',
    description: 'Básica e confiável. +3 Força',
    type: 'weapon',
    rarity: 'comum',
    price: 100,
    icon: '⚔️',
    bonus: { forca: 3 }
  },
  {
    id: 'montante-aco',
    name: 'Montante de Aço',
    description: 'Duas mãos; alto dano, mais lenta. +6 Força, -1 Destreza',
    type: 'weapon',
    rarity: 'raro',
    price: 280,
    icon: '⚔️',
    bonus: { forca: 6, destreza: -1 }
  },
  {
    id: 'machado-guerra',
    name: 'Machado de Guerra',
    description: 'Feito para quebrar defesas. +5 Força, -1 Destreza',
    type: 'weapon',
    rarity: 'raro',
    price: 260,
    icon: '🪓',
    bonus: { forca: 5, destreza: -1 }
  },
  {
    id: 'lanca-gladiador',
    name: 'Lança do Gladiador',
    description: 'Alcance longo e preciso. +4 Força, +1 Destreza',
    type: 'weapon',
    rarity: 'raro',
    price: 240,
    icon: '🗡️',
    bonus: { forca: 4, destreza: 1 }
  },
  {
    id: 'montante-flamejante',
    name: 'Montante Flamejante',
    description: 'Lendária; emite chamas ao atacar. +8 Força',
    type: 'weapon',
    rarity: 'lendario',
    price: 1300,
    icon: '🔥',
    bonus: { forca: 8 },
    currency: 'arcaneEssence'
  },
  // Assassino / Ladino
  {
    id: 'adagas-gemeas',
    name: 'Adagas Gêmeas',
    description: 'Rápidas; ideais para críticos. +4 Destreza, +1 Força',
    type: 'weapon',
    rarity: 'raro',
    price: 230,
    icon: '🗡️',
    bonus: { destreza: 4, forca: 1 }
  },
  {
    id: 'katar-sombrio',
    name: 'Katar Sombrio',
    description: 'Perfura armaduras leves. +5 Destreza, -1 Constituição',
    type: 'weapon',
    rarity: 'raro',
    price: 260,
    icon: '🗡️',
    bonus: { destreza: 5, constituicao: -1 }
  },
  {
    id: 'lamina-nevoa',
    name: 'Lâmina de Névoa',
    description: 'A névoa envolve o portador. +4 Destreza, +2 Sabedoria',
    type: 'weapon',
    rarity: 'epico',
    price: 420,
    icon: '🌫️',
    bonus: { destreza: 4, sabedoria: 2 }
  },
  {
    id: 'laminas-ocultas',
    name: 'Lâminas Ocultas',
    description: 'Lendárias; chance de ataque duplo. +6 Destreza, +2 Força',
    type: 'weapon',
    rarity: 'lendario',
    price: 1150,
    icon: '🗡️',
    bonus: { destreza: 6, forca: 2 },
    currency: 'arcaneEssence'
  },
  {
    id: 'espadas-curtas-duplas',
    name: 'Espadas Curtas Duplas',
    description: 'Equilíbrio entre velocidade e dano. +4 Destreza, +2 Força',
    type: 'weapon',
    rarity: 'raro',
    price: 240,
    icon: '🗡️',
    bonus: { destreza: 4, forca: 2 }
  },
  // Mago / Feiticeiro
  {
    id: 'cajado-carvalho',
    name: 'Cajado de Carvalho',
    description: 'Básico; canaliza magia elemental. +2 Inteligência',
    type: 'weapon',
    rarity: 'comum',
    price: 90,
    icon: '🪄',
    bonus: { inteligencia: 2 }
  },
  {
    id: 'cajado-cristal',
    name: 'Cajado de Cristal',
    description: 'Amplifica feitiços de gelo. +3 Inteligência, +1 Sabedoria',
    type: 'weapon',
    rarity: 'raro',
    price: 260,
    icon: '🔮',
    bonus: { inteligencia: 3, sabedoria: 1 }
  },
  {
    id: 'cajado-arcano',
    name: 'Cajado Arcano',
    description: 'Runas aceleram conjuração. +4 Inteligência',
    type: 'weapon',
    rarity: 'epico',
    price: 420,
    icon: '🪄',
    bonus: { inteligencia: 4 }
  },
  {
    id: 'cajado-vortice',
    name: 'Cajado do Vórtice',
    description: 'Dano mágico em área. +5 Inteligência, +2 Sabedoria',
    type: 'weapon',
    rarity: 'epico',
    price: 560,
    icon: '🌀',
    bonus: { inteligencia: 5, sabedoria: 2 },
    currency: 'glory'
  },
  {
    id: 'cetro-almas',
    name: 'Cetro das Almas',
    description: 'Lendário; regenera mana ao causar dano. +3 Sabedoria, +4 Inteligência',
    type: 'weapon',
    rarity: 'lendario',
    price: 1200,
    icon: '🪄',
    bonus: { sabedoria: 3, inteligencia: 4 },
    currency: 'arcaneEssence'
  },
  // Clérigo / Sacerdote
  {
    id: 'cajado-luz',
    name: 'Cajado da Luz',
    description: 'Básico; concede magias de cura. +2 Sabedoria, +1 Constituição',
    type: 'weapon',
    rarity: 'comum',
    price: 90,
    icon: '✨',
    bonus: { sabedoria: 2, constituicao: 1 }
  },
  {
    id: 'cajado-fe-duas-maos',
    name: 'Cajado de Duas Mãos da Fé',
    description: 'Amplia bênçãos. +3 Sabedoria, +1 Constituição',
    type: 'weapon',
    rarity: 'raro',
    price: 240,
    icon: '🪄',
    bonus: { sabedoria: 3, constituicao: 1 }
  },
  {
    id: 'maca-devoto',
    name: 'Maça do Devoto',
    description: 'Aumenta cura e resistência. +2 Força, +2 Sabedoria',
    type: 'weapon',
    rarity: 'raro',
    price: 250,
    icon: '🔨',
    bonus: { forca: 2, sabedoria: 2 }
  },
  {
    id: 'cajado-divino',
    name: 'Cajado Divino',
    description: 'Chance de curar aliados ao atacar. +4 Sabedoria, +2 Constituição',
    type: 'weapon',
    rarity: 'epico',
    price: 520,
    icon: '✨',
    bonus: { sabedoria: 4, constituicao: 2 },
    currency: 'glory'
  },
  {
    id: 'reliquia-sagrada',
    name: 'Relíquia Sagrada',
    description: 'Aura protetora. +3 Sabedoria, +3 Constituição',
    type: 'weapon',
    rarity: 'lendario',
    price: 1100,
    icon: '⛪',
    bonus: { sabedoria: 3, constituicao: 3 },
    currency: 'arcaneEssence'
  },
  // Bardo
  {
    id: 'alaude-carvalho',
    name: 'Alaúde de Carvalho',
    description: 'Básico; melhora a moral do grupo. +1 Carisma, +1 Sabedoria',
    type: 'weapon',
    rarity: 'comum',
    price: 80,
    icon: '🎸',
    bonus: { carisma: 1, sabedoria: 1 }
  },
  {
    id: 'alaude-cristal',
    name: 'Alaúde de Cristal',
    description: 'Amplifica habilidades musicais. +2 Carisma, +2 Sabedoria',
    type: 'weapon',
    rarity: 'raro',
    price: 220,
    icon: '🎸',
    bonus: { carisma: 2, sabedoria: 2 }
  },
  {
    id: 'harpa-prata',
    name: 'Harpa de Prata',
    description: 'Magia sonora de cura e buffs. +2 Sabedoria, +2 Carisma',
    type: 'weapon',
    rarity: 'epico',
    price: 420,
    icon: '🎵',
    bonus: { sabedoria: 2, carisma: 2 }
  },
  {
    id: 'tambor-guerra',
    name: 'Tambor de Guerra',
    description: 'Bônus de ataque e defesa em grupo. +3 Carisma, +2 Constituição',
    type: 'weapon',
    rarity: 'epico',
    price: 520,
    icon: '🥁',
    bonus: { carisma: 3, constituicao: 2 },
    currency: 'glory'
  },
  {
    id: 'alaude-lendas',
    name: 'Alaúde das Lendas',
    description: 'Lendário; multiplica inspiração. +4 Carisma, +3 Sabedoria',
    type: 'weapon',
    rarity: 'lendario',
    price: 1100,
    icon: '🎸',
    bonus: { carisma: 4, sabedoria: 3 },
    currency: 'arcaneEssence'
  },
  // Monge / Lanceiro
  {
    id: 'bastao-madeira',
    name: 'Bastão de Madeira',
    description: 'Básico; equilíbrio ataque/defesa. +2 Destreza, +1 Constituição',
    type: 'weapon',
    rarity: 'comum',
    price: 90,
    icon: '🥋',
    bonus: { destreza: 2, constituicao: 1 }
  },
  {
    id: 'lanca-vento',
    name: 'Lança do Vento',
    description: 'Ataques em área e longo alcance. +3 Destreza, +2 Constituição',
    type: 'weapon',
    rarity: 'raro',
    price: 260,
    icon: '🗡️',
    bonus: { destreza: 3, constituicao: 2 }
  },
  {
    id: 'naginata',
    name: 'Naginata',
    description: 'Arma híbrida; bônus em esquiva. +4 Destreza, +1 Força',
    type: 'weapon',
    rarity: 'raro',
    price: 280,
    icon: '🗡️',
    bonus: { destreza: 4, forca: 1 }
  },
  {
    id: 'punhos-ferro',
    name: 'Punhos de Ferro',
    description: 'Estilo corpo a corpo puro. +3 Destreza, +1 Força',
    type: 'weapon',
    rarity: 'comum',
    price: 120,
    icon: '👊',
    bonus: { destreza: 3, forca: 1 }
  },
  {
    id: 'bastao-dragao',
    name: 'Bastão do Dragão',
    description: 'Lendário; canaliza energia espiritual. +3 Destreza, +4 Sabedoria',
    type: 'weapon',
    rarity: 'lendario',
    price: 1200,
    icon: '🐲',
    bonus: { destreza: 3, sabedoria: 4 },
    currency: 'arcaneEssence'
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
    bonus: { constituicao: 2, destreza: 1 },
    slot: 'chest'
  },
  {
    id: 'tunica-estudioso',
    name: 'Túnica do Estudioso',
    description: 'Favorece o estudo arcano. +1 Constituição, +2 Inteligência',
    type: 'armor',
    rarity: 'comum',
    price: 70,
    icon: '🪶',
    bonus: { constituicao: 1, inteligencia: 2 },
    slot: 'chest'
  },
  {
    id: 'armadura-novato',
    name: 'Armadura do Novato',
    description: 'Proteção básica para quem está começando. +3 Constituição',
    type: 'armor',
    rarity: 'comum',
    price: 100,
    icon: '🥋',
    bonus: { constituicao: 3 },
    slot: 'chest'
  },
  {
    id: 'armadura-couro',
    name: 'Armadura de Couro',
    description: 'Proteção básica de couro curtido. +2 Constituição',
    type: 'armor',
    rarity: 'comum',
    price: 75,
    icon: '🦺',
    bonus: { constituicao: 2 },
    slot: 'chest'
  },
  {
    id: 'armadura-cota',
    name: 'Cota de Malha',
    description: 'Armadura de anéis entrelaçados. +4 Constituição',
    type: 'armor',
    rarity: 'raro',
    price: 200,
    icon: '🛡️',
    bonus: { constituicao: 4 },
    slot: 'chest'
  },
  {
    id: 'armadura-placas',
    name: 'Armadura de Placas',
    description: 'Proteção máxima em placas de aço. +6 Constituição, -1 Destreza',
    type: 'armor',
    rarity: 'epico',
    price: 500,
    icon: '🛡️',
    bonus: { constituicao: 6, destreza: -1 },
    slot: 'chest',
    currency: 'glory'
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
    bonus: { constituicao: 2, destreza: 3 },
    slot: 'chest'
    ,setId: 'elfico'
  },

  // === FORJADOR: NOVAS ARMADURAS ===
  {
    id: 'armadura-ferro',
    name: 'Armadura de Ferro',
    description: 'Padrão entre os guardas da cidade. +4 Constituição',
    type: 'armor',
    rarity: 'comum',
    price: 120,
    icon: '🛡️',
    bonus: { constituicao: 4 },
    slot: 'chest'
  },
  {
    id: 'manto-arcano',
    name: 'Manto Arcano',
    description: 'Bordado com símbolos antigos. +1 Constituição, +3 Inteligência',
    type: 'armor',
    rarity: 'raro',
    price: 220,
    icon: '🪄',
    bonus: { constituicao: 1, inteligencia: 3 },
    slot: 'cape',
    setId: 'arcanista'
  },
  {
    id: 'armadura-cacador',
    name: 'Armadura do Caçador',
    description: 'Perfeita para quem caça monstros nas sombras. +2 Constituição, +3 Destreza',
    type: 'armor',
    rarity: 'raro',
    price: 260,
    icon: '🦺',
    bonus: { constituicao: 2, destreza: 3 },
    slot: 'chest'
  },
  {
    id: 'armadura-escamas',
    name: 'Armadura de Escamas',
    description: 'Forjada a partir de escamas de draco. +4 Constituição, +2 Sabedoria',
    type: 'armor',
    rarity: 'raro',
    price: 320,
    icon: '🛡️',
    bonus: { constituicao: 4, sabedoria: 2 },
    slot: 'chest'
  },
  {
    id: 'cota-sagrada',
    name: 'Cota Sagrada',
    description: 'Imbuída com bênçãos divinas. +4 Constituição, +3 Sabedoria',
    type: 'armor',
    rarity: 'epico',
    price: 520,
    icon: '🛡️',
    bonus: { constituicao: 4, sabedoria: 3 },
    slot: 'chest',
    currency: 'glory',
    setId: 'aurora'
  },
  {
    id: 'armadura-cristal',
    name: 'Armadura de Cristal',
    description: 'Reflete tanto luz quanto feitiços. +5 Constituição, +3 Sabedoria',
    type: 'armor',
    rarity: 'epico',
    price: 560,
    icon: '🧿',
    bonus: { constituicao: 5, sabedoria: 3 },
    slot: 'chest',
    currency: 'glory'
  },
  {
    id: 'vestes-arcanista',
    name: 'Vestes do Arcanista',
    description: 'Brilha suavemente sob a lua. +2 Constituição, +6 Inteligência',
    type: 'armor',
    rarity: 'epico',
    price: 600,
    icon: '🪄',
    bonus: { constituicao: 2, inteligencia: 6 },
    slot: 'chest',
    currency: 'arcaneEssence',
    setId: 'arcanista'
  },
  {
    id: 'armadura-dragao-anciao',
    name: 'Armadura do Dragão Ancião',
    description: 'Forjada das escamas de um dragão lendário. Bônus temáticos de resistência e XP.',
    type: 'armor',
    rarity: 'lendario',
    price: 1400,
    icon: '🛡️',
    bonus: { constituicao: 8, sabedoria: 4 },
    slot: 'chest',
    currency: 'arcaneEssence',
    setId: 'eterno'
  },

  // === ARMADURAS — LISTA CURADA ===
  // Pesadas (Guerreiro, Gladiador)
  {
    id: 'armadura-couro-reforcado',
    name: 'Armadura de Couro Reforçado',
    description: 'Couro reforçado para iniciantes. +3 Constituição, +1 Destreza',
    type: 'armor',
    rarity: 'comum',
    price: 110,
    icon: '🦺',
    bonus: { constituicao: 3, destreza: 1 },
    slot: 'chest'
  },
  {
    id: 'cota-malha-abencoada',
    name: 'Cota de Malha Abençoada',
    description: 'Proteção com bênçãos leves. +4 Constituição, +1 Sabedoria',
    type: 'armor',
    rarity: 'raro',
    price: 280,
    icon: '🛡️',
    bonus: { constituicao: 4, sabedoria: 1 },
    slot: 'chest'
  },
  {
    id: 'platina-imperial',
    name: 'Platina Imperial',
    description: 'Placas imperiais. +6 Constituição, +1 Carisma',
    type: 'armor',
    rarity: 'epico',
    price: 560,
    icon: '🛡️',
    bonus: { constituicao: 6, carisma: 1 },
    slot: 'chest',
    currency: 'glory'
  },
  // Leves (Assassino, Bardo, Monge)
  {
    id: 'tunica-couro',
    name: 'Túnica de Couro',
    description: 'Leve e prática. +2 Constituição, +1 Destreza',
    type: 'armor',
    rarity: 'comum',
    price: 90,
    icon: '🦺',
    bonus: { constituicao: 2, destreza: 1 },
    slot: 'chest'
  },
  {
    id: 'roupa-sombras',
    name: 'Roupa das Sombras',
    description: 'Feita para discrição. +3 Destreza, +1 Inteligência',
    type: 'armor',
    rarity: 'raro',
    price: 240,
    icon: '🦺',
    bonus: { destreza: 3, inteligencia: 1 },
    slot: 'chest'
  },
  {
    id: 'traje-viajante',
    name: 'Traje do Viajante',
    description: 'Confortável para longas jornadas. +2 Destreza, +1 Constituição',
    type: 'armor',
    rarity: 'comum',
    price: 120,
    icon: '🦺',
    bonus: { destreza: 2, constituicao: 1 },
    slot: 'chest'
  },
  {
    id: 'veste-bardo-errante',
    name: 'Veste do Bardo Errante',
    description: 'Cativa multidões. +2 Destreza, +2 Carisma',
    type: 'armor',
    rarity: 'raro',
    price: 260,
    icon: '🪶',
    bonus: { destreza: 2, carisma: 2 },
    slot: 'chest'
  },
  {
    id: 'roupas-celestes-monge',
    name: 'Roupas Celestes do Monge',
    description: 'Lendária; leve e espiritual. +3 Destreza, +3 Sabedoria',
    type: 'armor',
    rarity: 'lendario',
    price: 900,
    icon: '🥋',
    bonus: { destreza: 3, sabedoria: 3 },
    slot: 'chest',
    currency: 'arcaneEssence'
  },
  // Místicas (Mago, Clérigo)
  {
    id: 'veste-arcana',
    name: 'Veste Arcana',
    description: 'Favorece o estudo arcano. +1 Constituição, +4 Inteligência',
    type: 'armor',
    rarity: 'raro',
    price: 300,
    icon: '🪄',
    bonus: { constituicao: 1, inteligencia: 4 },
    slot: 'chest'
  },
  {
    id: 'manto-seda-espiritual',
    name: 'Manto de Seda Espiritual',
    description: 'Sereno e protetor. +2 Sabedoria, +1 Constituição',
    type: 'armor',
    rarity: 'raro',
    price: 280,
    icon: '🪄',
    bonus: { sabedoria: 2, constituicao: 1 },
    slot: 'chest'
  },
  {
    id: 'tunica-sol',
    name: 'Túnica do Sol',
    description: 'Banho de luz. +2 Constituição, +4 Sabedoria',
    type: 'armor',
    rarity: 'epico',
    price: 520,
    icon: '🪄',
    bonus: { constituicao: 2, sabedoria: 4 },
    slot: 'chest',
    currency: 'glory'
  },
  {
    id: 'roupas-sabio-eterno',
    name: 'Roupas do Sábio Eterno',
    description: 'Sabedoria acumulada. +2 Constituição, +5 Inteligência',
    type: 'armor',
    rarity: 'epico',
    price: 560,
    icon: '🪄',
    bonus: { constituicao: 2, inteligencia: 5 },
    slot: 'chest',
    currency: 'glory'
  },
  {
    id: 'manto-eternidade',
    name: 'Manto da Eternidade',
    description: 'Lendário; protege contra o esquecimento. +3 Constituição, +6 Inteligência',
    type: 'armor',
    rarity: 'lendario',
    price: 1200,
    icon: '🪄',
    bonus: { constituicao: 3, inteligencia: 6 },
    slot: 'cape',
    currency: 'arcaneEssence'
  },

  // === NOVOS ITENS DE SLOT ESPECÍFICO ===
  {
    id: 'capacete-ferro',
    name: 'Capacete de Ferro',
    description: 'Protege a cabeça com firmeza. +1 Constituição',
    type: 'armor',
    rarity: 'comum',
    price: 90,
    icon: '🪖',
    bonus: { constituicao: 1 },
    slot: 'helm'
  },
  {
    id: 'elmo-guardiao',
    name: 'Elmo do Guardião',
    description: 'Bênçãos leves e proteção sólida. +2 Constituição, +1 Sabedoria',
    type: 'armor',
    rarity: 'raro',
    price: 220,
    icon: '🪖',
    bonus: { constituicao: 2, sabedoria: 1 },
    slot: 'helm'
  },
  {
    id: 'cinto-couro',
    name: 'Cinto de Couro',
    description: 'Suporte básico. +1 Destreza',
    type: 'armor',
    rarity: 'comum',
    price: 70,
    icon: '🧵',
    bonus: { destreza: 1 },
    slot: 'belt'
  },
  {
    id: 'cinto-gladiador',
    name: 'Cinto do Gladiador',
    description: 'Firmeza no centro. +2 Força',
    type: 'armor',
    rarity: 'raro',
    price: 180,
    icon: '🧶',
    bonus: { forca: 2 },
    slot: 'belt'
  },
  {
    id: 'luvas-couro',
    name: 'Luvas de Couro',
    description: 'Aprimora a pegada. +1 Destreza',
    type: 'armor',
    rarity: 'comum',
    price: 60,
    icon: '🧤',
    bonus: { destreza: 1 },
    slot: 'gloves'
  },
  {
    id: 'luvas-runicas',
    name: 'Luvas Rúnicas',
    description: 'Inscrições arcanas. +2 Destreza, +1 Inteligência',
    type: 'armor',
    rarity: 'epico',
    price: 320,
    icon: '🧤',
    bonus: { destreza: 2, inteligencia: 1 },
    slot: 'gloves'
  },
  {
    id: 'botas-caminhante',
    name: 'Botas do Caminhante',
    description: 'Confortáveis para longas viagens. +1 Destreza, +1 Constituição',
    type: 'armor',
    rarity: 'comum',
    price: 90,
    icon: '👢',
    bonus: { destreza: 1, constituicao: 1 },
    slot: 'boots'
  },
  {
    id: 'botas-velozes',
    name: 'Botas Velozes',
    description: 'Passos rápidos e precisos. +2 Destreza',
    type: 'armor',
    rarity: 'raro',
    price: 200,
    icon: '👢',
    bonus: { destreza: 2 },
    slot: 'boots'
  },
  {
    id: 'capa-iniciante',
    name: 'Capa do Iniciante',
    description: 'Proteção leve e estilo básico. +1 Destreza',
    type: 'armor',
    rarity: 'comum',
    price: 60,
    icon: '🧥',
    bonus: { destreza: 1 },
    slot: 'cape'
  },
  {
    id: 'capa-aventura',
    name: 'Capa da Aventura',
    description: 'Ideal para exploradores. +2 Destreza, +1 Constituição',
    type: 'armor',
    rarity: 'raro',
    price: 180,
    icon: '🧥',
    bonus: { destreza: 2, constituicao: 1 },
    slot: 'cape'
  },
  {
    id: 'capa-heroi',
    name: 'Capa do Herói',
    description: 'Ecoa histórias épicas. +3 Destreza, +2 Sabedoria',
    type: 'armor',
    rarity: 'epico',
    price: 420,
    icon: '🧥',
    bonus: { destreza: 3, sabedoria: 2 },
    slot: 'cape'
  },
  {
    id: 'asas-lendarias',
    name: 'Asas Lendárias',
    description: 'Voos míticos. +4 Destreza, +2 Inteligência, +1 Sabedoria',
    type: 'armor',
    rarity: 'lendario',
    price: 900,
    icon: '🪽',
    bonus: { destreza: 4, inteligencia: 2, sabedoria: 1 },
    slot: 'cape',
    currency: 'arcaneEssence'
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
    bonus: { forca: 2 },
    slot: 'ring'
  },
  {
    id: 'amuleto-sabedoria',
    name: 'Amuleto da Sabedoria',
    description: 'Amuleto élfico que clareia a mente. +3 Sabedoria',
    type: 'accessory',
    rarity: 'raro',
    price: 180,
    icon: '🔮',
    bonus: { sabedoria: 3 },
    slot: 'necklace',
    currency: 'arcaneEssence',
    setId: 'arcanista'
  },
  {
    id: 'colar-carisma',
    name: 'Colar do Carisma',
    description: 'Joia encantada que aumenta o charme. +3 Carisma',
    type: 'accessory',
    rarity: 'epico',
    price: 300,
    icon: '📿',
    bonus: { carisma: 3 },
    slot: 'necklace'
  },
  {
    id: 'aljava-encantada',
    name: 'Aljava Encantada',
    description: 'Aljava mágica que melhora a precisão. +2 Destreza, +1 Sabedoria',
    type: 'accessory',
    rarity: 'raro',
    price: 200,
    icon: '🏹',
    bonus: { destreza: 2, sabedoria: 1 },
    currency: 'arcaneEssence'
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
    ,setId: 'elfico'
  },
  {
    id: 'anel-precisao',
    name: 'Anel da Precisão',
    description: 'Anel que aprimora a mira. +2 Destreza, +1 Inteligência',
    type: 'accessory',
    rarity: 'epico',
    price: 280,
    icon: '💍',
    bonus: { destreza: 2, inteligencia: 1 },
    slot: 'ring',
    setId: 'elfico'
  },
  {
    id: 'anel-aventureiro',
    name: 'Anel do Aventureiro',
    description: '+5% XP recebido (temático)',
    type: 'accessory',
    rarity: 'raro',
    price: 120,
    icon: '💍',
    slot: 'ring'
  },
  {
    id: 'pingente-sorte',
    name: 'Pingente da Sorte',
    description: 'Chance de evitar armadilhas em masmorras',
    type: 'accessory',
    rarity: 'raro',
    price: 150,
    icon: '📿',
    slot: 'necklace'
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
    effects: { duration: 10 },
    slot: 'earring'
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

  // === FORJADOR: NOVOS ACESSÓRIOS ===
  {
    id: 'anel-bronze',
    name: 'Anel de Bronze',
    description: 'Um simples anel de sorte. +1 Sabedoria',
    type: 'accessory',
    rarity: 'comum',
    price: 60,
    icon: '💍',
    bonus: { sabedoria: 1 },
    slot: 'ring'
  },
  {
    id: 'colar-madeira',
    name: 'Colar de Madeira',
    description: 'Amuleto de proteção básica. +1 Constituição',
    type: 'accessory',
    rarity: 'comum',
    price: 60,
    icon: '📿',
    bonus: { constituicao: 1 },
    slot: 'necklace'
  },
  {
    id: 'amuleto-vitalidade',
    name: 'Amuleto da Vitalidade',
    description: 'Energiza o corpo e a alma. Aumenta a vitalidade.',
    type: 'accessory',
    rarity: 'raro',
    price: 240,
    icon: '📿',
    bonus: { constituicao: 3 },
    slot: 'necklace'
  },
  {
    id: 'anel-precisao-raro',
    name: 'Anel de Precisão',
    description: 'Ideal para arqueiros e assassinos. Bônus temático de crítico.',
    type: 'accessory',
    rarity: 'raro',
    price: 220,
    icon: '💍',
    bonus: { destreza: 2 },
    slot: 'ring'
  },
  {
    id: 'medalhao-guardiao',
    name: 'Medalhão do Guardião',
    description: 'Carrega uma prece antiga. +2 Constituição, +3 Sabedoria',
    type: 'accessory',
    rarity: 'raro',
    price: 260,
    icon: '📿',
    bonus: { constituicao: 2, sabedoria: 3 },
    slot: 'necklace',
    setId: 'aurora'
  },
  {
    id: 'anel-furia',
    name: 'Anel da Fúria',
    description: 'Libera um poder destrutivo, a um custo. +5 Força, -2 Constituição',
    type: 'accessory',
    rarity: 'epico',
    price: 380,
    icon: '💍',
    bonus: { forca: 5, constituicao: -2 },
    slot: 'ring'
  },
  {
    id: 'colar-equilibrio',
    name: 'Colar do Equilíbrio',
    description: 'Harmoniza corpo e mente. +3 Força, +3 Constituição',
    type: 'accessory',
    rarity: 'epico',
    price: 400,
    icon: '📿',
    bonus: { forca: 3, constituicao: 3 },
    slot: 'necklace'
  },
  {
    id: 'amuleto-tempo',
    name: 'Amuleto do Tempo',
    description: 'Manipula o tempo a seu favor. Bônus temático de velocidade/XP.',
    type: 'accessory',
    rarity: 'lendario',
    price: 900,
    icon: '⌛',
    bonus: { destreza: 3, carisma: 2 },
    slot: 'necklace',
    currency: 'arcaneEssence'
  },
  {
    id: 'anel-eternidade',
    name: 'Anel da Eternidade',
    description: 'Símbolo da imortalidade dos verdadeiros heróis. Bônus temático de crítico/espírito.',
    type: 'accessory',
    rarity: 'lendario',
    price: 1100,
    icon: '💍',
    bonus: { sabedoria: 5, destreza: 3 },
    slot: 'ring',
    currency: 'arcaneEssence',
    setId: 'eterno'
  },

  // === ACESSÓRIOS — LISTA CURADA ===
  {
    id: 'anel-vitalidade',
    name: 'Anel da Vitalidade',
    description: '+HP (representado por Constituição). +3 Constituição',
    type: 'accessory',
    rarity: 'raro',
    price: 220,
    icon: '💍',
    bonus: { constituicao: 3 },
    slot: 'ring'
  },
  {
    id: 'anel-foco-arcano',
    name: 'Anel do Foco Arcano',
    description: '+Mana (representado por Inteligência). +3 Inteligência',
    type: 'accessory',
    rarity: 'raro',
    price: 240,
    icon: '💍',
    bonus: { inteligencia: 3 },
    slot: 'ring'
  },
  {
    id: 'colar-viajante',
    name: 'Colar do Viajante',
    description: 'Velocidade e leveza. +2 Destreza',
    type: 'accessory',
    rarity: 'raro',
    price: 200,
    icon: '📿',
    bonus: { destreza: 2 },
    slot: 'necklace'
  },
  {
    id: 'bracelete-gladiador',
    name: 'Bracelete do Gladiador',
    description: 'Poder do arena. +3 Força',
    type: 'accessory',
    rarity: 'raro',
    price: 240,
    icon: '🛡️',
    bonus: { forca: 3 },
    slot: 'ring'
  },
  {
    id: 'amuleto-cura',
    name: 'Amuleto da Cura',
    description: 'Restaura HP gradualmente (temático). +2 Constituição',
    type: 'accessory',
    rarity: 'epico',
    price: 420,
    icon: '📿',
    bonus: { constituicao: 2 },
    slot: 'necklace',
    currency: 'glory'
  },
  {
    id: 'anel-destreza',
    name: 'Anel da Destreza',
    description: 'Aprimora chances de crítico (temático). +2 Destreza',
    type: 'accessory',
    rarity: 'raro',
    price: 220,
    icon: '💍',
    bonus: { destreza: 2 },
    slot: 'ring'
  },
  {
    id: 'colar-inspiracao',
    name: 'Colar da Inspiração',
    description: 'Perfeito para bardos e clérigos. +3 Carisma, +1 Sabedoria',
    type: 'accessory',
    rarity: 'epico',
    price: 400,
    icon: '📿',
    bonus: { carisma: 3, sabedoria: 1 },
    slot: 'necklace'
  },
  {
    id: 'pingente-resistencia',
    name: 'Pingente da Resistência',
    description: 'Proteção arcana. +2 Sabedoria',
    type: 'accessory',
    rarity: 'raro',
    price: 240,
    icon: '📿',
    bonus: { sabedoria: 2 },
    slot: 'necklace'
  },
  {
    id: 'anel-tempestade',
    name: 'Anel da Tempestade',
    description: 'Chance de relâmpago (temático). +2 Destreza, +1 Inteligência',
    type: 'accessory',
    rarity: 'epico',
    price: 420,
    icon: '💍',
    bonus: { destreza: 2, inteligencia: 1 },
    slot: 'ring',
    currency: 'glory'
  },
  {
    id: 'simbolo-luz',
    name: 'Símbolo da Luz',
    description: 'Reduz dano das trevas (temático). +2 Sabedoria, +1 Constituição',
    type: 'accessory',
    rarity: 'raro',
    price: 260,
    icon: '✝️',
    bonus: { sabedoria: 2, constituicao: 1 },
    slot: 'necklace'
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
  ,
  // === Itens de Caça: Partes de Monstros ===
  {
    id: 'pele-lobo-sombrio',
    name: 'Pele de Lobo Sombrio',
    description: 'Material obtido em caçadas. Usado para reforçar armaduras leves.',
    type: 'material',
    rarity: 'comum',
    price: 25,
    icon: '🐺'
  },
  {
    id: 'colmilho-vampirico',
    name: 'Colmilho Vampírico',
    description: 'Parte rara de monstros noturnos. Útil em forjas sombrias.',
    type: 'material',
    rarity: 'raro',
    price: 80,
    icon: '🧛'
  },
  {
    id: 'osso-antigo',
    name: 'Osso Antigo',
    description: 'Osso resistente de criatura ancestral. Componente de armaduras.',
    type: 'material',
    rarity: 'raro',
    price: 70,
    icon: '🦴'
  },
  // === Itens de Caça: Ervas e Recursos ===
  {
    id: 'erva-sangue',
    name: 'Erva de Sangue',
    description: 'Planta vermelha usada por curandeiros em poções de vida.',
    type: 'material',
    rarity: 'comum',
    price: 20,
    icon: '🌿'
  },
  {
    id: 'essencia-lunar',
    name: 'Essência Lunar',
    description: 'Essência rara coletada em clareiras sob lua cheia.',
    type: 'material',
    rarity: 'raro',
    price: 120,
    icon: '🌙'
  },
  {
    id: 'cristal-runico',
    name: 'Cristal Rúnico',
    description: 'Cristal com inscrições arcanas, usado em encantamentos.',
    type: 'material',
    rarity: 'epico',
    price: 220,
    icon: '🔷'
  },
  // === Itens de Caça: Pergaminhos de Suporte ===
  {
    id: 'pergaminho-protecao',
    name: 'Pergaminho de Proteção',
    description: 'Aumenta a resistência a dano por 20 minutos.',
    type: 'consumable',
    rarity: 'raro',
    price: 140,
    icon: '📜',
    effects: { duration: 20 }
  },
  {
    id: 'pergaminho-velocidade',
    name: 'Pergaminho de Velocidade',
    description: 'Agilidade temporária para escoltas e evasão (20 min).',
    type: 'consumable',
    rarity: 'raro',
    price: 140,
    icon: '📜',
    effects: { duration: 20 }
  },
  // === Caçadas Especiais: Recompensas épicas garantidas ===
  {
    id: 'lamina-alpha',
    name: 'Lâmina Alpha',
    description: 'Forjada do líder da alcateia. +4 Força, +3 Destreza',
    type: 'weapon',
    rarity: 'epico',
    price: 620,
    icon: '🗡️',
    bonus: { forca: 4, destreza: 3 }
  },
  {
    id: 'armadura-pedra-rachada',
    name: 'Armadura de Pedra Rachada',
    description: 'Resíduo de golem, pesado e protetor. +6 Constituição',
    type: 'armor',
    rarity: 'epico',
    price: 640,
    icon: '🛡️',
    bonus: { constituicao: 6 }
  }
  ,
  {
    id: 'pedra-alma',
    name: 'Pedra de Alma',
    description: 'Canaliza energia para evolução de mascotes.',
    type: 'material',
    rarity: 'raro',
    price: 180,
    icon: '🪨'
  },
  {
    id: 'pedra-magica',
    name: 'Pedra Mágica',
    description: 'Usada para refinar mascotes e montarias (+1% por nível).',
    type: 'material',
    rarity: 'raro',
    price: 220,
    icon: '🔷'
  },
  {
    id: 'pergaminho-montaria',
    name: 'Pergaminho de Montaria',
    description: 'Permite evoluir a montaria para o próximo estágio.',
    type: 'material',
    rarity: 'epico',
    price: 400,
    icon: '📜'
  },
  {
    id: 'essencia-bestial',
    name: 'Essência Bestial',
    description: 'Essência rara necessária para montarias lendárias.',
    type: 'material',
    rarity: 'lendario',
    price: 800,
    icon: '🧬'
  },
  {
    id: 'carne-selvagem',
    name: 'Carne Selvagem',
    description: 'Comida para treinar mascotes (+50 XP).',
    type: 'consumable',
    rarity: 'comum',
    price: 30,
    icon: '🍖'
  },
  {
    id: 'peixe-mistico',
    name: 'Peixe Místico',
    description: 'Comida rara para mascotes (+120 XP).',
    type: 'consumable',
    rarity: 'raro',
    price: 90,
    icon: '🐟'
  },
  {
    id: 'frutas-rubras',
    name: 'Frutas Rubras',
    description: 'Comida doce para mascotes (+80 XP).',
    type: 'consumable',
    rarity: 'incomum',
    price: 50,
    icon: '🍎'
  },
  {
    id: 'essencia-calor',
    name: 'Essência de Calor',
    description: 'Acelera incubação de ovos (-15min).',
    type: 'material',
    rarity: 'raro',
    price: 100,
    icon: '🔥'
  },
  {
    id: 'brasas-magicas',
    name: 'Brasas Mágicas',
    description: 'Acelera incubação de ovos (-1h).',
    type: 'material',
    rarity: 'epico',
    price: 160,
    icon: '♨️'
  }
  ,
  {
    id: 'racao-basica',
    name: 'Ração Básica',
    description: 'Comida comum para mascotes (+50 XP).',
    type: 'consumable',
    rarity: 'comum',
    price: 25,
    icon: '🍖'
  },
  {
    id: 'racao-deluxe',
    name: 'Ração Deluxe',
    description: 'Comida premium para mascotes (+150 XP).',
    type: 'consumable',
    rarity: 'raro',
    price: 120,
    icon: '🍗'
  },
  {
    id: 'essencia-vinculo',
    name: 'Essência de Vínculo',
    description: 'Refina o vínculo com mascotes/montarias (+1%).',
    type: 'material',
    rarity: 'raro',
    price: 220,
    icon: '🌀'
  }
];

export const SHOP_ITEMS_MAP: Record<string, Item> = (() => {
  const map: Record<string, Item> = {};
  for (const it of SHOP_ITEMS) map[it.id] = it;
  return map;
})();

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
  incomum: {
    color: '#10B981', // Emerald
    bgColor: '#ECFDF5',
    multiplier: 1.3
  },
  raro: {
    color: '#3B82F6', // Blue
    bgColor: '#EFF6FF',
    multiplier: 1.6
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

// === CONJUNTOS DE ITENS ===
export const ITEM_SETS: Record<string, { name: string; bonus: Partial<HeroAttributes> }> = {
  arcanista: {
    name: 'Conjunto Arcanista',
    bonus: { inteligencia: 2, sabedoria: 1 }
  },
  aurora: {
    name: 'Conjunto Aurora',
    bonus: { forca: 2, sabedoria: 2 }
  },
  elfico: {
    name: 'Conjunto Élfico do Arqueiro',
    bonus: { destreza: 2, sabedoria: 1 }
  },
  eterno: {
    name: 'Conjunto do Último Herói',
    bonus: { forca: 3, carisma: 1, sabedoria: 1 }
  }
};

// === FUNÇÕES DE COMPRA ===

export interface PurchaseResult {
  success: boolean;
  message: string;
  newGold?: number; // compatibilidade retro
  currency?: 'gold' | 'glory' | 'arcaneEssence';
  newBalance?: number;
  item?: Item;
}

export function canAfford(hero: Hero, item: Item): boolean {
  const currency = item.currency || 'gold';
  const prog = hero.progression;
  const balance = currency === 'gold' ? (prog.gold || 0)
                  : currency === 'glory' ? (prog.glory || 0)
                  : (prog.arcaneEssence || 0);
  const price = getDiscountedPrice(item, hero);
  return balance >= price;
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
    const currency = item.currency || 'gold';
    const prog = hero.progression;
    const balance = currency === 'gold' ? (prog.gold || 0)
                    : currency === 'glory' ? (prog.glory || 0)
                    : (prog.arcaneEssence || 0);
    const currencyName = currency === 'gold' ? 'ouro' : currency === 'glory' ? 'glória' : 'essência arcana';
    return {
      success: false,
      message: `${currencyName.charAt(0).toUpperCase() + currencyName.slice(1)} insuficiente! Você precisa de ${getDiscountedPrice(item, hero)} ${currencyName}, mas tem apenas ${balance}.`
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
  
  const currency = item.currency || 'gold';
  const prog = hero.progression;
  const current = currency === 'gold' ? (prog.gold || 0)
                  : currency === 'glory' ? (prog.glory || 0)
                  : (prog.arcaneEssence || 0);
  const price = getDiscountedPrice(item, hero);
  const newBalance = current - price;
  const currencyName = currency === 'gold' ? 'ouro' : currency === 'glory' ? 'glória' : 'essência arcana';
  return {
    success: true,
    message: `${item.name} comprado com sucesso! (-${price} ${currencyName})`,
    // compat: manter newGold preenchido quando moeda for ouro
    newGold: currency === 'gold' ? newBalance : undefined,
    currency,
    newBalance,
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
  const item = SHOP_ITEMS_MAP[itemId] || SHOP_ITEMS.find(i => i.id === itemId);
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

  if (item.requirements) {
    const minLevel = item.requirements.minLevel || 0;
    if ((hero.progression.level || hero.level || 1) < minLevel) {
      return { success: false, message: `Requer nível ${minLevel}` };
    }
    const allow = item.requirements.classAllow;
    const deny = item.requirements.classDeny;
    if (allow && allow.length > 0 && !allow.includes(hero.class)) {
      return { success: false, message: 'Classe incompatível para este item' };
    }
    if (deny && deny.length > 0 && deny.includes(hero.class)) {
      return { success: false, message: 'Sua classe não pode usar este item' };
    }
  }
  
  const inv = hero.inventory;
  const placeInSlot = (): string | null => {
    if (item.type === 'weapon') {
      const prefer = item.slot === 'offHand' ? 'offHand' : 'mainHand';
      const free = prefer === 'mainHand' ? (!inv.equippedMainHand ? 'mainHand' : (!inv.equippedOffHand ? 'offHand' : null)) : (!inv.equippedOffHand ? 'offHand' : (!inv.equippedMainHand ? 'mainHand' : null));
      return free;
    }
    if (item.type === 'armor') {
      const s = item.slot;
      if (s === 'helm' && !inv.equippedHelm) return 'helm';
      if (s === 'chest' && !inv.equippedChest) return 'chest';
      if (s === 'belt' && !inv.equippedBelt) return 'belt';
      if (s === 'gloves' && !inv.equippedGloves) return 'gloves';
      if (s === 'boots' && !inv.equippedBoots) return 'boots';
      if (s === 'cape' && !inv.equippedCape) return 'cape';
      if (!s) return !inv.equippedChest ? 'chest' : null;
      return null;
    }
    if (item.type === 'accessory') {
      const s = item.slot;
      if (s === 'necklace' && !inv.equippedNecklace) return 'necklace';
      if (s === 'ring') {
        if (!inv.equippedRingLeft) return 'ringLeft';
        if (!inv.equippedRingRight) return 'ringRight';
        return null;
      }
      if (s === 'earring') {
        if (!inv.equippedEarringLeft) return 'earringLeft';
        if (!inv.equippedEarringRight) return 'earringRight';
        return null;
      }
      if (!s) {
        if (!inv.equippedRingLeft) return 'ringLeft';
        if (!inv.equippedRingRight) return 'ringRight';
        if (!inv.equippedNecklace) return 'necklace';
        if (!inv.equippedEarringLeft) return 'earringLeft';
        if (!inv.equippedEarringRight) return 'earringRight';
        return null;
      }
      return null;
    }
    return null;
  };
  const target = placeInSlot();
  if (!target) return { success: false, message: 'Sem slot disponível compatível' };
  const slotLabelMap: Record<string, string> = {
    mainHand: 'mão principal', offHand: 'mão secundária', helm: 'helmo', chest: 'armadura', belt: 'cintura', gloves: 'luvas', boots: 'botas', cape: 'asa/capa',
    ringLeft: 'anel (esq.)', ringRight: 'anel (dir.)', necklace: 'colar', earringLeft: 'brinco (esq.)', earringRight: 'brinco (dir.)'
  };
  return { success: true, message: `${item.name} equipado no slot ${slotLabelMap[target]}!` };
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

  // Fadiga: reduzir diretamente na progressão
  if (item.effects?.fatigue) {
    const currentFatigue = hero.progression.fatigue ?? 0;
    const reduction = Math.min(item.effects.fatigue, currentFatigue);
    const newFatigue = Math.max(0, currentFatigue - reduction);
    effects.fatigue = newFatigue;
    if (reduction > 0) {
      message += ` -${reduction} Fadiga`;
    } else {
      message += ` (sem efeito: Fadiga já 0)`;
    }
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

// Desconto adicional por rank do herói
export const RANK_PRICE_DISCOUNT: Record<RankLevel, number> = {
  F: 0.00,
  E: 0.02,
  D: 0.04,
  C: 0.06,
  B: 0.08,
  A: 0.10,
  S: 0.12
};

// Fator de moderação por raridade: itens mais raros recebem menos desconto efetivo
export const RARITY_DISCOUNT_FACTOR: Record<'comum' | 'raro' | 'epico' | 'lendario', number> = {
  comum: 1.0,
  raro: 0.9,
  epico: 0.8,
  lendario: 0.7
};

export function getReputationDiscount(reputation: number): number {
  if (reputation >= 1000) return 0.15; // 15% desconto
  if (reputation >= 500) return 0.10;  // 10% desconto
  if (reputation >= 200) return 0.05;  // 5% desconto
  return 0;
}

export function getDiscountedPrice(item: Item, hero: Hero): number {
  const reputationDiscount = getReputationDiscount(hero.progression.reputation);
  const rankLevel: RankLevel = hero.rankData?.currentRank ?? 'F';
  const rankDiscount = RANK_PRICE_DISCOUNT[rankLevel] ?? 0;
  const rarityFactor = RARITY_DISCOUNT_FACTOR[item.rarity as 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario'] ?? 1.0;

  // Soma descontos de reputação e rank, moderados pela raridade; limita desconto total para evitar preços zero
  const effectiveDiscount = Math.max(0, Math.min(0.5, (reputationDiscount + rankDiscount) * rarityFactor));
  const basePrice = computeItemBasePrice(item);
  return Math.floor(basePrice * (1 - effectiveDiscount));
}

export function getDiscountBreakdown(item: Item, hero: Hero) {
  const reputationDiscount = getReputationDiscount(hero.progression.reputation);
  const rankLevel: RankLevel = hero.rankData?.currentRank ?? 'F';
  const rankDiscount = RANK_PRICE_DISCOUNT[rankLevel] ?? 0;
  const rarityFactor = RARITY_DISCOUNT_FACTOR[item.rarity as 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario'] ?? 1.0;
  const effectiveDiscount = Math.max(0, Math.min(0.5, (reputationDiscount + rankDiscount) * rarityFactor));
  const basePrice = computeItemBasePrice(item);
  const effectivePrice = Math.floor(basePrice * (1 - effectiveDiscount));
  const saved = Math.max(0, basePrice - effectivePrice);
  return { reputationDiscount, rankDiscount, rarityFactor, effectiveDiscount, basePrice, effectivePrice, saved };
}

// Preço base dinâmico: nível × multiplicador de raridade × 100.
// Lendários com nível utilizam preço fixo dentro de 10k–25k.
export function computeItemBasePrice(item: Item): number {
  const rarityKey = item.rarity as keyof typeof RARITY_CONFIG;
  const rarityMult = RARITY_CONFIG[rarityKey]?.multiplier ?? 1.0;
  if (item.level && item.level > 0) {
    if (item.rarity === 'lendario') {
      const computed = item.level * rarityMult * 100;
      return Math.max(10000, Math.min(25000, Math.floor(computed)));
    }
    return Math.floor(item.level * rarityMult * 100);
  }
  return item.price;
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
