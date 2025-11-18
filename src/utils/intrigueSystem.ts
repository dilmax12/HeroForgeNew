import { Hero } from '../types/hero';
import { notificationBus } from '../components/NotificationSystem';

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export function spreadRumor(source: Hero, target: Hero, audience: Hero[], intensity: number) {
  const delta = Math.floor(intensity);
  audience.forEach(a => {
    if (a.id === source.id || a.id === target.id) return;
    const map = { ...(a.socialRelations || {}) };
    map[target.id] = clamp((map[target.id] || 0) - delta, -100, 100);
    a.socialRelations = map;
  });
  notificationBus.emit({ type: 'quest', title: 'Rumor', message: `${source.name} espalhou rumores sobre ${target.name}.`, icon: '🗣️', duration: 3000 });
}

export function tradeInformation(npc: Hero, player: Hero, price: number, info: string) {
  const prog = { ...player.progression };
  if ((prog.gold || 0) < price) return false;
  prog.gold = (prog.gold || 0) - price;
  player.progression = prog;
  notificationBus.emit({ type: 'quest', title: 'Informação', message: `${npc.name}: ${info}`, icon: '📜', duration: 3200 });
  return true;
}