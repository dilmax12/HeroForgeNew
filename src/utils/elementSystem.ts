/**
 * Sistema Elemental
 * Versão 3.0 - Forjador de Heróis
 */

import { Element } from '../types/hero';

export const ELEMENT_ADVANTAGES: Record<Element, { beats?: Element | Element[]; weak?: Element | Element[] }> = {
  fire:  { beats: 'earth', weak: 'water' },
  water: { beats: 'fire', weak: 'thunder' },
  earth: { beats: 'thunder', weak: 'fire' },
  air:   { },
  thunder: { beats: 'water', weak: 'earth' },
  light: { beats: 'dark', weak: 'dark' },
  dark:  { beats: ['fire','water','earth','air','thunder'], weak: 'light' },
  physical: {}
};

export const ELEMENT_INFO: Record<Element, { name: string; icon: string; color: string; description: string }> = {
  fire:     { name: 'Fogo',    icon: '🔥', color: '#FF4500', description: '+10% dano contínuo; vence Terra; perde para Água' },
  water:    { name: 'Água',    icon: '🌊', color: '#1E90FF', description: '+10% cura recebida; vence Fogo; perde para Raio' },
  earth:    { name: 'Terra',   icon: '🌱', color: '#8B4513', description: '+20% defesa base; vence Raio; perde para Fogo' },
  air:      { name: 'Ar',      icon: '🌪', color: '#87CEEB', description: '+10% chance de crítico; instável' },
  thunder:  { name: 'Raio',    icon: '⚡', color: '#FFD700', description: '+10% velocidade; vence Água; perde para Terra' },
  light:    { name: 'Luz',     icon: '✨', color: '#FFFF00', description: '+5% cura e dano sagrado; vence Trevas' },
  dark:     { name: 'Trevas',  icon: '💀', color: '#4B0082', description: 'Roubo de vida 5%; vence todos exceto Luz' },
  physical: { name: 'Físico',  icon: '⚔️', color: '#808080', description: 'Neutro' }
};

/**
 * Calcula o multiplicador de dano elemental
 */
export function getElementMultiplier(attackElement: Element, defendElement: Element): number {
  if (attackElement === defendElement) return 1.0;
  const adv = ELEMENT_ADVANTAGES[attackElement];
  const beats = Array.isArray(adv.beats) ? adv.beats : adv.beats ? [adv.beats] : [];
  const weaks = Array.isArray(adv.weak) ? adv.weak : adv.weak ? [adv.weak] : [];
  if (beats.includes(defendElement)) return 1.3;
  if (weaks.includes(defendElement)) return 0.7;
  return 1.0;
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
  const elements: Element[] = ['fire','water','earth','air','thunder','light','dark'];
  return elements[Math.floor(Math.random() * elements.length)];
}

/**
 * Obtém elementos recomendados para uma classe
 */
export function getRecommendedElements(heroClass: string): Element[] {
  const recommendations: Record<string, Element[]> = {
    guerreiro: ['earth','fire','physical'],
    mago: ['fire','water','thunder'],
    arqueiro: ['air','thunder','earth'],
    clerigo: ['light','water','earth'],
    ladino: ['dark','air','thunder'],
    patrulheiro: ['earth','air','water'],
    paladino: ['light','fire','earth']
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
  fire: { beats: ['earth'], weak: ['water'] },
  water: { beats: ['fire'], weak: ['thunder'] },
  earth: { beats: ['thunder'], weak: ['fire'] },
  air: { beats: [] },
  thunder: { beats: ['water'], weak: ['earth'] },
  light: { beats: ['dark'], weak: ['dark'] },
  dark: { beats: ['fire','water','earth','air','thunder'], weak: ['light'] },
  physical: { beats: [] }
};

export function computeElementMultiplier(atkElem: Element, defElem: Element, atkAffinity = 0, defResistance = 0): number {
  let base = 1.0;
  if (ELEMENT_ADV[atkElem]?.beats.includes(defElem)) base *= 1.3;
  if (ELEMENT_ADV[defElem]?.beats.includes(atkElem)) base *= 0.75;
  base *= 1 + (atkAffinity - defResistance) / 100;
  return Math.max(0.4, Math.min(base, 2.5));
}