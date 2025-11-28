/**
 * Sistema de Geração de Nomes por Raça
 * Versão 3.0 - Forjador de Heróis
 */

import { HeroRace } from '../types/hero';

interface NamePool {
  first: string[];
  last: string[];
  prefixes?: string[];
  suffixes?: string[];
}

export const NAME_POOLS: Record<HeroRace, NamePool> = {
  humano: {
    first: [
      "Erik", "Mira", "Roland", "Selene", "Alba", "Marcus", "Elena", "Gareth", 
      "Lyanna", "Cedric", "Aria", "Theron", "Vera", "Aldric", "Nora", "Darius",
      "Celia", "Roderick", "Iris", "Magnus", "Luna", "Cassius", "Stella"
    ],
    last: [
      "Vargas", "Dorn", "Marin", "Cavaleiro", "Ferreira", "Santos", "Silva", 
      "Monteiro", "Pereira", "Costa", "Almeida", "Rocha", "Cardoso", "Ribeiro",
      "Machado", "Barbosa", "Correia", "Teixeira", "Moreira", "Carvalho"
    ]
  },
  elfo: {
    first: [
      "Elarion", "Sylwen", "Althir", "Thalindra", "Aelindra", "Celeborn", 
      "Galadriel", "Legolas", "Arwen", "Elrond", "Nimrodel", "Thranduil",
      "Elaria", "Silvyr", "Moonwhisper", "Starweaver", "Dawnbringer", "Nightsong"
    ],
    last: [
      "Lunarwind", "Silvertree", "Aelaris", "Moonblade", "Starfall", "Dawnstrider",
      "Nightwhisper", "Goldleaf", "Silverbrook", "Crystalwind", "Shadowmere",
      "Brightbane", "Swiftarrow", "Lightbringer", "Forestwalker", "Stormwind"
    ]
  },
  anao: {
    first: [
      "Durak", "Brom", "Thrain", "Hilda", "Thorin", "Dain", "Balin", "Dwalin",
      "Gimli", "Gloin", "Oin", "Nori", "Dori", "Ori", "Bifur", "Bofur",
      "Bombur", "Fili", "Kili", "Grenda", "Magna", "Vera"
    ],
    last: [
      "Ferrobarba", "Pedramar", "Martelo-de-Ferro", "Barba-de-Aço", "Punho-de-Pedra",
      "Escudo-de-Ferro", "Machado-Dourado", "Forja-Negra", "Barba-Branca",
      "Pé-de-Ferro", "Coração-de-Pedra", "Mão-de-Ferro", "Barba-Vermelha"
    ]
  },
  orc: {
    first: [
      "Gor", "Krag", "Thokk", "Urgar", "Grash", "Morg", "Skar", "Vrak",
      "Grom", "Thrall", "Durotan", "Orgrim", "Blackhand", "Kilrogg", "Ner'zhul",
      "Gul'dan", "Cho'gall", "Teron", "Kargath", "Dentarg"
    ],
    last: [
      "Sangrent", "Ruptura", "Osso-Quebrado", "Garra-Negra", "Dente-Afiado",
      "Punho-de-Ferro", "Olho-Vermelho", "Cicatriz-Profunda", "Lâmina-Suja",
      "Crânio-Rachado", "Pele-Dura", "Força-Bruta", "Raiva-Eterna"
    ]
  },
  halfling: {
    first: [
      "Bilbo", "Frodo", "Sam", "Merry", "Pippin", "Rosie", "Daisy", "Poppy",
      "Lily", "Violet", "Peregrin", "Meriadoc", "Samwise", "Fredegar", "Folco",
      "Odo", "Drogo", "Primula", "Belladonna", "Mirabella", "Donnamira"
    ],
    last: [
      "Bolseiro", "Gamgee", "Tuk", "Brandebuque", "Sacola-Dourada", "Pé-Peludo",
      "Colina-Verde", "Vale-Alegre", "Pedra-Branca", "Água-Clara", "Campo-Florido",
      "Boa-Sorte", "Coração-Alegre", "Sorriso-Largo", "Barriga-Cheia"
    ]
  }
};

