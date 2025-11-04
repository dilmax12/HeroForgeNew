/**
 * Sistema Elemental
 * Versão 3.0 - Forjador de Heróis
 */

import { Element } from '../types/hero';

export const ELEMENT_ADVANTAGES: Record<Element, { beats?: Element; weak?: Element }> = {
  fire: { beats: 'ice', weak: 'earth' },
  ice: { beats: 'thunder', weak: 'fire' },
  thunder: { beats: 'earth', weak: 'ice' },
  earth: { beats: 'fire', weak: 'thunder' },
  light: { beats: 'dark', weak: 'dark' },
  dark: { beats: 'light', weak: 'light' },
  physical: {} // Neutro
};

export const ELEMENT_INFO: Record<Element, { name: string; icon: string; color: string; description: string }> = {
  fire: {
    name: 'Fogo',
    icon: '🔥',
    color: '#FF4500',
    description: 'Elemento do poder e destruição. Forte contra Gelo, fraco contra Terra.'
  },
  ice: {
    name: 'Gelo',
    icon: '❄️',
    color: '#00BFFF',
    description: 'Elemento do controle e preservação. Forte contra Trovão, fraco contra Fogo.'
  },
  thunder: {
    name: 'Trovão',
    icon: '⚡',
    color: '#FFD700',
    description: 'Elemento da velocidade e energia. Forte contra Terra, fraco contra Gelo.'
  },
  earth: {
    name: 'Terra',
    icon: '🌍',
    color: '#8B4513',
    description: 'Elemento da resistência e estabilidade. Forte contra Fogo, fraco contra Trovão.'
  },
  light: {
    name: 'Luz',
    icon: '✨',
    color: '#FFFF00',
    description: 'Elemento da pureza e cura. Forte contra Sombra, mas também vulnerável a ela.'
  },
  dark: {
    name: 'Sombra',
    icon: '🌑',
    color: '#4B0082',
    description: 'Elemento do mistério e poder oculto. Forte contra Luz, mas também vulnerável a ela.'
  },
  physical: {
    name: 'Físico',
    icon: '⚔️',
    color: '#808080',
    description: 'Elemento neutro sem vantagens ou desvantagens elementais.'
  }
};

/**
 * Calcula o multiplicador de dano elemental
 */
export function getElementMultiplier(attackElement: Element, defendElement: Element): number {
  if (attackElement === defendElement) {
    return 1.0; // Mesmo elemento = neutro
  }
  
  const advantage = ELEMENT_ADVANTAGES[attackElement];
  
  if (advantage.beats === defendElement) {
    return 1.3; // Vantagem = +30% dano
  }
  
  if (advantage.weak === defendElement) {
    return 0.7; // Desvantagem = -30% dano
  }
  
  return 1.0; // Neutro
}

/**
 * Obtém informações sobre vantagens elementais
 */
export function getElementAdvantageInfo(element: Element): {
  strong: Element[];
  weak: Element[];
  neutral: Element[];
} {
  const strong: Element[] = [];
  const weak: Element[] = [];
  const neutral: Element[] = [];
  
  Object.entries(ELEMENT_ADVANTAGES).forEach(([elem, data]) => {
    const currentElement = elem as Element;
    
    if (currentElement === element) return;
    
    if (data.beats === element) {
      weak.push(currentElement);
    } else if (data.weak === element) {
      strong.push(currentElement);
    } else {
      neutral.push(currentElement);
    }
  });
  
  return { strong, weak, neutral };
}

/**
 * Gera um elemento aleatório
 */
export function generateRandomElement(): Element {
  const elements: Element[] = ['fire', 'ice', 'thunder', 'earth', 'light', 'dark'];
  return elements[Math.floor(Math.random() * elements.length)];
}

/**
 * Obtém elementos recomendados para uma classe
 */
export function getRecommendedElements(heroClass: string): Element[] {
  const recommendations: Record<string, Element[]> = {
    guerreiro: ['earth', 'fire', 'physical'],
    mago: ['fire', 'ice', 'thunder'],
    arqueiro: ['physical', 'thunder', 'earth'],
    clerigo: ['light', 'earth', 'physical'],
    ladino: ['dark', 'physical', 'thunder'],
    patrulheiro: ['earth', 'physical', 'ice'],
    paladino: ['light', 'fire', 'earth']
  };
  
  return recommendations[heroClass.toLowerCase()] || ['physical'];
}

/**
 * Calcula afinidade elemental (bônus para skills do mesmo elemento)
 */
export function calculateElementalAffinity(heroElement: Element, skillElement?: Element): number {
  if (!skillElement || skillElement === 'physical') return 1.0;
  if (heroElement === skillElement) return 1.1; // +10% para mesmo elemento
  return 1.0;
}

// Fallback centralizado: retorna info de 'physical' se não encontrado
export function getElementInfoSafe(element: Element | string) {
  const key = element as Element;
  return ELEMENT_INFO[key] || ELEMENT_INFO['physical'];
}

export const ELEMENT_ADV: Record<Element, { beats: Element[]; weak?: Element[] }> = {
  fire: { beats: ['ice'], weak: ['earth'] },
  ice: { beats: ['thunder'] },
  thunder: { beats: ['earth'] },
  earth: { beats: ['fire'] },
  light: { beats: ['dark'] },
  dark: { beats: ['light'] },
  physical: { beats: [] }
};

export function computeElementMultiplier(atkElem: Element, defElem: Element, atkAffinity = 0, defResistance = 0): number {
  let base = 1.0;
  if (ELEMENT_ADV[atkElem]?.beats.includes(defElem)) base *= 1.3;
  if (ELEMENT_ADV[defElem]?.beats.includes(atkElem)) base *= 0.75;
  base *= 1 + (atkAffinity - defResistance) / 100;
  return Math.max(0.4, Math.min(base, 2.5));
}