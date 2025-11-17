import { Hero, HeroAttributes } from '../types/hero';
import { notificationBus } from '../components/NotificationSystem';
import { getGameSettings } from '../store/gameSettingsStore';

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
    const routine = npc.npcRoutine || [];
    const currentSlot = routine.find(r => {
      const [sh, sm] = (r.start || '00:00').split(':').map(Number);
      const [eh, em] = (r.end || '23:59').split(':').map(Number);
      const h = hour;
      return h >= sh && h < eh;
    });
    const bias = currentSlot?.activity || 'exploracao';
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
      const baseDelta = Math.floor(-3 + rng() * 7);
      const repBoost = Math.floor(((player.reputationFactions || []).reduce((s, f) => s + Math.max(0, f.reputation), 0)) / 500);
      const delta = clamp(baseDelta + repBoost, -5, 5);
      adjustAffinity(npc, player.id, delta);
      const mood = delta >= 2 ? 'amigável' : delta <= -2 ? 'hostil' : 'neutro';
      npc.npcMemory?.interactions.push({ heroId: player.id, ts: new Date().toISOString(), summary: `social_${mood}`, impact: delta });
      events.push({ type: 'achievement', title: 'Interação Social', message: `${npc.name} interagiu com você (${mood})`, icon: '💬', duration: 2500 });
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
    }
    const mem = npc.npcMemory || { interactions: [], preferences: {}, scoreByAction: {} };
    const s = mem.scoreByAction || {};
    s[action] = (s[action] || 0) + 1;
    mem.scoreByAction = s;
    npc.npcMemory = mem;
  });
  if (npcs.length > 1) {
    const a = pick(npcs);
    let b = pick(npcs);
    if (a.id === b.id && npcs.length > 1) b = npcs[(npcs.indexOf(a) + 1) % npcs.length];
    const delta = Math.floor(-2 + rng() * 5);
    const relA = { ...(a.socialRelations || {}) };
    relA[b.id] = clamp((relA[b.id] || 0) + delta, -100, 100);
    a.socialRelations = relA;
    const relB = { ...(b.socialRelations || {}) };
    relB[a.id] = clamp((relB[a.id] || 0) + delta, -100, 100);
    b.socialRelations = relB;
    events.push({ type: 'quest', title: 'Interação entre NPCs', message: `${a.name} e ${b.name} interagiram (${delta >= 2 ? 'amizade' : delta <= -2 ? 'rivalidade' : 'neutro'})`, icon: delta >= 2 ? '🤝' : delta <= -2 ? '⚔️' : '👋', duration: 2500 });
  }

  // Desafios de duelo (com base na rivalidade e diferença de nível)
  if (player) {
    const mod = (settings.npcInteractionDifficulty === 'high' ? 0.5 : settings.npcInteractionDifficulty === 'low' ? 0.2 : 0.35);
    const moderate = settings.npcDuelRivalryModerate ?? -30;
    const high = settings.npcDuelRivalryHigh ?? -60;
    const maxDiff = settings.npcDuelLevelDiffMax ?? 5;
    const duelCandidates = npcs.filter(n => {
      const r = (n.socialRelations || {})[player.id] || 0;
      const levelDiff = Math.abs((n.progression?.level || n.level || 1) - (player.progression?.level || player.level || 1));
      return (r <= moderate && levelDiff <= maxDiff);
    });
    if (duelCandidates.length && Math.random() < mod) {
      const challenger = pick(duelCandidates);
      const r = (challenger.socialRelations || {})[player.id] || 0;
      const levelDiff = Math.abs((challenger.progression?.level || 1) - (player.progression?.level || 1));
      const type: 'treino' | 'honra' | 'recompensas' = r <= high ? 'honra' : (r <= moderate ? 'treino' : 'recompensas');
      const invite = { npcId: challenger.id, type, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), levelDiff };
      const invites = Array.isArray(player.duelInvites) ? player.duelInvites : [];
      (player as any).duelInvites = [...invites, invite];
      events.push({ type: 'quest', title: 'Desafio de Duelo', message: `${challenger.name} desafiou você para um duelo (${type})`, icon: '⚔️', duration: 3000 });
    }
  }

  // Emit compacted notifications
  const mode = settings.npcNotificationsMode || 'compact';
  const maxPerTick = Math.max(0, settings.npcNotifyMaxPerTick ?? 3);
  if (mode === 'off') return;
  if (mode === 'normal') {
    events.slice(0, maxPerTick).forEach(e => emit(e));
    return;
  }
  const counts: Record<string, number> = {};
  events.forEach(e => { counts[e.title] = (counts[e.title] || 0) + 1; });
  const summary = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([title, n]) => `${title} x${n}`)
    .join(' • ');
  const highlight = events.find(e => e.title === 'Missão de NPC') || events[0];
  const msg = `${summary}${highlight ? ` • Destaque: ${highlight.message}` : ''}`.trim();
  emit({ type: 'quest', title: 'Atividades de NPC', message: msg, icon: '👥', duration: 3500 });
}