export const BATTLE_QUOTES: Record<string, string[]> = {
  guerreiro: [
    "Pelas chamas da honra!",
    "Mostrem seu valor!",
    "Aço nunca falha!",
    "Por glória e batalha!",
    "Que o ferro encontre a carne!",
    "Nenhum passo atrás!",
    "A vitória ou a morte!"
  ],
  mago: [
    "Que o cosmos exalte meu nome!",
    "Pelas letras ancestrais!",
    "Que o selo se quebre!",
    "Magia flui através de mim!",
    "Os elementos me obedecem!",
    "Conhecimento é poder!",
    "Que a realidade se curve!"
  ],
  arqueiro: [
    "Minha mira nunca falha!",
    "Silêncio e precisão!",
    "Uma flecha, um alvo!",
    "Que o vento guie minha flecha!",
    "Distância é minha aliada!",
    "Olhos de águia, mãos firmes!",
    "A caça começou!"
  ],
  clerigo: [
    "Pela luz divina!",
    "Que a fé me guie!",
    "A cura vem dos céus!",
    "Proteção aos justos!",
    "Luz contra as trevas!",
    "Bênçãos sobre nós!",
    "O divino me fortalece!"
  ],
  ladino: [
    "Sombras, me guiem!",
    "Essa carteira não vai se esvaziar sozinha!",
    "Sorria e corra!",
    "Silêncio é ouro!",
    "Nas sombras eu prospero!",
    "Rápido e mortal!",
    "Você não me viu chegando!"
  ],
  default: [
    "Por glória e ouro!",
    "Pelo rei!",
    "Avante, heróis!",
    "A aventura nos chama!",
    "Que a sorte nos favoreça!"
  ]
};

/**
 * Gera um nome aleatório baseado na raça
 */
function isLikelyFemale(name: string): boolean {
  const fSuffix = ['a', 'ia', 'ra', 'na', 'la', 'sa'];
  const lower = name.toLowerCase();
  return fSuffix.some(s => lower.endsWith(s));
}

export function generateName(race: HeroRace, gender?: 'masculino' | 'feminino'): string {
  const pool = NAME_POOLS[race] || NAME_POOLS.humano;
  let firsts = pool.first.slice();
  if (gender === 'feminino') firsts = firsts.filter(isLikelyFemale).length ? firsts.filter(isLikelyFemale) : firsts;
  if (gender === 'masculino') firsts = firsts.filter(n => !isLikelyFemale(n)).length ? firsts.filter(n => !isLikelyFemale(n)) : firsts;
  const first = firsts[Math.floor(Math.random() * firsts.length)];
  const last = pool.last[Math.floor(Math.random() * pool.last.length)];
  return `${first} ${last}`;
}

/**
 * Gera uma frase de batalha baseada na classe
 */
export function getBattleQuote(heroClass: string): string {
  const pool = BATTLE_QUOTES[heroClass.toLowerCase()] || BATTLE_QUOTES.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Gera múltiplas opções de nome para o usuário escolher
 */
export function generateNameOptions(race: HeroRace, count: number = 3, gender?: 'masculino' | 'feminino'): string[] {
  const options: string[] = [];
  const pool = NAME_POOLS[race] || NAME_POOLS.humano;
  let firsts = pool.first.slice();
  if (gender === 'feminino') firsts = firsts.filter(isLikelyFemale).length ? firsts.filter(isLikelyFemale) : firsts;
  if (gender === 'masculino') firsts = firsts.filter(n => !isLikelyFemale(n)).length ? firsts.filter(n => !isLikelyFemale(n)) : firsts;
  
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      const first = firsts[Math.floor(Math.random() * firsts.length)];
      const last = pool.last[Math.floor(Math.random() * pool.last.length)];
      name = `${first} ${last}`;
    } while (options.includes(name));
    
    options.push(name);
  }
  
  return options;
}

/**
 * Valida se um nome personalizado é apropriado
 */
export function validateCustomName(name: string): { valid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: "Nome não pode estar vazio" };
  }
  
  if (name.length < 2) {
    return { valid: false, message: "Nome deve ter pelo menos 2 caracteres" };
  }
  
  if (name.length > 50) {
    return { valid: false, message: "Nome deve ter no máximo 50 caracteres" };
  }
  
  // Verifica caracteres especiais inválidos
  const invalidChars = /[<>{}[\]\\/|`~!@#$%^&*()+=;:'"?]/;
  if (invalidChars.test(name)) {
    return { valid: false, message: "Nome contém caracteres inválidos" };
  }
  
  return { valid: true };
}
