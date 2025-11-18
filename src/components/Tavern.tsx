import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { getWeeklyDungeonHighlights } from '../services/dungeonService';
import { activityManager, logActivity } from '../utils/activitySystem';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';
import { tokens } from '../styles/designTokens';
import { notificationBus } from './NotificationSystem';
import NPCPresenceLayer from './NPCPresenceLayer';
import TavernInteractions from './TavernInteractions';
import DialogueFrame from './DialogueFrame';
import ActivitiesPanel from './ActivitiesPanel';
import { getNPCDialogue } from '../services/npcDialogueService';
import { runTick } from '../utils/npcAI';
import { getTavernSettings, recordDiceEvent, incrementRerollUsage, generateRumorsAI } from '../services/tavernService';

type Tab = 'npcs' | 'eventos' | 'descanso';

const sampleRumors = (heroName?: string) => {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `Ouvi dizer que um dragão despertou nas minas do 12º andar… (${today})`,
    `Alguém viu o novo aventureiro ${heroName || 'um herói misterioso'}? Derrotou um troll sozinho!`,
    'Dizem que o Festival de Lorien começa amanhã — tragam suas moedas raras!',
    'O mago da Torre de Cristal anda nervoso… algo sobre um artefato perdido.',
  ];
};

const dailyEvents = [
  '🍻 Promoção: hidromel por metade do preço até o pôr do sol!',
  '🎭 Concurso de histórias: melhor conto ganha um título temporário.',
  '🎲 Noite de dados: quem tirar 20 ganha medalha no perfil!',
  '🎶 Bardo itinerante: canções épicas após o cair da noite.',
  '🕯️ Velas da sorte: acenda uma e receba um pequeno bônus de XP.',
];

function pickDailyEvent() {
  const dayIdx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % dailyEvents.length;
  return dailyEvents[dayIdx];
}

