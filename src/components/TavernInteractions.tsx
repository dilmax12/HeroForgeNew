import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { generateMixed, generateDialogue } from '../utils/dialogueEngine';
import { tokens } from '../styles/designTokens';
import { medievalTheme, seasonalThemes } from '../styles/medievalTheme';
import { useMonetizationStore } from '../store/monetizationStore';
import { actionConversar, actionElogiar, actionPedirAjuda, actionDarPresente, actionProvocar } from '../utils/socialActions';
import { aiService } from '../services/aiService';
import { getGameSettings } from '../store/gameSettingsStore';

const Badge: React.FC<{ color: string; icon: string; label: string }> = ({ color, icon, label }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium border`} style={{ borderColor: color, color }}>
    <span className="mr-1">{icon}</span>{label}
  </span>
);

const TavernInteractions: React.FC = () => {
  const { heroes, getSelectedHero, setNPCInteractionOverlay } = useHeroStore() as any;
  const updateHero = useHeroStore((s: any) => s.updateHero);
  const restAtTavern = useHeroStore((s: any) => s.restAtTavern);
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-amber-600/30' : 'border-amber-600/30';
  const player = getSelectedHero();
  const npcs = useMemo(() => heroes.filter((h: any) => h.origin === 'npc'), [heroes]);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  useEffect(() => {
    const ids = npcs.map((n: any) => n.id);
    function sample(arr: string[], k: number) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a.slice(0, Math.max(0, Math.min(6, a.length)));
    }
    setVisibleIds(sample(ids, 6));
    const iv = setInterval(() => {
      const latestIds = npcs.map((n: any) => n.id);
      setVisibleIds(sample(latestIds, 6));
    }, 60000);
    return () => clearInterval(iv);
  }, [npcs.length]);
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  if (!player || npcs.length === 0) return null;
  const npc = npcs.find(n => n.id === activeNpcId) || npcs.find(n => visibleIds.includes(n.id)) || npcs[0];
  const lines = generateMixed(npc, player, 1);
  const morning = generateDialogue(npc, player, ['time_morning'], 1);
  const evening = generateDialogue(npc, player, ['time_evening'], 1);
  const gossip = generateDialogue(npc, player, ['gossip'], 1);
  const uniqueLines = Array.from(new Set([gossip[0], lines[0], morning[0], evening[0]].filter(Boolean)));
  const [aiCompact, setAiCompact] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const routine = (npc.npcRoutine || []).find(r => {
          const [sh, sm] = (r.start || '00:00').split(':').map(Number);
          const [eh, em] = (r.end || '23:59').split(':').map(Number);
          const h = new Date().getHours();
          return h >= sh && h < eh;
        });
        const activity = routine?.activity || 'exploracao';
        const mood = npc.npcMood || 'neutro';
        const rel = (npc.socialRelations || {})[player.id] || 0;
        const context = `Atividade atual: ${activity}. Humor: ${mood}. Relação com ${player.name}: ${rel}. Preferências: ${JSON.stringify(npc.npcMemory?.preferences || {})}. Últimas interações: ${(npc.npcMemory?.interactions || []).slice(-3).map(i => i.summary).join(', ')}`;
        const systemMessage = 'Você é um NPC de fantasia. Gere um único comentário curto e contextual (máx. 1 linha), em PT-BR, baseado na rotina atual, humor e memórias. Evite repetição e clichês. Somente texto do NPC.';
        const prompt = `Crie uma fala única e original relacionada à ${activity}, refletindo o humor ${mood}, mencionando discretamente um detalhe da rotina ou local, para o herói ${player.name}.`;
        const res = await aiService.generateTextSafe({ systemMessage, prompt, context, maxTokens: 120, temperature: 0.8 });
        const raw = (res.text || '').split('\n').map(s => s.trim()).filter(Boolean);
        const cleaned = raw.map(t => t.replace(/^NPC:\s*/i, '')).filter(t => t.length > 0);
        const picked = cleaned.slice(0, 1);
        if (!cancelled && picked.length) setAiCompact(picked);
      } catch {
        if (!cancelled) setAiCompact(null);
      }
    })();
    return () => { cancelled = true; };
  }, [npc.id, player.id, npc.npcMood]);
  const compact = (aiCompact && aiCompact.length) ? aiCompact : uniqueLines.slice(0, 1);

  const relVal = (npc.socialRelations || {})[player.id] || 0;
  const displayMood = relVal >= 40 ? 'feliz' : relVal >= 20 ? 'tranquilo' : npc.npcMood;
  const moodEmoji = displayMood === 'feliz' ? '😄' : displayMood === 'tranquilo' ? '🙂' : displayMood === 'neutro' ? '😐' : displayMood === 'estressado' ? '😣' : displayMood === 'irritado' ? '😡' : displayMood === 'triste' ? '😢' : '😴';
  const needs = npc.npcNeeds || { fadiga: 20, fome: 20, social: 50, aventura: 40, tarefa: 40 };
  return (
    <div className={`${tokens.cardBase} border ${seasonalBorder}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">🍺 Taverna</h2>
        <div className="flex items-center gap-2">
          <Badge color="#F59E0B" icon="🟠" label="Ambiental" />
          <Badge color="#10B981" icon="🟢" label="Social" />
          <Badge color="#EF4444" icon="🔴" label="Urgente" />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        {(visibleIds.length ? visibleIds : npcs.slice(0,6).map(n => n.id))
          .map(id => npcs.find(n => n.id === id))
          .filter(Boolean)
          .map(n => (
            <button key={n!.id} onClick={() => setActiveNpcId(n!.id)} className={`px-2 py-1 rounded border ${activeNpcId===n!.id ? tokens.tabActive : tokens.tabInactive}`}>{n!.name}</button>
          ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-xs text-gray-300">
          <span>Mood: {moodEmoji}</span>
          <span>💤 {needs.fadiga}%</span>
          <span>🍗 {needs.fome}%</span>
          <span>💬 {needs.social}%</span>
          <span>⚔️ {needs.aventura}%</span>
          <span>🔧 {needs.tarefa}%</span>
        </div>
        {compact.map((t,i) => (<div key={`l-${i}`} className="p-2 rounded border bg-gray-900 border-gray-700">{npc.name}: {t}</div>))}
      </div>
      {(() => {
        const s: any = player.stats || {};
        const lastMap = s.lastInteractionByNpcId || {};
        const lastIso = lastMap[npc.id];
        const sameDay = !!lastIso && new Date(lastIso).toDateString() === new Date().toDateString();
        const limit = (getGameSettings().dailyNpcInteractionsLimit ?? 2);
        const globalDate = s.dailyNpcInteractionsDate;
        const globalCount = s.dailyNpcInteractionsCount || 0;
        const todayStr = new Date().toDateString();
        const sameDayGlobal = !!globalDate && new Date(globalDate).toDateString() === todayStr;
        const canGlobal = !sameDayGlobal || globalCount < limit;
        const can = !sameDay && canGlobal;
        const mark = () => {
          const map = { ...(player.stats as any).lastInteractionByNpcId, [npc.id]: new Date().toISOString() };
          const baseStats = { ...player.stats } as any;
          const prevDate = baseStats.dailyNpcInteractionsDate;
          const prevCount = baseStats.dailyNpcInteractionsCount || 0;
          const isSame = !!prevDate && new Date(prevDate).toDateString() === todayStr;
          const nextCount = isSame ? prevCount + 1 : 1;
          const stats = { ...baseStats, lastInteractionByNpcId: map, dailyNpcInteractionsDate: new Date().toISOString(), dailyNpcInteractionsCount: nextCount };
          useHeroStore.getState().updateHero(player.id, { stats });
        };
        const runIfAllowed = (fn: () => void) => { if (!can) return; fn(); mark(); };
        return (
          <div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button onClick={() => runIfAllowed(() => actionConversar(npc, player))} className={`px-3 py-2 rounded ${can?`bg-gradient-to-r ${medievalTheme.gradients.buttons.secondary} text-white`:'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>💬 Conversar</button>
            <button onClick={() => runIfAllowed(() => actionElogiar(npc, player))} className={`px-3 py-2 rounded ${can?`bg-gradient-to-r ${medievalTheme.gradients.buttons.royal} text-white`:'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>😊 Elogiar</button>
            <button onClick={() => runIfAllowed(() => actionPedirAjuda(npc, player))} className={`px-3 py-2 rounded ${can?`bg-gradient-to-r ${medievalTheme.gradients.buttons.primary} text-white`:'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>🤝 Pedir Ajuda</button>
            <div className="flex items-center gap-2">
              <select id="gift-type" className="px-2 py-1 border rounded text-sm bg-gray-900 text-gray-200 border-gray-700">
                <option value="pocao-media">Poção</option>
                <option value="flor-rara">Flor</option>
                <option value="pedra-magica">Pedra</option>
                <option value="essencia-vinculo">Essência</option>
              </select>
              <button onClick={() => {
                const sel = (document.getElementById('gift-type') as HTMLSelectElement)?.value || 'pocao-media';
                runIfAllowed(() => actionDarPresente(npc, player, sel));
              }} className={`px-3 py-2 rounded ${can?`bg-gradient-to-r ${medievalTheme.gradients.buttons.success} text-white`:'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>🎁 Dar Presente</button>
            </div>
            <button onClick={() => runIfAllowed(() => actionProvocar(npc, player))} className={`px-3 py-2 rounded ${can?`bg-gradient-to-r ${medievalTheme.gradients.buttons.danger} text-white`:'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>⚠️ Provocar</button>
            <button onClick={() => {
              if (!can) return;
              const ok = restAtTavern(player.id, 25, 25, 'short_rest');
              if (ok) {
                const stats = { ...(player.stats as any) };
                const gs = getGameSettings();
                const until = new Date(Date.now() + (gs.restBuffDurationMinutes || 10) * 60 * 1000).toISOString();
                updateHero(player.id, { stats: { ...stats, restBuffActiveUntil: until } });
              }
              mark();
            }} className={`px-3 py-2 rounded ${can?`bg-gradient-to-r ${medievalTheme.gradients.buttons.secondary} text-white`:'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>🛌 Descansar</button>
            <button onClick={() => runIfAllowed(() => {
              const stats = { ...(player.stats as any) };
              const cd = stats.meditationBuffCooldownEndsAt ? new Date(stats.meditationBuffCooldownEndsAt).getTime() : 0;
              if (cd && Date.now() < cd) return;
              const gs = getGameSettings();
              const until = new Date(Date.now() + (gs.meditationDurationMinutes || 2) * 60 * 1000).toISOString();
              const cdUntil = new Date(Date.now() + (gs.meditationCooldownMinutes || 10) * 60 * 1000).toISOString();
              updateHero(player.id, { stats: { ...stats, meditationBuffActiveUntil: until, meditationBuffCooldownEndsAt: cdUntil } });
            })} className={`px-3 py-2 rounded bg-purple-700 text-white`}>🧘 Meditar</button>
          </div>
          {(() => {
            const hs = (player.stats as any)?.helpStatus;
            if (!hs || (hs.expiresAt && Date.now() > new Date(hs.expiresAt).getTime())) return null;
            const msg = hs.type === 'boost_xp'
              ? `Ajuda ativa: +${Math.round(((hs.boostXpPercent || 0) * 100))}% XP na próxima missão`
              : hs.type === 'stamina_refill'
              ? `Ajuda ativa: Stamina recuperada (+${hs.staminaRefillAmount || 10})`
              : hs.type === 'reduce_cooldown'
              ? `Ajuda ativa: Reduz cooldown de missão em ${hs.reduceCooldownMinutes || 5} min`
              : hs.type === 'boost_initiative'
              ? `Ajuda ativa: +${hs.initiativeBonus || 5} Iniciativa na próxima missão`
              : hs.type === 'gold_bonus'
              ? `Ajuda ativa: +${Math.round(((hs.goldBonusPercent || 0) * 100))}% ouro na próxima missão`
              : hs.type === 'success_boost'
              ? `Ajuda ativa: +${Math.round(((hs.successBoostPercent || 0) * 100))}% chance de sucesso`
              : hs.type === 'stamina_discount'
              ? `Ajuda ativa: Custo de Stamina reduzido em ${hs.staminaCostReduction || 1}`
              : hs.type === 'loot_bonus'
              ? `Ajuda ativa: Chance de loot +${Math.round(((hs.lootDropBonusPercent || 0) * 100))}%`
              : `Ajuda ativa: Proteção contra emboscada (${Math.round(((hs.ambushReductionPercent || 0) * 100))}% menos risco/dano)`;
            const icon = hs.type === 'boost_xp' ? '⭐' : hs.type === 'stamina_refill' ? '💤' : hs.type === 'reduce_cooldown' ? '⏱️' : hs.type === 'gold_bonus' ? '🪙' : hs.type === 'success_boost' ? '🎯' : hs.type === 'stamina_discount' ? '💪' : hs.type === 'loot_bonus' ? '🎁' : '🛡️';
            return (<div className="mt-2 text-xs px-2 py-1 rounded bg-purple-900/30 border border-purple-600/30 text-purple-200 inline-flex items-center gap-2">{icon} {msg}</div>);
          })()}
          {(() => {
            const s: any = player.stats || {};
            const restUntil = s.restBuffActiveUntil ? new Date(s.restBuffActiveUntil).getTime() : 0;
            const medUntil = s.meditationBuffActiveUntil ? new Date(s.meditationBuffActiveUntil).getTime() : 0;
            const medCd = s.meditationBuffCooldownEndsAt ? new Date(s.meditationBuffCooldownEndsAt).getTime() : 0;
            const parts: string[] = [];
            if (restUntil && Date.now() < restUntil) parts.push(`Descanso ativo`);
            if (medUntil && Date.now() < medUntil) parts.push(`Meditação ativa`);
            if (medCd && Date.now() < medCd && !(medUntil && Date.now() < medUntil)) parts.push(`Meditação em cooldown`);
            if (!parts.length) return null;
            return (<div className="mt-2 text-xs px-2 py-1 rounded bg-indigo-900/30 border border-indigo-600/30 text-indigo-200 inline-flex items-center gap-2">{parts.join(' • ')}</div>);
          })()}
          </div>
        );
      })()}
    </div>
  );
};

export default TavernInteractions;