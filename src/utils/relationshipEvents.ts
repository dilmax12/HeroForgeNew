import { Hero } from '../types/hero';
import { getGameSettings } from '../store/gameSettingsStore';
import { notificationBus } from '../components/NotificationSystem';
import { computeTier } from './relationshipSystem';

function nowIso() { return new Date().toISOString(); }

export function maybeTriggerSpecialEvents(npc: Hero, player: Hero) {
  const s = getGameSettings();
  if (s.randomEventsEnabled === false) return;
  const relVal = (npc.socialRelations || {})[player.id] || 0;
  const tier = computeTier(relVal);
  const mem = npc.npcMemory || { interactions: [], preferences: {}, scoreByAction: {}, lastInteractionByType: {} };
  const lastEv = mem.lastInteractionByType?.['special_event'];
  const daysMin = Math.max(2, s.eventsCooldownDaysMin ?? 2);
  const daysMax = Math.max(daysMin, s.eventsCooldownDaysMax ?? 4);
  const elapsedDays = lastEv ? (Date.now() - new Date(lastEv).getTime()) / (24 * 60 * 60 * 1000) : 999;
  if (elapsedDays < daysMin) return;
  const freqPerDay = Math.max(1, Math.min(5, s.eventsCascadePerDay ?? 2));
  const chance = Math.min(0.9, freqPerDay / 10); // 0.1..0.5
  const rivalChance = Math.max(0.15, Math.min(0.3, s.rivalEncounterChance ?? 0.2));
  const progressLevels = [3,5,7];
  const tierIndex = tier === 'conhecido' ? 1 : tier === 'amigo' ? 3 : tier === 'melhor_amigo' ? 5 : tier === 'aliado' ? 7 : tier === 'rival' ? 0 : 0;
  const shouldProgressEvent = progressLevels.includes(tierIndex);
  if (!shouldProgressEvent && Math.random() >= chance) return;
  const type = tier === 'rival' && Math.random() < rivalChance ? 'rival_encounter' : (shouldProgressEvent ? 'celebration' : 'welcome');
  const msg = type === 'celebration' ? `${npc.name} celebra o novo nível de relação (${tier}).` : type === 'welcome' ? `${npc.name} dá boas-vindas ao novo vínculo (${tier}).` : `${npc.name} rival apareceu para testar seu vínculo!`;
  notificationBus.emit({ type: 'quest', title: 'Evento Especial', message: msg, icon: type === 'celebration' ? '🎉' : type === 'welcome' ? '🥂' : '⚔️', duration: 3500 });
  const li = { ...(mem.lastInteractionByType || {}) };
  li['special_event'] = nowIso();
  npc.npcMemory = { ...mem, lastInteractionByType: li };
}