const Tavern: React.FC = () => {
  const { getSelectedHero, restAtTavern } = useHeroStore();
  const selectedHero = getSelectedHero();
  const { activeSeasonalTheme } = useMonetizationStore();

  const [tab, setTab] = useState<Tab>('npcs');
  const [mural, setMural] = useState<string[]>([]);
  const [generatedRumors, setGeneratedRumors] = useState<string[]>([]);
  const [rumorsLoading, setRumorsLoading] = useState<boolean>(false);
  const [rumorsError, setRumorsError] = useState<string | undefined>(undefined);
  const [rumorIntervalSec, setRumorIntervalSec] = useState<number>(60);
  const [rumorStats, setRumorStats] = useState<Record<string, number>>({});
  const [rumorFilter, setRumorFilter] = useState<'all'|'player'|'npc'>('all');
  const [lastRumorTs, setLastRumorTs] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  // Descanso
  const [restMessage, setRestMessage] = useState<string | null>(null);
  // Dados: Noite de Dados Especial
  const [diceRolling, setDiceRolling] = useState<boolean>(false);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [criticalGlow, setCriticalGlow] = useState<boolean>(false);
  const [diceMessage, setDiceMessage] = useState<string | null>(null);
  const [rerollCap, setRerollCap] = useState<number>(5);
  const [rollCap, setRollCap] = useState<number>(10);
  const [npcDiceResults, setNpcDiceResults] = useState<Array<{ id: string; name: string; roll: number; critical: boolean }>>([]);
  const getRerollTokens = () => {
    const hero = useHeroStore.getState().getSelectedHero();
    return hero ? Number(((hero.stats as any)?.tavernRerollTokens) || 0) : 0;
  };
  const getRerollDaily = () => {
    const hero = useHeroStore.getState().getSelectedHero();
    if (!hero) return { count: 0, cap: rerollCap };
    const s: any = hero.stats || {};
    const d = s.tavernRerollDate ? new Date(s.tavernRerollDate) : null;
    const today = new Date();
    const sameDay = d && d.toDateString() === today.toDateString();
    const count = sameDay ? Number(s.tavernRerollCount || 0) : 0;
    return { count, cap: rerollCap };
  };
  const getRollDaily = () => {
    const hero = useHeroStore.getState().getSelectedHero();
    if (!hero) return { count: 0, cap: rollCap };
    const s: any = hero.stats || {};
    const d = s.tavernRollDate ? new Date(s.tavernRollDate) : null;
    const today = new Date();
    const sameDay = d && d.toDateString() === today.toDateString();
    const count = sameDay ? Number(s.tavernRollCount || 0) : 0;
    return { count, cap: rollCap };
  };
  const offlineRumors = useMemo(() => sampleRumors(selectedHero?.name), [selectedHero?.name]);
  const todayEvent = useMemo(() => pickDailyEvent(), []);
  const heroes = useHeroStore.getState().heroes;
  const npcs = useMemo(() => heroes.filter(h => h.origin === 'npc'), [heroes.length]);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);

  const simulateNPCDiceNight = async () => {
    const state = useHeroStore.getState();
    const allHeroes = state.heroes || [];
    const npcList = allHeroes.filter(h => h.origin === 'npc');
    const todayStr = new Date().toDateString();
    const cap = Math.min(8, npcList.length);
    const selected = npcList.slice().sort(() => Math.random() - 0.5).slice(0, cap);
    const results: Array<{ id: string; name: string; roll: number; critical: boolean }> = [];
    for (const n of selected) {
      const s: any = n.stats || {};
      const prevDate = s.tavernDiceLastDate ? new Date(s.tavernDiceLastDate).toDateString() : '';
      if (prevDate === todayStr) continue;
      const roll = Math.floor(Math.random() * 20) + 1;
      const critical = roll === 20;
      results.push({ id: n.id, name: n.name, roll, critical });
      try { logActivity.tavernDice({ heroId: n.id, heroName: n.name, heroClass: n.class, heroLevel: n.progression.level, roll, critical } as any); } catch {}
      try { await recordDiceEvent({ heroId: n.id, heroName: n.name, roll, critical }); } catch {}
      const stats = { ...s, tavernDiceLastDate: new Date().toISOString(), tavernDiceLastRoll: roll, tavernDiceRolls: (s.tavernDiceRolls || 0) + 1, tavernCrits: (s.tavernCrits || 0) + (critical ? 1 : 0), tavernBestRoll: Math.max(roll, s.tavernBestRoll || 0) };
      const updates: any = { stats };
      if (critical) {
        try { state.gainXP(n.id, 100); } catch {}
        const title = { id: 'mestre-dos-dados', name: 'Mestre dos Dados', description: 'Obteve um crítico (20) na Noite de Dados', rarity: 'especial', category: 'special', badge: '🎲', unlockedAt: new Date() } as any;
        const hasTitle = (n.titles || []).some((t: any) => t.id === 'mestre-dos-dados');
        if (!hasTitle) {
          updates.titles = [ ...(n.titles || []), title ];
        }
      }
      try { state.updateHero(n.id, updates); } catch {}
    }
    if (results.length) setNpcDiceResults(results);
  };

  const injectTavernQuests = () => {
    const state = useHeroStore.getState();
    const existing = state.availableQuests || [];
    const ids = new Set(existing.map(q => String(q.id)));
    const hero = state.getSelectedHero();
    const baseLevel = Math.max(1, hero?.progression.level || 1);
    const quests = [
      {
        id: 'tavern-delivery',
        title: 'Entrega de Barris',
        description: 'Leve barris do depósito à área do balcão sem derramar.',
        type: 'contrato', difficulty: 'facil', levelRequirement: baseLevel,
        rewards: { gold: 20, xp: 25 }, repeatable: true, sticky: true,
        categoryHint: 'controle', biomeHint: 'cidade', narrative: { intro: 'O taberneiro precisa de ajuda com um carregamento.' , situation: 'Mover barris com cuidado pelo salão.' }
      },
      {
        id: 'tavern-help',
        title: 'Ajudar o Taberneiro',
        description: 'Sirva clientes e acalme uma discussão antes que vire confusão.',
        type: 'historia', difficulty: 'medio', levelRequirement: baseLevel,
        rewards: { gold: 30, xp: 40 }, repeatable: true, sticky: true,
        categoryHint: 'especial', biomeHint: 'cidade', narrative: { intro: 'Hora do pico, o salão está cheio.' , situation: 'Manter a ordem e atender pedidos.' }
      },
      {
        id: 'tavern-bard',
        title: 'Evento do Bardo',
        description: 'Auxilie o bardo com o set, promova o show e gerencie o público.',
        type: 'historia', difficulty: 'medio', levelRequirement: baseLevel,
        rewards: { gold: 25, xp: 50 }, repeatable: true, sticky: true,
        categoryHint: 'especial', biomeHint: 'cidade', narrative: { intro: 'O bardo itinerante precisa de suporte.' , situation: 'Garantir que o espetáculo ocorra sem incidentes.' }
      }
    ] as any[];
    const toAdd = quests.filter(q => !ids.has(String(q.id)));
    if (toAdd.length) {
      useHeroStore.setState({ availableQuests: [...toAdd, ...existing] });
    }
  };

  useEffect(() => {
    if (!generatedRumors.length) {
      setGeneratedRumors(offlineRumors);
      setLastRumorTs(new Date().toISOString());
    }
  }, [offlineRumors]);

  useEffect(() => {
    let timer: any = null;
    if (tab === 'npcs') {
      timer = setInterval(() => {
        try { runTick(selectedHero, npcs, notificationBus.emit); } catch {}
      }, 30000);
    }
    return () => { if (timer) try { clearInterval(timer); } catch {} };
  }, [tab, selectedHero?.id, npcs.length]);

  useEffect(() => {
    injectTavernQuests();
  }, [selectedHero?.id]);

  useEffect(() => {
    try { useHeroStore.getState().triggerAutoInteraction('tavern'); } catch {}
  }, [selectedHero?.id]);

  useEffect(() => {
    (async () => {
      try {
        const sres = await getTavernSettings();
        const capStr = sres.settings?.['reroll_daily_cap'];
        const v = Number(capStr);
        if (!isNaN(v) && v > 0) setRerollCap(v);
        const rollCapStr = sres.settings?.['roll_daily_cap'];
        const vr = Number(rollCapStr);
        if (!isNaN(vr) && vr > 0) setRollCap(vr);
      } catch {}
    })();
  }, []);

  useEffect(() => { setError(undefined); }, [tab]);

  useEffect(() => {
    let timer: any = null;
    if (tab === 'eventos') {
      simulateNPCDiceNight();
    }
    return () => { if (timer) { try { clearInterval(timer); } catch {} } };
  }, [tab, rumorFilter, rumorIntervalSec]);

  const startDialogueWithNPC = () => {
    try {
      const player = useHeroStore.getState().getSelectedHero();
      const pool = npcs.length ? npcs : [];
      const npc = pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
      if (npc && player) {
        const line = getNPCDialogue(npc, player, 'taverna — ambiente social');
        setActiveDialogue(line);
      } else {
        setActiveDialogue('Nenhum NPC disponível agora.');
      }
    } catch { setActiveDialogue('Falha ao iniciar diálogo.'); }
  };

  const promoteToMural = (content: string) => {
    setMural(prev => [content, ...prev]);
  };

  const handleGenerateRumors = async () => {
    setRumorsError(undefined);
    setRumorsLoading(true);
    try {
      const state = useHeroStore.getState();
      const player = state.getSelectedHero();
      const heroesAll = state.heroes || [];
      const npcsLocal = heroesAll.filter(h => h.origin === 'npc');
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const feed = activityManager.getActivityFeed({ dateRange: { start: weekAgo, end: now }, showOnlyPublic: true });
      const acts = feed.activities;

      const makeTag = (t: string) => {
        if (t.includes('quest')) return 'quest';
        if (t.includes('rank')) return 'rank';
        if (t.includes('dice')) return 'tavern-dice';
        if (t.includes('rest')) return 'tavern-rest';
        if (t.includes('guild')) return 'guild';
        if (t.includes('pet')) return 'pet';
        if (t.includes('combat')) return 'combat';
        return 'misc';
      };
      const importance = (type: string) => {
        return type === 'epic-quest-completed' ? 10
          : type === 'rank-promotion' ? 9
          : type === 'quest-completed' ? 7
          : type === 'combat-victory' ? 6
          : type === 'tavern-dice' ? 5
          : type === 'tavern-rest' ? 3
          : type === 'item-used' ? 2
          : 1;
      };
      const recencyBoost = (d: Date) => {
        const diff = Math.max(0, now.getTime() - d.getTime());
        const hours = diff / 3_600_000;
        return hours <= 6 ? 3 : hours <= 24 ? 2 : hours <= 72 ? 1 : 0;
      };
      const playerActs = player ? acts.filter(a => a.data.heroId === player.id) : [];
      const npcRumorFromMemory = (n: any) => {
        const last = (n.npcMemory?.interactions || []).slice(-5);
        const lines = last.map((m: any) => {
          const t = String(m.summary || '');
          const date = new Date(m.ts || Date.now());
          const tag = t.includes('missao') ? 'quest' : t.includes('social') ? 'social' : t.includes('treino') ? 'training' : t.includes('mercado') ? 'market' : t.includes('exploracao') ? 'exploration' : 'npc';
          const base = t.includes('missao') ? 6 : t.includes('social_hostil') ? 5 : t.includes('social_amigavel') ? 4 : t.includes('exploracao') ? 3 : 2;
          const weight = base + recencyBoost(date);
          const msg = tag === 'quest' ? `${n.name} concluiu uma missão recente — rumores dizem que foi arriscada.`
            : tag === 'social' ? `${n.name} esteve envolvido em uma interação social (${t.replace('social_','')}).`
            : tag === 'training' ? `${n.name} treinou duro hoje, dizem que ganhou vigor.`
            : tag === 'market' ? `${n.name} fez trocas no mercado; alguns itens chamaram atenção.`
            : `${n.name} explorou áreas próximas e voltou com histórias.`;
          return { content: msg, tag, date, weight, source: 'npc' as const };
        });
        return lines;
      };

      const wrapPlayer = playerActs.map(a => {
        const tag = makeTag(a.type);
        const w = importance(a.type) + recencyBoost(a.timestamp);
        const msg = a.type === 'epic-quest-completed' ? `Fala-se que ${a.data.heroName} venceu uma missão épica: "${a.data.questName}".`
          : a.type === 'quest-completed' ? `${a.data.heroName} concluiu "${a.data.questName}" (${a.data.questDifficulty || '—'}).`
          : a.type === 'rank-promotion' ? `${a.data.heroName} foi promovido ao Rank ${a.data.newRank}.`
          : a.type === 'combat-victory' ? `${a.data.heroName} derrotou ${Array.isArray(a.data.enemiesDefeated) ? (a.data.enemiesDefeated.length === 1 ? a.data.enemiesDefeated[0] : `${a.data.enemiesDefeated.length} inimigos`) : 'inimigos'}.`
          : a.type === 'tavern-dice' ? `${a.data.heroName} rolou ${((a.data as any).roll)} na Noite de Dados${(a.data as any).critical ? ' — dizem que foi CRÍTICO!' : ''}.`
          : a.type === 'tavern-rest' ? `${a.data.heroName} descansou na taverna e recuperou ${a.data.fatigueRecovered || 0} de Fadiga.`
          : a.type === 'item-used' ? `${a.data.heroName} usou ${a.data.itemName || 'um item'} (${a.data.hpRecovered ? `+${a.data.hpRecovered} HP` : ''}${a.data.mpRecovered ? ` +${a.data.mpRecovered} MP` : ''}).`
          : `${a.data.heroName} realizou ${a.type}.`;
        return { content: msg, tag, date: a.timestamp, weight: w, source: 'player' as const };
      });

      const npcLines = npcsLocal.flatMap(n => npcRumorFromMemory(n));
      const merge = [...wrapPlayer, ...npcLines].sort((a, b) => b.weight - a.weight);
      const count = Math.min(10, merge.length);
      const playerCount = Math.floor(count * 0.5);
      const npcCount = count - playerCount;
      const playerPool = merge.filter(r => r.source === 'player').slice(0, playerCount);
      const npcPool = merge.filter(r => r.source === 'npc').slice(0, npcCount);
      const selected = [...playerPool, ...npcPool].sort((a,b) => b.date.getTime() - a.date.getTime());
      const filtered = rumorFilter === 'all' ? selected : selected.filter(r => r.source === rumorFilter);
      const lines = filtered.map(r => `${r.content} (${r.date.toISOString().slice(0,10)}) [#${r.tag}]`);
      const stats: Record<string, number> = {};
      filtered.forEach(r => { stats[r.tag] = (stats[r.tag] || 0) + 1; });
      setRumorStats(stats);
      setGeneratedRumors(lines);
      setLastRumorTs(new Date().toISOString());
    } catch (e: any) {
      setRumorsError(e?.message || 'Falha ao gerar rumores.');
    } finally {
      setRumorsLoading(false);
    }
  };

  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-white/20' : 'border-white/20';
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className={`bg-white/10 border ${seasonalBorder} rounded-lg p-6`}>
        <div className="flex items-center justify-between bg-gradient-to-r from-royal-900/20 via-amber-800/10 to-transparent px-3 py-2 rounded">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-amber-300">🍺 Taverna "Pônei Saltitante"</h1>
            <p className="text-sm text-gray-300">Rumores, comunidade e roleplay assíncrono.</p>
            {selectedHero && (() => {
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const feed = activityManager.getActivityFeed({ dateRange: { start: weekAgo, end: now }, showOnlyPublic: true });
              const acts = feed.activities.filter(a => a.type === 'tavern-dice' || a.type === 'tavern-rest');
              const score: Record<string, number> = {};
              acts.forEach(a => {
                const name = a.data.heroName;
                if (!name) return;
                const isDice = a.type === 'tavern-dice';
                const isRest = a.type === 'tavern-rest';
                const crit = isDice ? Number(!!(a.data as any).critical) : 0;
                score[name] = (score[name] || 0) + (isDice ? (crit * 10 + 2) : (isRest ? 1 : 0));
              });
              const entries = Object.entries(score).sort((a,b) => b[1] - a[1]);
              const topName = entries[0]?.[0];
              if (topName && topName === selectedHero.name) {
                return <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300">👑 Campeão da Semana</span>;
              }
              return null;
            })()}
          </div>
          <div className="text-3xl">🧙‍♂️</div>
        </div>

        <div className="mt-3 bg-amber-900/30 border border-amber-500/40 text-amber-200 text-xs md:text-sm px-3 py-2 rounded">
          Ambiente focado em single-player: interaja com NPCs, eventos e descanso.
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setTab('npcs')}
            className={`px-3 py-2 rounded ${tab === 'npcs' ? tokens.tabActive : tokens.tabInactive}`}
          >
            🧑‍🎤 NPCs
          </button>
          <button
            onClick={() => setTab('eventos')}
            className={`px-3 py-2 rounded ${tab === 'eventos' ? tokens.tabActive : tokens.tabInactive}`}
          >
            🎉 Eventos da Taverna
          </button>
          <button
            onClick={() => setTab('descanso')}
            className={`px-3 py-2 rounded ${tab === 'descanso' ? tokens.tabActive : tokens.tabInactive}`}
          >
            🛏️ Descanso
          </button>
        </div>

        {tab === 'npcs' && (
          <div className="mt-6 space-y-4">
            <TavernInteractions />
            <NPCPresenceLayer />
          </div>
        )}

        {null}

        {tab === 'eventos' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-2">Eventos de Hoje</h2>
            <div className="bg-gray-800/60 border border-white/10 rounded p-3 text-gray-200">
              {todayEvent}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Uma fofoca diferente surge a cada dia. Participe para ganhar prestígio!
            </div>

            

            {/* Noite de Dados Especial */}
            <div className="mt-6 bg-gradient-to-br from-royal-900/30 via-amber-800/10 to-transparent border border-amber-500/30 rounded p-4">
              <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">🎲 Noite de Dados Especial</h3>
              <p className="text-sm text-gray-300 mt-1">Role um d20. Se tirar 20 (crítico): medalha por 7 dias, título "Mestre dos Dados" e +100 XP.</p>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button
                  onClick={async () => {
                    if (diceRolling) return;
                    const rd = getRollDaily();
                    if (rd.count >= rd.cap) { setDiceMessage('Limite diário de rolagens atingido'); return; }
                    setDiceRolling(true);
                    setCriticalGlow(false);
                    setDiceMessage(null);
                    await new Promise(r => setTimeout(r, 600));
                    const roll = Math.floor(Math.random() * 20) + 1;
                    setLastRoll(roll);
                    const isCrit = roll === 20;
                    if (selectedHero) {
                      try {
                        logActivity.tavernDice({
                          heroId: selectedHero.id,
                          heroName: selectedHero.name,
                          heroClass: selectedHero.class,
                          heroLevel: selectedHero.progression.level,
                          roll,
                          critical: isCrit,
                          betAmount: betAmount > 0 ? betAmount : undefined
                        } as any);
                      } catch {}
                      try { await recordDiceEvent({ heroId: selectedHero.id, heroName: selectedHero.name, roll, critical: isCrit, betAmount: betAmount > 0 ? betAmount : undefined }); } catch {}
                      try {
                        const heroNow = useHeroStore.getState().getSelectedHero();
                        if (heroNow) {
                          const s = { ...(heroNow.stats || {}) } as any;
                          s.tavernRollDate = new Date().toISOString();
                          s.tavernRollCount = (s.tavernRollCount || 0) + 1;
                          s.tavernDiceRolls = (s.tavernDiceRolls || 0) + 1;
                          s.tavernCrits = (s.tavernCrits || 0) + (isCrit ? 1 : 0);
                          s.tavernBestRoll = Math.max(roll, s.tavernBestRoll || 0);
                          useHeroStore.getState().updateHero(heroNow.id, { stats: s });
                        }
                      } catch {}
                    }
                    if (isCrit && selectedHero) {
                      setCriticalGlow(true);
                      setDiceMessage('CRÍTICO! Você ganhou medalha, título e +100 XP');
                      try { notificationBus.emit({ type: 'achievement', title: 'Crítico na Taverna!', message: '+100 XP • Mestre dos Dados', icon: '🎲', duration: 3500 }); } catch {}
                      try { useHeroStore.getState().gainXP(selectedHero.id, 100); } catch {}
                      try {
                        const title = { id: 'mestre-dos-dados', name: 'Mestre dos Dados', description: 'Obteve um crítico (20) na Noite de Dados', rarity: 'especial', category: 'special', badge: '🎲', unlockedAt: new Date() } as any;
                        useHeroStore.getState().addTitleToSelectedHero(title, false);
                      } catch {}
                      try {
                        const hero = useHeroStore.getState().getSelectedHero();
                        if (hero) {
                          const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                          const stats = { ...(hero.stats || {}) } as any;
                          stats.profileMedal = { icon: '🏅', name: 'Mestre dos Dados', expiresAt: expires };
                          useHeroStore.getState().updateHero(hero.id, { stats });
                        }
                      } catch {}
                    } else {
                      setDiceMessage('Nada mal — continue tentando pelo crítico!');
                    }
                    setDiceRolling(false);
                  }}
                  className={`px-4 py-2 rounded ${diceRolling ? 'bg-gray-700 text-gray-300' : `bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white`}`}
                >
                  {diceRolling ? 'Rolando…' : 'Rolar d20'}
                </button>
                <div className="relative min-w-[100px] h-[36px] flex items-center justify-center">
                  {criticalGlow && <div className="dice-crit-ring" />}
                  {criticalGlow && <div className="dice-crit-sparkle" />}
                  <div className={`text-center text-2xl font-bold ${criticalGlow ? 'text-amber-300 dice-crit-number' : 'text-gray-200'}`}>
                    {lastRoll !== null ? lastRoll : '—'}
                  </div>
                </div>
                {diceMessage && <span className="text-xs text-amber-300">{diceMessage}</span>}
                <div className="ml-auto text-xs text-gray-300 flex items-center gap-2">
                  <span>Fichas: <span className="text-amber-300 font-semibold">{getRerollTokens()}</span></span>
                  {(() => { const hero = useHeroStore.getState().getSelectedHero(); const s = hero ? (getRerollDaily()) : { count: 0, cap: rerollCap }; return <span>Hoje: <span className="text-amber-300 font-semibold">{s.count}/{s.cap}</span></span>; })()}
                  {(() => { const hero = useHeroStore.getState().getSelectedHero(); const r = hero ? (getRollDaily()) : { count: 0, cap: rollCap }; return <span>Rolagens: <span className="text-amber-300 font-semibold">{r.count}/{r.cap}</span></span>; })()}
                  <button
                    onClick={async () => {
                      const hero = useHeroStore.getState().getSelectedHero();
                      if (!hero || lastRoll === null) return;
                      const tokens = getRerollTokens();
                      if (tokens <= 0 || diceRolling) return;
                      try {
                        const inc = await incrementRerollUsage(hero.id);
                        if (!inc.ok && inc.reason === 'cap') { setDiceMessage('Limite diário de rerrolagens atingido'); return; }
                        if (inc.cap && inc.count !== undefined) setRerollCap(Number(inc.cap));
                      } catch {}
                      setDiceRolling(true);
                      setCriticalGlow(false);
                      await new Promise(r => setTimeout(r, 400));
                      const roll = Math.floor(Math.random() * 20) + 1;
                      setLastRoll(roll);
                      const isCrit = roll === 20;
                      try {
                        const s = { ...(hero.stats || {}) } as any;
                        s.tavernRerollTokens = Math.max(0, (s.tavernRerollTokens || 0) - 1);
                        s.tavernRerollDate = new Date().toISOString();
                        s.tavernRerollCount = (s.tavernRerollCount || 0) + 1;
                        s.tavernDiceRolls = (s.tavernDiceRolls || 0) + 1;
                        s.tavernCrits = (s.tavernCrits || 0) + (isCrit ? 1 : 0);
                        s.tavernBestRoll = Math.max(roll, s.tavernBestRoll || 0);
                        useHeroStore.getState().updateHero(hero.id, { stats: s });
                      } catch {}
                      try { logActivity.tavernDice({ heroId: hero.id, heroName: hero.name, heroClass: hero.class, heroLevel: hero.progression.level, roll, critical: isCrit } as any); } catch {}
                      try { await recordDiceEvent({ heroId: hero.id, heroName: hero.name, roll, critical: isCrit }); } catch {}
                      if (isCrit) {
                        try { notificationBus.emit({ type: 'achievement', title: 'Crítico (rerrolado)!', message: '+100 XP • Mestre dos Dados', icon: '🎲', duration: 3500 }); } catch {}
                        try { useHeroStore.getState().gainXP(hero.id, 100); } catch {}
                      }
                      setDiceRolling(false);
                    }}
                    className={`px-3 py-1 rounded ${getRerollTokens() > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-700 text-gray-400'}`}
                    disabled={getRerollTokens() <= 0 || diceRolling || lastRoll === null}
                  >Rerrolar</button>
                </div>
              </div>
              {npcDiceResults.length > 0 && (
                <div className="mt-4 text-sm text-gray-200">
                  <div className="font-semibold text-amber-300 mb-1">Participantes NPCs (hoje)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {npcDiceResults.map(r => (
                      <div key={r.id} className="px-2 py-1 rounded border border-white/10 bg-black/20 flex items-center justify-between">
                        <span>{r.name}</span>
                        <span className={r.critical ? 'text-amber-300 font-bold' : 'text-gray-200'}>{r.roll}{r.critical ? ' • CRÍTICO' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Módulos de ranking e apostas desativados para modo single-player */}

            <div className="mt-6 bg-gradient-to-br from-indigo-900/30 via-amber-800/10 to-transparent border border-indigo-500/30 rounded p-4">
              <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">🃏 Jogo das Cartas</h3>
              <p className="text-sm text-gray-300 mt-1">Puxe 3 cartas (1–10). Soma das 2 maiores define o placar contra um NPC.</p>
              {selectedHero && (() => {
                const s = (selectedHero.stats || {}) as any;
                const wins = Number(s.miniCardsWins || 0);
                const losses = Number(s.miniCardsLosses || 0);
                const best = Number(s.miniCardsBestScore || 0);
                return (
                  <div className="mt-2 text-xs text-gray-300">Placar pessoal: {wins} vitórias • {losses} derrotas • melhor {best}</div>
                );
              })()}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    const hero = useHeroStore.getState().getSelectedHero();
                    if (!hero) return;
                    const draw = () => [1,2,3].map(() => Math.floor(Math.random() * 10) + 1).sort((a,b) => b - a).slice(0,2).reduce((acc,v) => acc + v, 0);
                    const playerScore = draw();
                    const heroesAll = useHeroStore.getState().heroes || [];
                    const npcPool = heroesAll.filter(h => h.origin === 'npc');
                    const npc = npcPool.length ? npcPool[Math.floor(Math.random() * npcPool.length)] : undefined;
                    const npcScore = draw();
                    const win = playerScore > npcScore;
                    const s = { ...(hero.stats || {}) } as any;
                    s.miniCardsWins = Number(s.miniCardsWins || 0) + (win ? 1 : 0);
                    s.miniCardsLosses = Number(s.miniCardsLosses || 0) + (win ? 0 : 1);
                    s.miniCardsBestScore = Math.max(Number(s.miniCardsBestScore || 0), playerScore);
                    s.miniCardsLastDate = new Date().toISOString();
                    useHeroStore.getState().updateHero(hero.id, { stats: s });
                    try { useHeroStore.getState().updateAchievementProgress(); } catch {}
                    if (win) {
                      try { useHeroStore.getState().gainXP(hero.id, 35); } catch {}
                      try { notificationBus.emit({ type: 'achievement', title: 'Vitória nas Cartas', message: `Placar ${playerScore} • +35 XP`, icon: '🃏', duration: 3000 }); } catch {}
                    } else {
                      try { notificationBus.emit({ type: 'info', title: 'Derrota nas Cartas', message: `NPC marcou ${npcScore}`, icon: '🃏', duration: 2500 }); } catch {}
                    }
                    setNpcDiceResults(prev => {
                      const id = npc?.id || `npc-${Date.now()}`;
                      const name = npc?.name || 'NPC';
                      const roll = npcScore;
                      const critical = false;
                      return [...prev.filter(x => x.id !== id), { id, name, roll, critical }];
                    });
                  }}
                  className={`px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white`}
                >Jogar</button>
                {selectedHero && (() => {
                  const heroesAll = useHeroStore.getState().heroes || [];
                  const npcList = heroesAll.filter(h => h.origin === 'npc').slice(0, 6);
                  const entries = npcList.map(n => {
                    const score = Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10) + 2;
                    return { id: n.id, name: n.name, roll: score, critical: false };
                  }).sort((a,b) => b.roll - a.roll);
                  return (
                    <div className="text-xs text-gray-300">Top NPCs hoje: {entries.slice(0,3).map(e => `${e.name} ${e.roll}`).join(' • ')}</div>
                  );
                })()}
              </div>
            </div>

            <div className="mt-6 bg-gradient-to-br from-green-900/30 via-amber-800/10 to-transparent border border-green-500/30 rounded p-4">
              <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">✊📄✂️ Pedra • Papel • Tesoura</h3>
              <p className="text-sm text-gray-300 mt-1">Melhor de 5 contra um NPC. Vence quem fizer 3 pontos.</p>
              {selectedHero && (() => {
                const s = (selectedHero.stats || {}) as any;
                const wins = Number(s.miniRpsWins || 0);
                const losses = Number(s.miniRpsLosses || 0);
                const streak = Number(s.miniRpsStreak || 0);
                const best = Number(s.miniRpsBestStreak || 0);
                return (
                  <div className="mt-2 text-xs text-gray-300">Placar pessoal: {wins} vitórias • {losses} derrotas • sequência {streak} (melhor {best})</div>
                );
              })()}
              <div className="mt-3 flex items-center gap-2">
                {['pedra','papel','tesoura'].map(choice => (
                  <button
                    key={choice}
                    onClick={() => {
                      const hero = useHeroStore.getState().getSelectedHero();
                      if (!hero) return;
                      const map: Record<string, string> = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' };
                      const npcChoice = ['pedra','papel','tesoura'][Math.floor(Math.random()*3)];
                      const win = map[choice] === npcChoice;
                      const s = { ...(hero.stats || {}) } as any;
                      const prevStreak = Number(s.miniRpsStreak || 0);
                      s.miniRpsWins = Number(s.miniRpsWins || 0) + (win ? 1 : 0);
                      s.miniRpsLosses = Number(s.miniRpsLosses || 0) + (win ? 0 : 1);
                      s.miniRpsStreak = win ? prevStreak + 1 : 0;
                      s.miniRpsBestStreak = Math.max(Number(s.miniRpsBestStreak || 0), s.miniRpsStreak);
                      s.miniRpsLastDate = new Date().toISOString();
                      useHeroStore.getState().updateHero(hero.id, { stats: s });
                      try { useHeroStore.getState().updateAchievementProgress(); } catch {}
                      if (win) {
                        try { useHeroStore.getState().gainXP(hero.id, 25); } catch {}
                        try { notificationBus.emit({ type: 'achievement', title: 'Vitória no RPS', message: `NPC jogou ${npcChoice} • +25 XP`, icon: '🎯', duration: 2500 }); } catch {}
                      } else {
                        try { notificationBus.emit({ type: 'info', title: 'Derrota no RPS', message: `NPC jogou ${npcChoice}`, icon: '🎯', duration: 2500 }); } catch {}
                      }
                    }}
                    className={`px-3 py-2 rounded bg-green-700 hover:bg-green-800 text-white`}
                  >{choice}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'descanso' && (
          <div className="mt-6 bg-gray-900/40 border border-white/10 rounded p-4">
            <h3 className="text-lg font-semibold text-amber-300">🛏️ Descanso na Taverna</h3>
            <p className="text-sm text-gray-300 mt-1">Recupere sua Fadiga com uma boa noite de sono.</p>
            <div className="mt-3 text-sm text-gray-200">
              {selectedHero ? (
                <span>
                  Saldo: Ouro {selectedHero.progression.gold} • Fadiga {selectedHero.progression.fatigue}
                </span>
              ) : (
                <span>Selecione um herói para descansar.</span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {(() => {
                const options = [
                  { label: 'Soneca', type: 'soneca', cost: 15, recovery: 15 },
                  { label: 'Noite padrão', type: 'noite', cost: 30, recovery: 30 },
                  { label: 'Suíte de luxo', type: 'luxo', cost: 60, recovery: 60 }
                ];
                const fatigue = selectedHero?.progression.fatigue ?? 0;
                const gold = selectedHero?.progression.gold ?? 0;
                const baseHelper = !selectedHero
                  ? 'Selecione um herói'
                  : fatigue <= 0
                    ? 'Fadiga já está em 0'
                    : undefined;
                return (
                  <>
                    {options.map(opt => {
                      const canRest = !!selectedHero && gold >= opt.cost && fatigue > 0;
                      return (
                        <button
                          key={opt.type}
                          onClick={() => {
                            if (!selectedHero) return;
                            const ok = restAtTavern(selectedHero.id, opt.cost, opt.recovery, opt.type);
                            setRestMessage(
                              ok
                                ? `Você descansou (${opt.label}) e recuperou até ${opt.recovery} de Fadiga.`
                                : 'Não foi possível descansar (verifique ouro e fadiga).'
                            );
                          }}
                          disabled={!canRest}
                          className={`px-3 py-2 rounded text-sm ${canRest ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white hover:brightness-110' : 'bg-gray-700 text-gray-300'}`}
                          title={`Recupera ${opt.recovery} Fadiga por ${opt.cost} ouro`}
                        >
                          {opt.label} ({opt.cost} ouro)
                        </button>
                      );
                    })}
                    <span className="text-xs text-gray-300 min-w-[180px]">
                      {baseHelper ?? (gold < options[1].cost ? 'Ouro insuficiente' : 'Escolha o conforto do descanso')}
                    </span>
                  </>
                );
              })()}
            </div>
            {restMessage && (
              <div className="mt-3 text-xs text-green-300">{restMessage}</div>
            )}
          </div>
        )}

        {/* Painel de moderação removido no modo single-player */}
      </div>
    </div>
  );
};

export default Tavern;
