import { Hero } from '../types/hero';
import { updateOnSocial } from './relationshipSystem';
import { notificationBus } from '../components/NotificationSystem';
import { useHeroStore } from '../store/heroStore';

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

export function actionConversar(npc: Hero, player: Hero) {
  const mood = (npc.npcMood || 'neutro') === 'irritado' ? 'hostil' : 'amigável';
  const res = updateOnSocial(npc, player, mood === 'amigável' ? 'amigável' : 'neutro');
  notificationBus.emit({ type: 'quest', title: 'Conversar', message: `${npc.name}: relação ${res.value}`, icon: '💬', duration: 2000 });
}

export function actionElogiar(npc: Hero, player: Hero) {
  const good = npc.npcMood !== 'irritado' && npc.npcMood !== 'triste';
  const delta = good ? 5 : -3;
  const map = { ...(npc.socialRelations || {}) };
  const relCur = map[player.id] || 0;
  const factor = Math.max(0.2, (100 - Math.max(0, relCur)) / 100);
  const deltaScaled = Math.ceil(delta * factor);
  map[player.id] = clamp(relCur + deltaScaled, -100, 100);
  npc.socialRelations = map;
  notificationBus.emit({ type: good ? 'achievement' : 'stamina', title: 'Elogiar', message: `${npc.name} ${good ? 'apreciou' : 'não gostou'} do elogio`, icon: good ? '🙂' : '😠', duration: 2000 });
}

export function actionPedirAjuda(npc: Hero, player: Hero) {
  const rel = (npc.socialRelations || {})[player.id] || 0;
  const ok = rel >= 20 && npc.npcMood !== 'irritado' && npc.npcMood !== 'cansado';
  if (ok) {
    const types: Array<'boost_xp'|'stamina_refill'|'reduce_cooldown'|'boost_initiative'|'gold_bonus'|'success_boost'|'stamina_discount'|'loot_bonus'|'ambush_shield'> = ['boost_xp','stamina_refill','reduce_cooldown','boost_initiative','gold_bonus','success_boost','stamina_discount','loot_bonus','ambush_shield'];
    const pick = types[Math.floor(Math.random()*types.length)];
    const now = Date.now();
    const level = rel >= 80 ? 3 : rel >= 50 ? 2 : 1;
    const helpStatus: any = { type: pick, missionsRemaining: 1, expiresAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(), level };
    if (pick === 'boost_xp') helpStatus.boostXpPercent = level === 3 ? 0.20 : level === 2 ? 0.15 : 0.10;
    if (pick === 'boost_initiative') helpStatus.initiativeBonus = level === 3 ? 8 : level === 2 ? 6 : 5;
    if (pick === 'gold_bonus') helpStatus.goldBonusPercent = level === 3 ? 0.20 : level === 2 ? 0.15 : 0.10;
    if (pick === 'success_boost') helpStatus.successBoostPercent = level === 3 ? 0.10 : level === 2 ? 0.07 : 0.05;
    if (pick === 'stamina_discount') helpStatus.staminaCostReduction = level === 3 ? 2 : 1;
    if (pick === 'loot_bonus') helpStatus.lootDropBonusPercent = level === 3 ? 0.25 : level === 2 ? 0.15 : 0.10;
    if (pick === 'ambush_shield') helpStatus.ambushReductionPercent = level === 3 ? 0.5 : level === 2 ? 0.35 : 0.2;
    if (pick === 'reduce_cooldown') helpStatus.reduceCooldownMinutes = level === 3 ? 12 : level === 2 ? 8 : 5;
    if (pick === 'stamina_refill') {
      const refill = level === 3 ? 30 : level === 2 ? 20 : 10;
      const cur = Math.max(0, Number(player.progression?.fatigue || 0));
      const next = Math.max(0, cur - refill);
      helpStatus.staminaRefillAmount = refill;
      useHeroStore.getState().updateHero(player.id, { progression: { ...(player.progression || {}), fatigue: next } });
    }
    const stats = { ...(player.stats || {}) } as any;
    stats.helpStatus = helpStatus;
    useHeroStore.getState().updateHero(player.id, { stats });
    const msg = pick === 'boost_xp'
      ? `+${Math.round((helpStatus.boostXpPercent || 0)*100)}% XP na próxima missão`
      : pick === 'stamina_refill'
      ? `Fadiga -${helpStatus.staminaRefillAmount || 10}`
      : pick === 'reduce_cooldown'
      ? `Cooldown -${helpStatus.reduceCooldownMinutes || 5} min na próxima missão`
      : pick === 'boost_initiative'
      ? `+${helpStatus.initiativeBonus || 5} Iniciativa na próxima missão`
      : pick === 'gold_bonus'
      ? `+${Math.round((helpStatus.goldBonusPercent || 0)*100)}% ouro na próxima missão`
      : pick === 'success_boost'
      ? `+${Math.round((helpStatus.successBoostPercent || 0)*100)}% chance de sucesso nas fases`
      : pick === 'stamina_discount'
      ? `Custo de Fadiga reduzido em ${helpStatus.staminaCostReduction || 1}`
      : pick === 'loot_bonus'
      ? `Chance de loot +${Math.round((helpStatus.lootDropBonusPercent || 0)*100)}%`
      : `Proteção contra emboscada (${Math.round((helpStatus.ambushReductionPercent || 0)*100)}% menos risco/dano)`;
    notificationBus.emit({ type: 'achievement', title: 'Ajuda concedida', message: `${npc.name}: ${msg}`, icon: '🤝', duration: 2500 });
  } else {
    notificationBus.emit({ type: 'stamina', title: 'Pedir ajuda', message: `${npc.name} recusou`, icon: '✋', duration: 2000 });
  }
}

