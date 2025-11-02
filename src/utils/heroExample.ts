/**
 * Exemplo de Herói Completo - Hero Forge Versão 3.0
 * Demonstra todas as funcionalidades implementadas
 */

import { Hero, HeroCreationData } from '../types/hero';
import { getClassSkills } from './skillSystem';
import { generateName, getBattleQuote } from './nameGenerator';
import { createInitialAttributes } from './attributeSystem';

/**
 * Exemplo de dados de criação de herói completo
 */
export const EXAMPLE_HERO_DATA: HeroCreationData = {
  name: 'Elarion Silvertree',
  race: 'elfo',
  class: 'mago',
  alignment: 'neutro-bom',
  background: 'sage',
  attributes: {
    forca: 2,
    destreza: 3,
    constituicao: 2,
    inteligencia: 5,
    sabedoria: 4,
    carisma: 2
  },
  element: 'fire',
  skills: getClassSkills('mago'),
  image: '', // Seria uma URL ou base64 de imagem
  battleQuote: 'Que as chamas da sabedoria iluminem meu caminho!',
  backstory: 'Nascido nas florestas élficas, Elarion sempre demonstrou afinidade com a magia elemental. Seus estudos o levaram a dominar o poder do fogo, usando-o tanto para proteção quanto para destruição quando necessário.'
};

/**
 * Função para gerar um herói de exemplo com dados aleatórios
 */
export function generateExampleHero(race?: string, heroClass?: string): HeroCreationData {
  const races = ['humano', 'elfo', 'anao', 'orc', 'halfling'];
  const classes = ['guerreiro', 'mago', 'arqueiro', 'clerigo', 'ladino'];
  const elements = ['fire', 'ice', 'thunder', 'earth', 'light', 'dark', 'physical'];
  
  const selectedRace = race || races[Math.floor(Math.random() * races.length)];
  const selectedClass = heroClass || classes[Math.floor(Math.random() * classes.length)];
  const selectedElement = elements[Math.floor(Math.random() * elements.length)];
  
  return {
    name: generateName(selectedRace as any),
    race: selectedRace as any,
    class: selectedClass as any,
    alignment: 'neutro-puro',
    background: 'folk-hero',
    attributes: createInitialAttributes(),
    element: selectedElement as any,
    skills: getClassSkills(selectedClass as any),
    battleQuote: getBattleQuote(selectedClass as any),
    backstory: `Um ${selectedRace} ${selectedClass} em busca de aventuras e glória.`
  };
}

/**
 * Demonstração de uso do sistema de skills
 */
export function demonstrateSkillSystem() {
  const heroData = EXAMPLE_HERO_DATA;
  const skill = heroData.skills[0]; // Primeira skill da classe
  
  console.log('=== DEMONSTRAÇÃO DO SISTEMA DE SKILLS ===');
  console.log(`Herói: ${heroData.name} (${heroData.class})`);
  console.log(`Elemento: ${heroData.element}`);
  console.log(`Skill: ${skill.name}`);
  console.log(`Descrição: ${skill.description}`);
  console.log(`Tipo: ${skill.type}`);
  console.log(`Custo: ${skill.cost} MP`);
  console.log(`Poder Base: ${skill.basePower}`);
  console.log(`Elemento: ${skill.element}`);
  console.log(`Alvo: ${skill.target}`);
  
  // Simular uso da skill
  const damage = (skill.basePower || 0) + heroData.attributes.inteligencia * 2;
  console.log(`Dano calculado: ${damage}`);
  
  return {
    hero: heroData,
    skill,
    calculatedDamage: damage
  };
}

/**
 * JSON de exemplo para documentação
 */
export const HERO_JSON_EXAMPLE = JSON.stringify(EXAMPLE_HERO_DATA, null, 2);