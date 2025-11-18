import { Hero } from '../types/hero';
import { getGameSettings } from '../store/gameSettingsStore';

export type RelationTier = 'rival' | 'neutro' | 'conhecido' | 'amigo' | 'melhor_amigo' | 'aliado';

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export function computeTier(v: number): RelationTier {
  const s = getGameSettings();
  if (v <= (s.npcRelationRivalThreshold ?? -30)) return 'rival';
  if (v >= (s.npcRelationAllyThreshold ?? 90)) return 'aliado';
  if (v >= (s.npcRelationBestFriendThreshold ?? 75)) return 'melhor_amigo';
  if (v >= (s.npcRelationFriendThreshold ?? 40)) return 'amigo';
  if (v >= (s.npcRelationKnownThreshold ?? 10)) return 'conhecido';
  return 'neutro';
}

export function applyDecay(npc: Hero, targetId: string) {
  const s = getGameSettings();
  const last = npc.npcMemory?.lastContactByHeroId?.[targetId];
  const rel = (npc.socialRelations || {})[targetId] || 0;
  if (!last) return rel;
  const elapsedDays = (Date.now() - new Date(last).getTime()) / (24 * 60 * 60 * 1000);
  const decayPerDay = s.npcRelationDecayPerDay ?? 0.5;
  const decayed = rel - elapsedDays * decayPerDay;
  const newVal = clamp(decayed, -100, 100);
  const map = { ...(npc.socialRelations || {}) };
  map[targetId] = newVal;
  npc.socialRelations = map;
  return newVal;
}

export function updateOnSocial(npc: Hero, player: Hero, mood: 'amigável' | 'neutro' | 'hostil') {
  const s = getGameSettings();
  const basePos = s.npcRelationPositiveWeight ?? 4;
  const baseNeg = s.npcRelationNegativeWeight ?? 5;
  const mem = npc.npcMemory || { interactions: [], preferences: {}, scoreByAction: {}, friendStatusByHeroId: {}, lastContactByHeroId: {}, lastInteractionByType: {} };
  const historyBoost = mem.interactions.filter(i => i.heroId === player.id && (i.impact || 0) > 0).length;
  const timeBoost = mem.lastContactByHeroId?.[player.id] ? Math.max(0, 3 - ((Date.now() - new Date(mem.lastContactByHeroId[player.id]).getTime()) / (60 * 60 * 1000))) : 0;
  const delta = mood === 'amigável' ? basePos + Math.min(3, historyBoost) + Math.floor(timeBoost) : mood === 'neutro' ? 1 : -baseNeg;
  const map = { ...(npc.socialRelations || {}) };
  const current = map[player.id] || 0;
  const intensity = (s.relationIntensityPercent ?? 100) / 100;
  const diminish = Math.max(0.2, (100 - Math.max(0, current)) / 100);
  const deltaScaled = Math.ceil(delta * intensity * diminish);
  const newVal = clamp(current + deltaScaled, -100, 100);
  map[player.id] = newVal;
  npc.socialRelations = map;
  const tier = computeTier(newVal);
  mem.friendStatusByHeroId = { ...(mem.friendStatusByHeroId || {}), [player.id]: tier === 'neutro' ? mem.friendStatusByHeroId?.[player.id] || 'neutro' : (tier as any) };
  mem.lastContactByHeroId = { ...(mem.lastContactByHeroId || {}), [player.id]: new Date().toISOString() };
  npc.npcMemory = mem;
  return { value: newVal, tier };
}

export function cascadeGlobalReputation(player: Hero, npcs: Hero[]) {
  const totalPos = (player.reputationFactions || []).reduce((s, f) => s + Math.max(0, f.reputation || 0), 0);
  if (totalPos <= 0) return;
  const s = getGameSettings();
  const percent = s.npcRelationFactionCascadePercent ?? 0.02;
  const delta = Math.floor(totalPos * percent);
  npcs.forEach(n => {
    const map = { ...(n.socialRelations || {}) };
    const last = n.npcMemory?.lastContactByHeroId?.[player.id];
    const recentDays = last ? (Date.now() - new Date(last).getTime()) / (24 * 60 * 60 * 1000) : Infinity;
    if (recentDays <= 3) {
      map[player.id] = clamp((map[player.id] || 0) + Math.min(2, delta), -100, 100);
    }
    n.socialRelations = map;
  });
}

export function randomNpcNpcEvent(npcs: Hero[]) {
  if (npcs.length < 2) return null;
  const a = npcs[Math.floor(Math.random() * npcs.length)];
  let b = npcs[Math.floor(Math.random() * npcs.length)];
  if (a.id === b.id) b = npcs[(npcs.indexOf(a) + 1) % npcs.length];
  const delta = Math.floor(-3 + Math.random() * 7);
  const relA = { ...(a.socialRelations || {}) };
  relA[b.id] = clamp((relA[b.id] || 0) + delta, -100, 100);
  a.socialRelations = relA;
  const relB = { ...(b.socialRelations || {}) };
  relB[a.id] = clamp((relB[a.id] || 0) + delta, -100, 100);
  b.socialRelations = relB;
  return { a, b, delta };
}