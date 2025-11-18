import { Hero, Quest } from '../types/hero';
import { generateQuestBoard } from './quests';

export function getQuestHint(hero: Hero, quests: Quest[]): string {
  const rel = Math.max(...Object.values(hero.socialRelations || { [hero.id]: 0 }));
  const level = hero.progression.level || 1;
  const list = quests.length ? quests : generateQuestBoard(level);
  const q = list[Math.floor(Math.random() * list.length)];
  if (!q) return 'Sem dicas no momento.';
  const detail = rel >= 75 ? `Local: ${q.biomeHint || 'desconhecido'}` : rel >= 40 ? `Dificuldade: ${q.difficulty}` : `Nível: ${q.levelRequirement}+`;
  return `Dica: “${q.title}”. ${detail}.`;
}