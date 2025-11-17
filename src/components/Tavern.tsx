import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { getWeeklyDungeonHighlights } from '../services/dungeonService';
import { activityManager, logActivity } from '../utils/activitySystem';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, getSeasonalButtonGradient } from '../styles/medievalTheme';
import { notificationBus } from './NotificationSystem';
import NPCPresenceLayer from './NPCPresenceLayer';
import DialogueFrame from './DialogueFrame';
import { getNPCDialogue } from '../services/npcDialogueService';
import { runTick } from '../utils/npcAI';
import { getTavernSettings, recordDiceEvent, incrementRerollUsage, generateRumorsAI } from '../services/tavernService';

type Tab = 'npcs' | 'mural' | 'eventos';

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
  const offlineRumors = useMemo(() => sampleRumors(selectedHero?.name), [selectedHero?.name]);
  const todayEvent = useMemo(() => pickDailyEvent(), []);
  const heroes = useHeroStore.getState().heroes;
  const npcs = useMemo(() => heroes.filter(h => h.origin === 'npc'), [heroes.length]);
  const [activeDialogue, setActiveDialogue] = useState<string | null>(null);

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
    (async () => {
      try {
        const sres = await getTavernSettings();
        const capStr = sres.settings?.['reroll_daily_cap'];
        const v = Number(capStr);
        if (!isNaN(v) && v > 0) setRerollCap(v);
      } catch {}
    })();
  }, []);

  useEffect(() => { setError(undefined); }, [tab]);

  useEffect(() => {
    let timer: any = null;
    if (tab === 'mural') {
      timer = setInterval(() => { try { handleGenerateRumors(); } catch {} }, Math.max(10, rumorIntervalSec) * 1000);
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
            className={`px-3 py-2 rounded ${tab === 'npcs' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
          >
            🧑‍🎤 NPCs
          </button>
          <button
            onClick={() => setTab('mural')}
            className={`px-3 py-2 rounded ${tab === 'mural' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
          >
            📜 Mural de Rumores
          </button>
          <button
            onClick={() => setTab('eventos')}
            className={`px-3 py-2 rounded ${tab === 'eventos' ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'}`}
          >
            🎉 Eventos da Taverna
          </button>
        </div>

        {tab === 'npcs' && (
          <div className="mt-6 space-y-4">
            <DialogueFrame>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-amber-300">Interações com NPCs</h2>
                <button onClick={startDialogueWithNPC} className={`px-3 py-2 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white`}>
                  Conversar
                </button>
              </div>
              {activeDialogue && (
                <div className="mt-3 text-gray-200 text-sm">{activeDialogue}</div>
              )}
            </DialogueFrame>
            <NPCPresenceLayer />
            {(() => {
              const recent = activityManager.getRecentActivities(15).filter(a => a.type === 'tavern-rest' || a.type === 'tavern-dice');
              return (
                <div className="bg-gray-900/40 border border-white/10 rounded p-4">
                  <h3 className="text-lg font-semibold text-amber-300">📜 Eventos Recentes da Taverna</h3>
                  {recent.length === 0 ? (
                    <div className="text-xs text-gray-400 mt-2">Nenhum evento recente registrado.</div>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {recent.map(ev => (
                        <li key={ev.id} className="bg-gray-800/60 border border-white/10 rounded p-3 text-gray-200 flex items-center justify-between">
                          <span className="text-sm">
                            <span className="mr-2">{ev.icon}</span>
                            {ev.message}
                          </span>
                          <span className="text-xs text-gray-400">{ev.timestamp.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {tab === 'mural' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-2">Rumores da Taverna</h2>
            <div className="mb-3 flex gap-2 items-center">
              <button
                onClick={handleGenerateRumors}
                disabled={rumorsLoading}
                className={`px-3 py-2 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white hover:brightness-110 flex items-center gap-2`}
              >
                {(seasonalThemes as any)[activeSeasonalTheme || '']?.accents?.[0] || ''}
                <span>{rumorsLoading ? 'Gerando…' : 'Gerar Rumores (Auto)'}</span>
              </button>
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1"><input type="radio" name="rumor-filter" checked={rumorFilter==='all'} onChange={() => setRumorFilter('all')} />Todos</label>
                <label className="flex items-center gap-1"><input type="radio" name="rumor-filter" checked={rumorFilter==='player'} onChange={() => setRumorFilter('player')} />Jogador</label>
                <label className="flex items-center gap-1"><input type="radio" name="rumor-filter" checked={rumorFilter==='npc'} onChange={() => setRumorFilter('npc')} />NPCs</label>
                <select value={rumorIntervalSec} onChange={e => setRumorIntervalSec(Number(e.target.value) || 60)} className="ml-2 px-2 py-1 bg-gray-800 text-white border border-white/10 rounded">
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={120}>120s</option>
                </select>
                {lastRumorTs && (<span className="ml-2 text-gray-400">Gerado: {new Date(lastRumorTs).toLocaleString()}</span>)}
              </div>
              {rumorsError && <span className="text-xs text-red-300">{rumorsError}</span>}
            </div>
            <ul className="space-y-2">
              {(mural.length > 0 ? mural : generatedRumors).map((r, idx) => (
                <li key={idx} className="bg-gray-800/60 border border-white/10 rounded p-3 text-gray-200">
                  {r}
                </li>
              ))}
            </ul>
            {Object.keys(rumorStats).length > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                {Object.entries(rumorStats).sort((a,b)=>b[1]-a[1]).map(([k,v]) => (
                  <span key={k} className="inline-flex items-center px-2 py-1 bg-gray-800 border border-white/10 rounded mr-2">{k}: {v}</span>
                ))}
              </div>
            )}
            {mural.length === 0 && generatedRumors.length === 0 && (
              <div className="text-xs text-gray-400 mt-2">Sem rumores gerados: jogue e interaja para criar fatos; então gere novamente.</div>
            )}
          </div>
        )}

        {tab === 'eventos' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-amber-300 mb-2">Eventos de Hoje</h2>
            <div className="bg-gray-800/60 border border-white/10 rounded p-3 text-gray-200">
              {todayEvent}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Uma fofoca diferente surge a cada dia. Participe para ganhar prestígio!
            </div>

            <div className="mt-6 bg-gray-900/40 border border-white/10 rounded p-4">
              <h3 className="text-lg font-semibold text-amber-300">🪵 Missões Locais da Taverna</h3>
              <div className="text-xs text-gray-400">Ajude o ambiente e conquiste pequenas recompensas.</div>
              {(() => {
                const list = (useHeroStore.getState().availableQuests || []).filter(q => String(q.id).startsWith('tavern-'));
                const hero = useHeroStore.getState().getSelectedHero();
                if (!hero) {
                  return <div className="mt-3 text-xs text-gray-400">Selecione um herói para aceitar missões.</div>;
                }
                if (list.length === 0) {
                  return <div className="mt-3 text-xs text-gray-400">Nenhuma missão local disponível no momento.</div>;
                }
                return (
                  <ul className="mt-3 space-y-2">
                    {list.slice(0, 5).map(q => (
                      <li key={q.id} className="flex items-center justify-between bg-gray-800/60 border border-white/10 rounded px-3 py-2">
                        <div className="text-gray-200 text-sm">
                          <div className="font-semibold">{q.title}</div>
                          <div className="text-xs text-gray-400">{q.description}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 text-xs">+{q.rewards?.xp || 0} XP • +{q.rewards?.gold || 0} 🪙</span>
                          <button
                            onClick={() => {
                              try { useHeroStore.getState().acceptQuest(hero.id, String(q.id)); notificationBus.emit({ type: 'quest', title: 'Missão aceita', message: q.title, icon: '📜', duration: 2500 }); } catch {}
                            }}
                            className={`px-3 py-1 rounded bg-gradient-to-r ${getSeasonalButtonGradient(activeSeasonalTheme as any)} text-white text-xs`}
                          >Aceitar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            {/* Noite de Dados Especial */}
            <div className="mt-6 bg-gradient-to-br from-royal-900/30 via-amber-800/10 to-transparent border border-amber-500/30 rounded p-4">
              <h3 className="text-lg font-semibold text-amber-300 flex items-center gap-2">🎲 Noite de Dados Especial</h3>
              <p className="text-sm text-gray-300 mt-1">Role um d20. Se tirar 20 (crítico): medalha por 7 dias, título "Mestre dos Dados" e +100 XP.</p>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <button
                  onClick={async () => {
                    if (diceRolling) return;
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
            </div>

            {/* Módulos de ranking e apostas desativados para modo single-player */}

          {/* Descanso pago na Taverna */}
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
                            className={`px-3 py-2 rounded text-sm ${canRest ? 'bg-amber-600 hover:bg-amber-700 text-black' : 'bg-gray-700 text-gray-300'}`}
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
          </div>
        )}

        {/* Painel de moderação removido no modo single-player */}
      </div>
    </div>
  );
};

export default Tavern;