export function actionDarPresente(npc: Hero, player: Hero, itemId: string) {
  const bias = itemId.includes('pocao') ? 'guerreiro' : itemId.includes('pedra') || itemId.includes('arcane') ? 'mago' : itemId.includes('flor') || itemId.includes('vinculo') ? 'social' : 'neutro';
  let delta = 4;
  if (bias === 'guerreiro' && (npc.class === 'guerreiro' || npc.class === 'paladino')) delta = 7;
  if (bias === 'mago' && (npc.class === 'mago' || npc.class === 'feiticeiro')) delta = 7;
  if (bias === 'social') delta = 6;
  const map = { ...(npc.socialRelations || {}) };
  const relCur = map[player.id] || 0;
  const factor = Math.max(0.2, (100 - Math.max(0, relCur)) / 100);
  const deltaScaled = Math.ceil(delta * factor);
  map[player.id] = clamp(relCur + deltaScaled, -100, 100);
  npc.socialRelations = map;
  const mem = { ...(npc.npcMemory || {}) } as any;
  const giftStats = { ...(mem.giftStatsByHeroId || {}) } as Record<string, { count: number; quality: number }>;
  const q = itemId.includes('lendario') || itemId.includes('deluxe') ? 3 : itemId.includes('epico') ? 2 : 1;
  const cur = giftStats[player.id] || { count: 0, quality: 0 };
  const next = { count: cur.count + 1, quality: cur.quality + q };
  giftStats[player.id] = next;
  mem.giftStatsByHeroId = giftStats;
  useHeroStore.getState().updateHero(npc.id, { npcMemory: mem });
  notificationBus.emit({ type: 'achievement', title: 'Presente', message: `${npc.name} gostou do presente (${itemId})`, icon: '🎁', duration: 2000 });
  if (next.count >= 3 && next.quality >= 5) {
    try {
      const reward = itemId.includes('pocao') ? 'pergaminho-protecao' : itemId.includes('pedra') ? 'essencia-vinculo' : 'racao-basica';
      useHeroStore.getState().addItemToInventory(player.id, reward, 1);
      notificationBus.emit({ type: 'achievement', title: 'Recompensa de Presente', message: `${npc.name} te deu ${reward} em agradecimento!`, icon: '🏅', duration: 3000 });
    } catch {}
  }
}

export function actionProvocar(npc: Hero, player: Hero) {
  const map = { ...(npc.socialRelations || {}) };
  map[player.id] = clamp((map[player.id] || 0) - 8, -100, 100);
  npc.socialRelations = map;
  notificationBus.emit({ type: 'stamina', title: 'Provocar', message: `${npc.name} ficou irritado`, icon: '⚠️', duration: 2000 });
}
