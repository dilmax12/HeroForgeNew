import { describe, it, expect } from 'vitest';
import { generateStory } from './story';
import { HeroCreationData } from '../types/hero';

describe('generateStory', () => {
  const baseHero: HeroCreationData = {
    name: 'Arthas',
    race: 'humano',
    class: 'guerreiro',
    alignment: 'neutro-puro',
    background: '',
    attributes: {
      forca: 3,
      destreza: 8,
      constituicao: 2,
      inteligencia: 1,
      sabedoria: 2,
      carisma: 2,
    },
  };

  it('inclui o nome do herói e menciona um atributo', () => {
    const story = generateStory(baseHero);
    expect(story).toContain(baseHero.name);
    const mentionsAttribute = ['força','destreza','constituição','inteligência','sabedoria','carisma']
      .some(label => story.toLowerCase().includes(label));
    expect(mentionsAttribute).toBe(true);
  });

  it('retorna textos diferentes em chamadas múltiplas', () => {
    const stories = Array.from({ length: 10 }, () => generateStory(baseHero));
    const unique = new Set(stories);
    expect(unique.size).toBeGreaterThan(1);
  });
});