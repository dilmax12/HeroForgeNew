import { Hero, HeroAttributes } from '../types/hero';
import { notificationBus } from '../components/NotificationSystem';
import { getGameSettings } from '../store/gameSettingsStore';
import { updateOnSocial, cascadeGlobalReputation, randomNpcNpcEvent } from './relationshipSystem';
import { maybeTriggerSpecialEvents } from './relationshipEvents';
import { getNPCDialogue, getSimsDialogueTriplet } from '../services/npcDialogueService';
import { useHeroStore } from '../store/heroStore';

type RNG = () => number;

const rng: RNG = () => Math.random();

function pick<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

export function seedPersonality(hero: Hero) {
  const archetypes: Hero['npcPersonality']['archetype'][] = ['competitivo','colaborativo','mercador','explorador','sabio','caotico'];
  const chatStyles: Hero['npcPersonality']['chatStyle'][] = ['amigavel','sarcastico','formal','quieto'];
  const traitsPool = ['impulsivo','estrategista','generoso','ambicioso','curioso','desconfiado','leal','astuto','honrado'];
  const pers = {
    archetype: pick(archetypes),
    traits: Array.from({ length: 3 }, () => pick(traitsPool)),
    riskAffinity: Math.floor(rng() * 100),
    chatStyle: pick(chatStyles),
    prefersParty: rng() < 0.6
  } as Hero['npcPersonality'];
  const routine = [
    { start: '06:00', end: '09:00', activity: 'treino', location: 'sala_treino' },
    { start: '09:00', end: '12:00', activity: 'missao', location: 'campo' },
    { start: '12:00', end: '13:00', activity: 'taverna', location: 'taverna' },
    { start: '13:00', end: '18:00', activity: 'exploracao', location: 'periferia' },
    { start: '18:00', end: '22:00', activity: 'social', location: 'foja' }
  ];
  hero.npcPersonality = pers;
  hero.npcRoutine = routine;
  hero.npcMemory = hero.npcMemory || { interactions: [], preferences: {}, scoreByAction: {} };
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function adjustAffinity(npc: Hero, targetId: string, delta: number) {
  const rel = { ...(npc.socialRelations || {}) };
  rel[targetId] = clamp((rel[targetId] || 0) + delta, -100, 100);
  npc.socialRelations = rel;
}

function improveAttributes(npc: Hero, mult: number) {
  const attrs: HeroAttributes = { ...npc.attributes };
  const keys: (keyof HeroAttributes)[] = ['forca','destreza','constituicao','inteligencia','sabedoria','carisma'];
  const k = pick(keys);
  attrs[k] = clamp(attrs[k] + Math.round(1 * mult), 0, 10);
  return attrs;
}

export function runTick(player: Hero | undefined, npcs: Hero[], emit: typeof notificationBus.emit) {
  const now = new Date();
  const hour = now.getHours();
  const settings = getGameSettings();
  const events: Array<{ type: string; title: string; message: string; icon?: string; duration?: number }> = [];
  npcs.forEach(npc => {
    // Mini-life needs drift
    const needs = npc.npcNeeds || { fadiga: 20, fome: 20, social: 50, aventura: 40, tarefa: 40 };
    needs.fadiga = Math.min(100, needs.fadiga + 1);
    needs.fome = Math.min(100, needs.fome + (rng() < 0.5 ? 0 : 1));
    needs.social = Math.max(0, needs.social - (rng() < 0.5 ? 0 : 1));
    needs.aventura = Math.min(100, needs.aventura + (Math.random() < 0.3 ? 2 : 0));
    needs.tarefa = Math.max(0, needs.tarefa - (Math.random() < 0.2 ? 1 : 0));
    npc.npcNeeds = needs;

    // Mood from needs and routine
    const fatigueHigh = needs.fadiga > 70;
    const hungerHigh = needs.fome > 70;
    const socialLow = needs.social < 30;
    const baseMood: Hero['npcMood'] = hungerHigh ? 'irritado' : fatigueHigh ? 'cansado' : socialLow ? 'triste' : 'neutro';
    npc.npcMood = baseMood;
    const routine = npc.npcRoutine || [];
    const currentSlot = routine.find(r => {
      const [sh, sm] = (r.start || '00:00').split(':').map(Number);
      const [eh, em] = (r.end || '23:59').split(':').map(Number);
      const h = hour;
      return h >= sh && h < eh;
    });
    const bias = currentSlot?.activity || 'exploracao';
    if (player) {
      const relVal = (npc.socialRelations || {})[player.id] || 0;
      if (relVal >= 40) npc.npcMood = 'feliz';
      else if (relVal >= 20 && npc.npcMood !== 'irritado' && npc.npcMood !== 'cansado') npc.npcMood = 'tranquilo';
    }
    if (bias === 'taverna') {
      needs.fome = Math.max(0, needs.fome - 15);
      needs.fadiga = Math.max(0, needs.fadiga - 10);
      needs.social = Math.min(100, needs.social + 10);
    }
    const pool = bias === 'treino' ? ['treino','treino','social','mercado']
      : bias === 'missao' ? ['missao','missao','exploracao','social']
      : bias === 'social' ? ['social','social','mercado','treino']
      : ['exploracao','missao','treino','mercado'];
    const pref = npc.npcPersonality?.prefersParty ? ['social', ...pool] : pool;
    const action = pick(pref);
    if (action === 'treino') {
      const attrs = improveAttributes(npc, 1);
      npc.attributes = attrs;
      npc.stats.totalPlayTime = (npc.stats.totalPlayTime || 0) + 1;
      npc.npcMemory?.interactions.push({ heroId: npc.id, ts: new Date().toISOString(), summary: 'treino', impact: 1 });
      events.push({ type: 'xp', title: 'Treino de NPC', message: `${npc.name} aprimorou seus atributos`, icon: '🏋️', duration: 2500 });
      needs.fome = Math.min(100, needs.fome + 2);
    }
    if (action === 'missao') {
      const gainXp = Math.floor(10 + rng() * 40);
      const gainGold = Math.floor(5 + rng() * 30);
      npc.progression.xp += gainXp;
      npc.progression.gold += gainGold;
      npc.stats.questsCompleted += 1;
      npc.completedQuests = [...npc.completedQuests, `npc-${Date.now()}`].slice(-50);
      npc.npcMemory?.interactions.push({ heroId: npc.id, ts: new Date().toISOString(), summary: 'missao', impact: 2 });
      const ra = Math.max(0, (npc.npcPersonality?.riskAffinity || 0));
      const adjust = gainXp > 30 ? 2 : -1;
      npc.npcPersonality = { ...(npc.npcPersonality || { archetype: 'explorador', traits: [], riskAffinity: 50, chatStyle: 'amigavel' }), riskAffinity: clamp(ra + adjust, 0, 100) };
      events.push({ type: 'quest', title: 'Missão de NPC', message: `${npc.name} concluiu uma missão (+${gainXp} XP, +${gainGold} ouro)`, icon: '📜', duration: 2800 });
    }
    if (action === 'social' && player) {
      const baseDelta = Math.floor(-1 + rng() * 5);
      const repBoost = Math.floor(((player.reputationFactions || []).reduce((s, f) => s + Math.max(0, f.reputation), 0)) / 500);
      const effective = clamp(baseDelta + repBoost, -5, 5);
      const mood = effective >= 2 ? 'amigável' : effective <= -2 ? 'hostil' : 'neutro';
      const relRes = updateOnSocial(npc, player, mood);
      npc.npcMemory?.interactions.push({ heroId: player.id, ts: new Date().toISOString(), summary: `social_${mood}`, impact: effective });
      events.push({ type: 'achievement', title: 'Interação Social', message: `${npc.name} interagiu com você (${mood})`, icon: '💬', duration: 2500 });
      const notes = npc.npcMemory?.socialNotesByHeroId || {};
      const arr = notes[player.id] || [];
      notes[player.id] = [...arr, `${new Date().toLocaleString()} • ${mood}`].slice(-20);
      npc.npcMemory = { ...(npc.npcMemory || {}), socialNotesByHeroId: notes };
      try { maybeTriggerSpecialEvents(npc, player); } catch {}
      // Atualizar contato
      const mem = npc.npcMemory || { interactions: [], preferences: {}, scoreByAction: {} };
      mem.lastContactByHeroId = { ...(mem.lastContactByHeroId || {}), [player.id]: new Date().toISOString() };
      // Cooldown por tipo
      const cdSec = settings.npcInteractionCooldownSeconds ?? 90;
      const nowIso = new Date().toISOString();
      const canEmitKey = (key: string) => {
        const last = (mem.lastInteractionByType || {})[key];
        if (!last) return true;
        return (Date.now() - new Date(last).getTime()) / 1000 >= cdSec;
      };
      mem.lastInteractionByType = mem.lastInteractionByType || {};
      if (canEmitKey('social')) { mem.lastInteractionByType['social'] = nowIso; } else { events.pop(); }
      // Verificar amizade
      const relVal = (npc.socialRelations || {})[player.id] || 0;
      const positives = (mem.interactions || []).filter(i => i.heroId === player.id && (i.summary.includes('amigável') || i.summary.includes('missao'))).length;
      const lastTsStr = (mem.lastContactByHeroId || {})[player.id];
      const lastMs = lastTsStr ? new Date(lastTsStr).getTime() : 0;
      const sinceMin = lastMs ? Math.floor((Date.now() - lastMs) / 60000) : 999;
      const k = settings.npcRelationKnownThreshold ?? 10;
      const f = settings.npcRelationFriendThreshold ?? 40;
      const b = settings.npcRelationBestFriendThreshold ?? 75;
      let status: 'conhecido' | 'amigo' | 'melhor_amigo' | undefined;
      if (relVal >= b && positives >= 3 && sinceMin <= 180) status = 'melhor_amigo';
      else if (relVal >= f && positives >= 2 && sinceMin <= 360) status = 'amigo';
      else if (relVal >= k) status = 'conhecido';
      if (status) {
        mem.friendStatusByHeroId = { ...(mem.friendStatusByHeroId || {}), [player.id]: status };
        npc.npcMemory = mem;
        const pFriends = Array.isArray(player.friends) ? player.friends : [];
        const pBest = Array.isArray(player.bestFriends) ? player.bestFriends : [];
        const updates: Partial<Hero> = {};
        if (status === 'amigo' && !pFriends.includes(npc.id)) (updates as any).friends = [...pFriends, npc.id];
        if (status === 'melhor_amigo' && !pBest.includes(npc.id)) (updates as any).bestFriends = [...pBest, npc.id];
        if (Object.keys(updates).length) {
          events.push({ type: 'achievement', title: 'Nova Relação', message: `${npc.name} agora é seu ${status.replace('_',' ')}`, icon: '🤝', duration: 2600 });
        }
      }
    }
    if (action === 'mercado') {
      const gainGold = Math.floor(3 + rng() * 20);
      npc.progression.gold += gainGold;
      const mem = npc.npcMemory || { interactions: [], preferences: {}, scoreByAction: {} };
      const nowIso = new Date().toISOString();
      const cdSec = settings.npcInteractionCooldownSeconds ?? 90;
      const last = (mem.lastInteractionByType || {})['mercado'];
      if (!last || (Date.now() - new Date(last).getTime()) / 1000 >= cdSec) {
        events.push({ type: 'item', title: 'Trocas de NPC', message: `${npc.name} negociou no mercado (+${gainGold} ouro)`, icon: '🪙', duration: 2200 });
        mem.lastInteractionByType = { ...(mem.lastInteractionByType || {}), mercado: nowIso };
      }
      npc.npcMemory = mem;
      needs.fome = Math.max(0, needs.fome - 2);
    }
    if (action === 'exploracao') {
      const found = rng() < 0.3;
      npc.stats.itemsFound += found ? 1 : 0;
      const mem = npc.npcMemory || { interactions: [], preferences: {}, scoreByAction: {} };
      const nowIso = new Date().toISOString();
      const cdSec = settings.npcInteractionCooldownSeconds ?? 90;
      const last = (mem.lastInteractionByType || {})['exploracao'];
      if (!last || (Date.now() - new Date(last).getTime()) / 1000 >= cdSec) {
        events.push({ type: 'quest', title: 'Exploração de NPC', message: found ? `${npc.name} encontrou um item raro` : `${npc.name} explorou áreas próximas`, icon: found ? '✨' : '🧭', duration: 2200 });
        mem.lastInteractionByType = { ...(mem.lastInteractionByType || {}), exploracao: nowIso };
      }
      npc.npcMemory = mem;
      needs.fome = Math.min(100, needs.fome + 1);
    }
    const mem = npc.npcMemory || { interactions: [], preferences: {}, scoreByAction: {} };
    const s = mem.scoreByAction || {};
    s[action] = (s[action] || 0) + 1;
    mem.scoreByAction = s;
    npc.npcMemory = mem;
  });
  if (npcs.length > 1) {
    const r = randomNpcNpcEvent(npcs);
    if (r) events.push({ type: 'quest', title: 'Interação entre NPCs', message: `${r.a.name} e ${r.b.name} interagiram (${r.delta >= 2 ? 'amizade' : r.delta <= -2 ? 'rivalidade' : 'neutro'})`, icon: r.delta >= 2 ? '🤝' : r.delta <= -2 ? '⚔️' : '👋', duration: 2500 });
  }

  if (player && Math.random() < 0.2) cascadeGlobalReputation(player, npcs);

  // Desafios de duelo (com base na rivalidade e diferença de nível)
  if (player) {
    const mod = (settings.npcInteractionDifficulty === 'high' ? 0.5 : settings.npcInteractionDifficulty === 'low' ? 0.2 : 0.35);
    const moderate = settings.npcDuelRivalryModerate ?? -30;
    const high = settings.npcDuelRivalryHigh ?? -60;
    const maxDiff = settings.npcDuelLevelDiffMax ?? 5;
    const rivals = npcs.filter(n => {
      const r = (n.socialRelations || {})[player.id] || 0;
      const levelDiff = Math.abs((n.progression?.level || n.level || 1) - (player.progression?.level || player.level || 1));
      return (r <= moderate && levelDiff <= maxDiff);
    });
    const friendlyTrainChance = 0.15;
    const friendly = npcs.filter(n => {
      const r = (n.socialRelations || {})[player.id] || 0;
      const levelDiff = Math.abs((n.progression?.level || n.level || 1) - (player.progression?.level || player.level || 1));
      return (r > moderate && levelDiff <= maxDiff);
    });
    const shouldTrain = friendly.length > 0 && Math.random() < friendlyTrainChance;
    const pool = rivals.length ? rivals : (shouldTrain ? friendly : []);
    if (pool.length && Math.random() < mod) {
      const challenger = pick(pool);
      const r = (challenger.socialRelations || {})[player.id] || 0;
      const levelDiff = Math.abs((challenger.progression?.level || 1) - (player.progression?.level || 1));
      const type: 'treino' | 'honra' | 'recompensas' = rivals.includes(challenger) ? (r <= high ? 'honra' : 'treino') : 'treino';
      const invite = { npcId: challenger.id, type, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), levelDiff };
      const invites = Array.isArray(player.duelInvites) ? player.duelInvites : [];
      (player as any).duelInvites = [...invites, invite];
      events.push({ type: 'quest', title: 'Desafio de Duelo', message: `${challenger.name} desafiou você para um duelo (${type})`, icon: '⚔️', duration: 3000 });
    }
  }

  // Emit compacted notifications
  const allowedTitles = new Set(['Interação Social','Nova Relação']);
  const filtered = events.filter(e => allowedTitles.has(e.title));
  const maxPerTick = 1;
  for (let i = 0; i < Math.min(maxPerTick, filtered.length); i++) {
    const idx = Math.floor(Math.random() * filtered.length);
    const e = filtered.splice(idx, 1)[0];
    emit(e);
  }

  // Sims-like spontaneous interaction trigger
  // Overlay de diálogo espontâneo removido do tick global.
}