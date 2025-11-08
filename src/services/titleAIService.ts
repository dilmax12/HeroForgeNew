import { aiService } from './aiService';
import { Hero, Title } from '../types/hero';

function getSystemPrompt(): string {
  return (
    'Você é um mestre de títulos épicos em um RPG medieval. '
    + 'Crie títulos curtos (2–4 palavras) e uma descrição poética de 25–50 palavras. '
    + 'Use português brasileiro, e conecte o título à classe, feitos e atributos do herói. '
    + 'Evite aspas e emojis na descrição. O título pode usar maiúsculas estilizadas.'
  );
}

function buildPrompt(hero: Hero): string {
  const topAttr = Object.entries(hero.attributes)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0][0];
  const achievements = (hero.progression?.achievements || [])
    .map(a => a.name)
    .slice(0, 5);
  const rep = (hero.reputationFactions || [])
    .map(f => `${f.name}:${f.reputation}`)
    .join(', ');

  return (
    `Herói: ${hero.name} (${hero.class}, nível ${hero.progression.level}). ` +
    `Atributo dominante: ${topAttr}. ` +
    `Feitos: ${achievements.join('; ') || '—'}. ` +
    `Reputação: ${rep || 'neutra'}. ` +
    'Gere um JSON com os campos: {"title": string, "description": string, "rarity": "comum|raro|epico|lendario"}. '
    + 'O título deve ser forte e temático; a descrição deve soar como um mito curto.'
  );
}

function fallbackTitle(hero: Hero): { title: string; description: string; rarity: Title['rarity'] } {
  const classMap: Record<string, string[]> = {
    guerreiro: ['Campeão de Ferro', 'Portador da Lâmina'],
    mago: ['Guardião dos Arcanos', 'Teurgo do Véu'],
    arqueiro: ['Olho de Falcão', 'Caçador das Sombras'],
    ladino: ['Sombra Silenciosa', 'Lâmina Oculta'],
    clerigo: ['Mão da Luz', 'Protetor das Almas'],
    paladino: ['Escudo Sagrado', 'Voto Imaculado'],
    patrulheiro: ['Pisadas Selvagens', 'Guardião da Floresta']
  };
  const base = classMap[hero.class]?.[0] || 'Aspirante da Lenda';
  return {
    title: base,
    description: `${hero.name} trilha caminhos de ${hero.class}, forjando-se em provações e honra. Suas façanhas ecoam nas tavernas e trilhas do reino, promessa viva de histórias maiores.`,
    rarity: 'raro'
  };
}

export async function generateDynamicTitleForHero(hero: Hero): Promise<Title> {
  if (!aiService.isConfigured()) {
    const fb = fallbackTitle(hero);
    return {
      id: `ai-${Date.now()}`,
      name: fb.title,
      description: fb.description,
      rarity: fb.rarity,
      category: 'special',
      badge: '👑',
      unlockedAt: new Date()
    };
  }

  try {
    const response = await aiService.generateText({
      systemMessage: getSystemPrompt(),
      prompt: buildPrompt(hero),
      maxTokens: 240,
      temperature: 0.8
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(response.text);
    } catch {
      // Se não vier JSON válido, usa fallback
      const fb = fallbackTitle(hero);
      return {
        id: `ai-${Date.now()}`,
        name: fb.title,
        description: fb.description,
        rarity: fb.rarity,
        category: 'special',
        badge: '👑',
        unlockedAt: new Date()
      };
    }

    const rarity: Title['rarity'] = ['comum', 'raro', 'epico', 'lendario'].includes(parsed.rarity)
      ? parsed.rarity
      : 'raro';

    return {
      id: `ai-${Date.now()}`,
      name: (parsed.title || '').trim().slice(0, 40) || 'Título Misterioso',
      description: (parsed.description || '').trim().slice(0, 240) || 'Um título concedido pelos ventos do destino.',
      rarity,
      category: 'special',
      badge: '👑',
      unlockedAt: new Date()
    };
  } catch (err) {
    const fb = fallbackTitle(hero);
    return {
      id: `ai-${Date.now()}`,
      name: fb.title,
      description: fb.description,
      rarity: fb.rarity,
      category: 'special',
      badge: '👑',
      unlockedAt: new Date()
    };
  }
}
