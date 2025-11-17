import React, { useState, useEffect, useMemo } from 'react';
import { useHeroStore } from '../store/heroStore';
import { Quest, QuestDifficulty, Hero } from '../types/hero';
import { generateQuestBoard } from '../utils/quests';
import { SHOP_ITEMS } from '../utils/shop';
import { getClassIcon } from '../styles/medievalTheme';
import { ELEMENT_INFO } from '../utils/elementSystem';
import { getElementInfoSafe } from '../utils/elementSystem';
import { worldStateManager } from '../utils/worldState';
import { computeRewardMultiplier } from '../utils/dungeonConfig';

// Componente para seleção de herói
const HeroSelector: React.FC<{ 
  heroes: Hero[], 
  onHeroSelect: (heroId: string) => void 
}> = ({ heroes, onHeroSelect }) => {
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const selectedHeroId = selectedHero?.id || null;

  const handleClick = (heroId: string) => {
    onHeroSelect(heroId);
  };

  if (heroes.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-800/50 rounded-lg border border-amber-500/30">
        <div className="text-4xl mb-4">🦸</div>
        <h3 className="text-xl font-bold text-amber-400 mb-2">Nenhum Herói Criado</h3>
        <p className="text-gray-300 mb-4">Você precisa criar um herói primeiro para acessar as missões.</p>
        <a 
          href="/" 
          className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
        >
          Criar Primeiro Herói
        </a>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-amber-500/30 p-6">
      <h3 className="text-xl font-bold text-amber-400 mb-4 text-center">Escolha seu Herói</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {heroes.map(hero => {
          // Antes: const elementInfo = ELEMENT_INFO[hero.element];
          // Depois:
          const elementInfo = getElementInfoSafe(hero.element);
          return (
            <div
              key={hero.id}
              onClick={() => handleClick(hero.id)}
              className={`bg-slate-700/50 rounded-lg p-4 border transition-all cursor-pointer group ${
                selectedHeroId === hero.id 
                  ? 'border-amber-500 bg-amber-900/20' 
                  : 'border-slate-600 hover:border-amber-500 hover:bg-slate-700/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{hero.avatar}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors">
                    {hero.name}
                  </h4>
                  <div className="text-sm text-gray-300 flex items-center space-x-2">
                    <span>{getClassIcon(hero.class)} {hero.class}</span>
                    <span style={{ color: elementInfo?.color || '#9CA3AF' }}>
                        {elementInfo?.icon || '⚡'} {hero.element}
                    </span>
                  </div>
                  <div className="text-xs text-amber-600">
                    Nível {hero.progression.level} • {hero.progression.experience} XP
                  </div>
                  {selectedHeroId === hero.id && (
                    <div className="text-xs text-green-400 mt-1 font-medium">
                      ✓ Herói selecionado! Carregando missões...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const QuestBoard: React.FC = () => {
  const { 
    getSelectedHero, 
    availableQuests, 
    refreshQuests, 
    acceptQuest, 
    completeQuest,
    abandonQuest,
    clearActiveQuests,
    gainXP,
    gainGold,
    addItemToInventory,
    updateHero,
    updateDailyGoalProgress,
    selectHero,
    heroes
  } = useHeroStore();
  
  const selectedHero = getSelectedHero();
  const availableUniq = useMemo(() => {
    try {
      const seen = new Set<string>();
      return (availableQuests || []).filter(q => {
        const id = String(q.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    } catch { return availableQuests; }
  }, [availableQuests]);
  const activeIdsUniq = useMemo(() => {
    try { return Array.from(new Set(selectedHero.activeQuests || [])); } catch { return selectedHero.activeQuests; }
  }, [selectedHero.activeQuests]);
  const completedIdsUniq = useMemo(() => {
    try { return Array.from(new Set(selectedHero.completedQuests || [])); } catch { return selectedHero.completedQuests; }
  }, [selectedHero.completedQuests]);
  
  const [selectedTab, setSelectedTab] = useState<'available' | 'active' | 'completed'>('available');
  const [companionsOnly, setCompanionsOnly] = useState<boolean>(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('companions') === '1') return true;
      const ls = localStorage.getItem('questboard_companions_only');
      return ls === '1';
    } catch { return false; }
  });
  const [forceUpdate, setForceUpdate] = useState(0);

  // Selecionar automaticamente o primeiro herói se não há nenhum selecionado
  useEffect(() => {
    if (!selectedHero && heroes.length > 0) {
      console.log('Nenhum herói selecionado, selecionando automaticamente o primeiro:', heroes[0].name);
      selectHero(heroes[0].id);
      refreshQuests(heroes[0].progression.level);
    }
  }, [selectedHero?.id, heroes.length]);

  // Monitorar mudanças no herói selecionado
  useEffect(() => {
    console.log('Estado do herói selecionado mudou:', selectedHero?.name || 'Nenhum');
  }, [selectedHero]);

  // Rotação automática de missões a cada 1h
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshQuests(selectedHero?.progression.level || 1);
    }, 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [selectedHero?.id]);

  // Narrativas removidas: não geramos mais missões narrativas

  const handleHeroSelect = (heroId: string) => {
    console.log('Clique detectado! Selecionando herói:', heroId);
    selectHero(heroId);
    
    // Atualizar missões para o herói selecionado
    const selectedHeroData = heroes.find(h => h.id === heroId);
    if (selectedHeroData) {
      console.log('Atualizando missões para herói:', selectedHeroData.name, 'Level:', selectedHeroData.progression.level);
      refreshQuests(selectedHeroData.progression.level);
    }
    
    console.log('Herói selecionado, forçando atualização...');
    setForceUpdate(prev => prev + 1);
    
    // Verificar se a seleção funcionou
    setTimeout(() => {
      const currentSelected = heroes.find(h => h.id === heroId);
      console.log('Herói encontrado:', currentSelected?.name);
    }, 100);
  };

  // Removido: fluxo de conclusão de missões narrativas

  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📜</div>
          <h2 className="text-3xl font-bold text-amber-400 mb-4">Quadro de Missões</h2>
          <p className="text-gray-300 mb-6">Selecione um herói para ver as missões disponíveis</p>
        </div>
        
        <HeroSelector heroes={heroes} onHeroSelect={handleHeroSelect} />
      </div>
    );
  }

  const getDifficultyColor = (difficulty: QuestDifficulty) => {
    switch (difficulty) {
      case 'rapida': return 'text-green-400 bg-green-900/20';
      case 'padrao': return 'text-yellow-400 bg-yellow-900/20';
      case 'epica': return 'text-purple-400 bg-purple-900/20';
      default: return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getDifficultyLabel = (difficulty: QuestDifficulty) => {
    switch (difficulty) {
      case 'rapida': return 'Rápida';
      case 'padrao': return 'Padrão';
      case 'epica': return 'Épica';
      default: return 'Desconhecido';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'contrato': return '📜';
      case 'caca': return '⚔️';
      case 'exploracao': return '🗺️';
      case 'historia': return '📖';
      default: return '❓';
    }
  };

  const canAcceptQuest = (quest: Quest) => {
    return selectedHero.progression.level >= quest.levelRequirement &&
           !selectedHero.activeQuests.includes(quest.id);
  };

  const handleAcceptQuest = (quest: Quest) => {
    if (canAcceptQuest(quest) && selectedHero) {
      console.log('🎯 Aceitando missão:', quest.title, 'para herói:', selectedHero.name);
      acceptQuest(selectedHero.id, quest.id);
    }
  };

  const handleCompleteQuest = (questId: string) => {
    if (selectedHero) {
      console.log('✅ Completando missão:', questId, 'para herói:', selectedHero.name);
      completeQuest(selectedHero.id, questId);
    }
  };

  const ActiveMissionRunner: React.FC<{ hero: Hero; quest: Quest }> = ({ hero, quest }) => {
    const [running, setRunning] = useState(false);
    const [finished, setFinished] = useState(false);
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [log, setLog] = useState<Array<{ phase: number; success: boolean; xp: number; gold: number; narrative: string; itemsAwarded?: { id: string; name?: string }[] }>>([]);
    const [autoRun, setAutoRun] = useState(false);
    const [npcIntegrity, setNpcIntegrity] = useState<number | null>(quest.categoryHint === 'escolta' ? 100 : null);
    const [anyLoot, setAnyLoot] = useState(false);
    const [streak, setStreak] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const phasesTotal = useMemo(() => Math.max(2, quest.phasesHint || (quest.difficulty === 'epica' ? 4 : 3)), [quest.phasesHint, quest.difficulty]);
    const staminaCostPerPhase = useMemo(() => (quest.difficulty === 'rapida' ? 2 : 3), [quest.difficulty]);
    const biome = quest.biomeHint || 'Floresta Nebulosa';
    const category = quest.categoryHint || (quest.type === 'caca' ? 'controle' : 'controle');

    useEffect(() => {
      try {
        const st = (hero.stats as any)?.missionRunState || {};
        const s = st[String(quest.id)];
        if (s) {
          setPhaseIndex(Math.max(0, s.phase || 0));
          setNpcIntegrity(typeof s.npcIntegrity === 'number' ? s.npcIntegrity : (quest.categoryHint === 'escolta' ? 100 : null));
          setRunning(Boolean(s.running));
          setFinished(Boolean(s.finished));
          if (Array.isArray(s.logs) && s.logs.length > 0) {
            setLog(s.logs.map(e => ({ phase: e.phase, success: true, xp: e.xp, gold: e.gold, narrative: e.narrative, itemsAwarded: [] })));
          }
        }
      } catch {}
    }, [hero.id, quest.id]);

    const persistState = (pi: number, ni: number | null, run: boolean, fin: boolean, logsArr: Array<{ phase: number; xp: number; gold: number; narrative: string }>) => {
      try {
        const st = { ...((hero.stats as any)?.missionRunState || {}) } as Record<string, any>;
        st[String(quest.id)] = { phase: pi, npcIntegrity: (ni ?? undefined) as any, running: run, finished: fin, logs: logsArr };
        updateHero(hero.id, { stats: { ...hero.stats, missionRunState: st } });
      } catch {}
    };

    const start = () => {
      if ((hero.stamina?.current || 0) < staminaCostPerPhase) { setError('Stamina insuficiente para iniciar.'); return; }
      setRunning(true);
      setFinished(false);
      setPhaseIndex(0);
      setLog([]);
      setError(null);
      setStreak(0);
      setNpcIntegrity(category === 'escolta' ? 100 : null);
      setAnyLoot(false);
      persistState(0, category === 'escolta' ? 100 : null, true, false, []);
    };

    const resolvePhase = () => {
      if (finished) return;
      const extraPhaseCost = phaseIndex >= 2 ? 1 : 0;
      const totalCost = staminaCostPerPhase + extraPhaseCost;
      if ((hero.stamina?.current || 0) < totalCost) { setError('Stamina insuficiente para prosseguir.'); setRunning(false); return; }
      worldStateManager.consumeStamina(hero, totalCost);
      updateHero(hero.id, { stamina: hero.stamina });
      const base = quest.difficulty === 'epica' ? 0.45 : quest.difficulty === 'dificil' ? 0.6 : quest.difficulty === 'medio' ? 0.7 : 0.8;
      const riskStep = 0.06;
      const attr = hero.attributes;
      const classBonus = category === 'controle' ? (attr.destreza || 0) * 0.01 : category === 'coleta' ? (attr.inteligencia || 0) * 0.01 : category === 'escolta' ? (attr.constituicao || 0) * 0.008 : (attr.forca || 0) * 0.008;
      const floor = 0.2;
      const successChance = Math.max(floor, Math.min(0.95, (base - phaseIndex * riskStep) + classBonus));
      const roll = Math.random();
      const success = roll < successChance;
      const mult = computeRewardMultiplier(streak);
      const xpBase = (quest.baseRewardsHint?.xp || 25);
      const goldBase = (quest.baseRewardsHint?.gold || 25);
      const boss = category === 'especial' && phaseIndex + 1 === phasesTotal;
      const bossMult = boss ? 1.5 : 1;
      const xp = Math.round((success ? xpBase : Math.round(xpBase * 0.5)) * mult * bossMult);
      const gold = Math.round((success ? goldBase : Math.round(goldBase * 0.3)) * mult * bossMult);
      gainXP(hero.id, xp);
      gainGold(hero.id, gold);

      const lootTier = boss ? 'epico' : phaseIndex >= 2 ? 'raro' : phaseIndex >= 1 ? 'incomum' : 'comum';
      const itemsEquip = Math.random() < (success ? 0.5 : 0.25) ? [] : [];
      itemsEquip.forEach(it => addItemToInventory(hero.id, (it as any).id || '', 1));

      const categoryPools: Record<string, string[]> = {
        controle: ['pele-lobo-sombrio','colmilho-vampirico','osso-antigo'],
        coleta: ['erva-sangue','essencia-lunar','cristal-runico'],
        escolta: ['pergaminho-protecao','pergaminho-velocidade'],
        especial: boss ? ['lamina-alpha','armadura-pedra-rachada'] : []
      };
      const ids = categoryPools[category] || [];
      const extraIds: string[] = [];
      if (ids.length) {
        const dropChance = boss ? 1 : success ? 0.7 : 0.4;
        const hour = new Date().getHours();
        const isNight = hour < 6 || hour >= 18;
        const isDay = hour >= 8 && hour < 17;
        const eligible = ids.filter(id => {
          if (id === 'essencia-lunar') return isNight;
          if (id === 'erva-sangue') return isDay;
          if (id === 'cristal-runico') return biome === 'Caverna Antiga' || biome === 'Ruínas Antigas';
          return true;
        });
        if (eligible.length && Math.random() < dropChance) {
          const pickId = eligible[Math.floor(Math.random() * eligible.length)];
          addItemToInventory(hero.id, pickId, 1);
          extraIds.push(pickId);
        }
      }

      const ENEMIES_BY_BIOME: Record<string, string[]> = {
        'Colinas de Boravon': ['Lobo Sombrio','Bandido'],
        'Rio Marfim': ['Slime Ácido','Serpente do Rio'],
        'Floresta Nebulosa': ['Morcego Vampiro','Bruxa da Névoa'],
        'Ruínas Antigas': ['Golem Rachado','Esqueleto'],
        'Floresta Umbral': ['Bruxa da Névoa','Lobo Sombrio'],
        'Caverna Antiga': ['Troll de Pedra','Slime Ácido']
      };
      const baseAmbush = category === 'escolta' ? 0.25 : 0.15;
      const ambush = Math.random() < (baseAmbush + (quest.difficulty === 'dificil' ? 0.05 : quest.difficulty === 'epica' ? 0.1 : 0));
      let npcAfter = npcIntegrity;
      let ambushText = '';
      if (ambush) {
        const enemies = ENEMIES_BY_BIOME[biome] || ['Inimigos'];
        const foe = enemies[Math.floor(Math.random() * enemies.length)];
        const ambushDamageBase = Math.round((hero.derivedAttributes.hp || 20) * 0.1);
        const curHp2 = hero.derivedAttributes.currentHp ?? (hero.derivedAttributes.hp || 0);
        const newHp2 = Math.max(0, curHp2 - ambushDamageBase);
        updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: newHp2 } });
        ambushText = ` • Emboscada: ${foe} causa dano.`;
        if (npcAfter !== null) npcAfter = Math.max(0, (npcAfter ?? 0) - 10);
        const maxHp2 = hero.derivedAttributes.hp || 1;
        if ((newHp2 / maxHp2) < 0.2) { setAutoRun(false); setError('HP baixo, auto desativado.'); }
      }

      if (!success) {
        const maxHp = hero.derivedAttributes.hp || 1;
        const curHp = hero.derivedAttributes.currentHp ?? maxHp;
        const damageBase = Math.round(maxHp * 0.1);
        const newHp = Math.max(0, curHp - damageBase);
        const newFatigue = Math.min(100, (hero.progression.fatigue || 0) + 6);
        updateHero(hero.id, { derivedAttributes: { ...hero.derivedAttributes, currentHp: newHp }, progression: { ...hero.progression, fatigue: newFatigue } });
        if (npcAfter !== null) npcAfter = Math.max(0, (npcAfter ?? 0) - 15);
        const maxHp2 = hero.derivedAttributes.hp || 1;
        if ((newHp / maxHp2) < 0.2) { setAutoRun(false); setError('HP baixo, auto desativado.'); }
      }
      if (npcAfter !== undefined && npcAfter !== null) setNpcIntegrity(npcAfter);

      const mapName = (id: string) => SHOP_ITEMS.find(i => i.id === id)?.name || id;
      const result = { phase: phaseIndex + 1, success, xp, gold, narrative: (success ? `Progresso na fase ${phaseIndex + 1}.` : `Revés na fase ${phaseIndex + 1}.`) + ambushText, itemsAwarded: [...itemsEquip.map((i: any) => ({ id: i.id, name: i.name })), ...extraIds.map(id => ({ id, name: mapName(id) }))] };
      const nextLogs = [...log, { phase: phaseIndex + 1, xp, gold, narrative: result.narrative }];
      setLog(prev => [...prev, result]);
      if ((itemsEquip.length > 0) || (extraIds.length > 0)) setAnyLoot(true);
      setStreak(s => s + (success ? 1 : 0));
      const nextPhase = phaseIndex + 1;
      setPhaseIndex(p => p + 1);
      const willFinish = (npcAfter !== null && npcAfter !== undefined && npcAfter <= 0) || (nextPhase >= phasesTotal);
      if (willFinish) {
        setFinished(true);
        setRunning(false);
        updateDailyGoalProgress(hero.id, 'quest-completed', 1);
        if ((quest.difficulty === 'rapida') && !anyLoot) {
          const consolation = category === 'coleta' ? 'erva-sangue' : 'osso-antigo';
          addItemToInventory(hero.id, consolation, 1);
        }
      }
      persistState(Math.min(nextPhase, phasesTotal), npcAfter, !willFinish, willFinish, nextLogs.map(e => ({ phase: e.phase, xp: (e as any).xp || 0, gold: (e as any).gold || 0, narrative: (e as any).narrative || '' })));
    };

    useEffect(() => {
      if (running && autoRun && !finished) {
        const t = setTimeout(() => { resolvePhase(); }, 500);
        return () => clearTimeout(t);
      }
    }, [running, autoRun, finished, phaseIndex]);

    return (
      <div className="mt-4 p-4 border rounded bg-gray-800 border-gray-700">
        <div className="text-white font-semibold">Execução da Missão — {biome}</div>
        <div className="text-gray-300 text-sm">Fases: {phasesTotal} • Dificuldade: {quest.difficulty}</div>
        {!running && !finished && (
          <div className="mt-3">
            <button onClick={start} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">Iniciar</button>
            <button onClick={() => setAutoRun(v => !v)} className={`ml-2 px-3 py-2 rounded ${autoRun ? 'bg-teal-600' : 'bg-teal-700'} text-white hover:bg-teal-500`}>{autoRun ? 'Auto: ON' : 'Auto: OFF'}</button>
            {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
          </div>
        )}
        {running && (
          <div className="mt-3">
            <div className="text-gray-200">Fase {Math.min(phasesTotal, (log?.length || 0) + 1)} de {phasesTotal}</div>
            {npcIntegrity !== null && <div className="text-gray-400 text-xs">Integridade do NPC: {npcIntegrity}%</div>}
            <div className="mt-2 flex gap-2">
              <button onClick={resolvePhase} className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Prosseguir</button>
              <button onClick={() => setAutoRun(v => !v)} className={`px-3 py-2 rounded ${autoRun ? 'bg-teal-600' : 'bg-teal-700'} text-white hover:bg-teal-500`}>{autoRun ? 'Auto: ON' : 'Auto: OFF'}</button>
            </div>
            <div className="mt-2 text-sm text-gray-400">Multiplicador atual: x{computeRewardMultiplier(streak).toFixed(2)}</div>
          </div>
        )}
        {log.length > 0 && (
          <div className="mt-4">
            <div className="text-white font-semibold">Registro</div>
            <ul className="mt-2 text-sm text-gray-300 list-disc pl-5">
              {log.map(r => (
                <li key={r.phase}>Fase {r.phase}: {r.narrative} • +{r.xp} XP, +{r.gold} ouro{r.itemsAwarded && r.itemsAwarded.length ? ` • Loot` : ''}</li>
              ))}
            </ul>
          </div>
        )}
        {finished && (
          <ConcludeButton heroId={hero.id} questId={quest.id} onConcluded={() => { setRunning(false); setFinished(true); }} />
        )}
      </div>
    );
  };

  const renderQuestCard = (quest: Quest, isActive = false, isCompleted = false) => (
    <div data-testid="quest-card" className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-amber-500 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getTypeIcon(quest.type)}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{quest.title}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${getDifficultyColor(quest.difficulty)}`}>
                {getDifficultyLabel(quest.difficulty)}
              </span>
              <span className="text-gray-400 text-sm">Nível {quest.levelRequirement}+</span>
              {quest.isGuildQuest && (
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-900/30 text-purple-300 border border-purple-600/30 flex items-center gap-1">
                  🏰 Guilda <span className="text-emerald-300">🐾</span>
                </span>
              )}
              {(() => {
                try {
                  const ids = (quest.rewards?.items || []).map(i => (typeof (i as any) === 'string' ? (i as any) : (i as any).id));
                  const set = new Set(['racao-basica','racao-deluxe','pedra-alma','pedra-magica','essencia-vinculo','essencia-bestial','pergaminho-montaria','essencia-calor','brasas-magicas']);
                  const has = ids.some(id => set.has(id));
                  return has ? (<span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-900/30 text-emerald-300 border border-emerald-600/30 flex items-center gap-1">🐾 Companheiros</span>) : null;
                } catch { return null; }
              })()}
              {(() => {
                try {
                  const hero = getSelectedHero();
                  if (!hero) return null;
                  const inv = hero.inventory.items || {} as Record<string, number>;
                  let pct = 0;
                  if (String(quest.id).startsWith('companion-')) {
                    const parts = String(quest.id).split('-');
                    const target = parts[1];
                    pct = (inv[target] || 0) > 0 ? 100 : 0;
                  } else {
                    const compSet = new Set(['racao-basica','racao-deluxe','pedra-alma','pedra-magica','essencia-vinculo','essencia-bestial','pergaminho-montaria','essencia-calor','brasas-magicas']);
                    const rewardIds = (quest.rewards?.items || []).map(i => (typeof (i as any) === 'string' ? (i as any) : (i as any).id)).filter(id => compSet.has(id));
                    const total = rewardIds.length;
                    const have = rewardIds.filter(id => (inv[id] || 0) > 0).length;
                    pct = total > 0 ? Math.round((have / total) * 100) : 0;
                  }
                  return (
                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-indigo-900/30 text-indigo-300 border border-indigo-600/30 flex items-center gap-1">Progresso {pct}%</span>
                  );
                } catch { return null; }
              })()}
            </div>
          </div>
        </div>
        {typeof quest.timeLimit === 'number' && (
          <div className="text-right">
            <span className="text-red-400 text-sm">
              ⏰ {quest.timeLimit >= 60 ? `${Math.round(quest.timeLimit / 60)} h` : `${quest.timeLimit} min`}
            </span>
          </div>
        )}
      </div>

      <p className="text-gray-300 mb-4">{quest.description}</p>

      {quest.objectives && quest.objectives.length > 0 && (
        <div className="mb-4">
          <h4 className="text-amber-400 font-medium mb-2">Objetivos:</h4>
          <ul className="space-y-1">
            {quest.objectives.map((objective, index) => (
              <li key={index} className="text-gray-300 text-sm flex items-center space-x-2">
                <span className="text-amber-400">•</span>
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-amber-400 font-medium mb-2">Recompensas:</h4>
        <div className="flex items-center space-x-4 text-sm">
          <span className="flex items-center space-x-1">
            <span>🪙</span>
            <span>{quest.rewards?.gold || 0} ouro</span>
          </span>
          <span className="flex items-center space-x-1">
            <span>⭐</span>
            <span>{quest.rewards?.xp || 0} XP</span>
          </span>
          {quest.rewards?.items && quest.rewards.items.length > 0 && (
            <span className="flex items-center space-x-2">
              {quest.rewards.items.map(({ id, qty }, idx) => {
                const it = SHOP_ITEMS.find(s => s.id === id);
                const r = it?.rarity;
                const c = r === 'lendario' ? 'text-amber-300' : r === 'epico' ? 'text-purple-300' : r === 'raro' ? 'text-blue-300' : r === 'incomum' ? 'text-green-300' : 'text-gray-300';
                return (
                  <span key={`${id}-${idx}`} className={`flex items-center gap-1 ${c}`}>
                    <span>{it?.icon || '🎁'}</span>
                    <span>{id} x{qty || 1}</span>
                  </span>
                );
              })}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        {(() => {
          const alreadyCompleted = selectedHero.completedQuests.includes(quest.id);
          if (!isActive && !isCompleted && !alreadyCompleted) return (
          <button
            onClick={() => handleAcceptQuest(quest)}
            disabled={!canAcceptQuest(quest)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              canAcceptQuest(quest)
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canAcceptQuest(quest) ? 'Aceitar Missão' : 'Requisitos não atendidos'}
          </button>
          );
          if (alreadyCompleted && !isActive) return (
            <span className="px-4 py-2 bg-gray-700 rounded-md font-medium text-gray-300">✅ Já concluída</span>
          );
          return null;
        })()}
        {isActive && (quest.type === 'caca' || quest.categoryHint === 'escolta') && (
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-900/30 text-green-300 border border-green-600/30">Execução por fases</span>
        )}
        {/* Botão de completar missão removido conforme solicitado */}
        {isCompleted && (
          <span className="px-4 py-2 bg-gray-600 rounded-md font-medium text-gray-300">
            ✅ Concluída
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-amber-400">Quadro de Missões {companionsOnly && <span className="ml-2 text-sm px-2 py-1 rounded bg-emerald-800/40 text-emerald-200 border border-emerald-600/40">Companheiros ({availableQuests.filter(q => q.isGuildQuest).length})</span>}</h2>
          <div className="mt-1 text-sm text-gray-300">Novas missões a cada 1h • Rápidas (5–20 min) • Épicas (2–3h)</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCompanionsOnly(v => { try { localStorage.setItem('questboard_companions_only', v ? '0' : '1'); } catch {}; return !v; })}
            className={`px-3 py-2 rounded-md font-medium transition-colors ${companionsOnly ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
            title="Mostrar apenas missões de companheiros"
          >
            🐾 Companheiros {companionsOnly ? '✓' : ''}
          </button>
          {selectedHero && (selectedHero.activeQuests.length > 0) && (
            <button
              onClick={() => { clearActiveQuests(selectedHero.id); refreshQuests(selectedHero.progression.level); }}
              className="px-3 py-2 rounded-md font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
              title="Remover todas as missões ativas"
            >
              Abandonar Todas
            </button>
          )}
        </div>
      </div>

      {(() => {
        const bannerQuest = availableQuests.find(q => q.isGuildQuest && q.sticky && String(q.id).startsWith('companion-'));
        if (!bannerQuest) return null;
        return (
          <div className="mb-6 p-3 rounded-lg bg-emerald-900/30 border border-emerald-600/30 text-emerald-200 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2"><span>🐾 Nova Missão de Companheiros adicionada:</span><span className="font-semibold">{bannerQuest.title}</span></div>
            <div className="flex items-center gap-2">
              <a href="#" className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs" onClick={(e) => { e.preventDefault(); setSelectedTab('available'); }}>Ver</a>
              <button className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs" onClick={() => { handleAcceptQuest(bannerQuest); setSelectedTab('active'); }}>Aceitar agora</button>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setSelectedTab('available')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            selectedTab === 'available'
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Disponíveis ({availableQuests.length})
        </button>
        {/* Aba Narrativas removida */}
        <button
          onClick={() => setSelectedTab('active')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            selectedTab === 'active'
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Ativas ({selectedHero.activeQuests.length})
        </button>
        <button
          onClick={() => setSelectedTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            selectedTab === 'completed'
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Concluídas ({selectedHero.completedQuests.length})
        </button>
      </div>

      {/* Quest Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedTab === 'available' && availableUniq
          .filter(q => (companionsOnly ? q.isGuildQuest : true))
          .map(quest => (
            <React.Fragment key={`available-${quest.id}`}>
              {renderQuestCard(quest)}
            </React.Fragment>
          ))}
        {/* Conteúdo Narrativas removido */}
        {selectedTab === 'active' && activeIdsUniq
          .map(id => availableUniq.find(q => q.id === id))
          .filter((q): q is Quest => !!q)
          .map((q, idx) => (
            <div key={`active-${q.id}-${idx}`}>
              {renderQuestCard(q, true)}
              {selectedHero && (
                <ActiveMissionRunner key={`runner-${q.id}`} hero={selectedHero} quest={q} />
              )}
              {selectedHero && !(q.type === 'caca' || q.categoryHint === 'escolta') && (
                <AutoCompleteMission key={`auto-${q.id}`} hero={selectedHero} quest={q} />
              )}
              <div className="mt-2 flex justify-end">
                <button onClick={() => abandonQuest(selectedHero!.id, q.id)} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Abandonar</button>
              </div>
            </div>
          ))}
        {selectedTab === 'completed' && completedIdsUniq
          .map(id => availableUniq.find(q => q.id === id))
          .filter((q): q is Quest => !!q)
          .map((q, idx) => (
            <React.Fragment key={`completed-${q.id}-${idx}`}>
              {renderQuestCard(q, false, true)}
            </React.Fragment>
          ))}
      </div>

      {selectedTab === 'available' && availableQuests.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400">Nenhuma missão disponível no momento.</p>
          <button
            onClick={() => {
              console.log('🎲 Gerando novas missões para herói:', selectedHero?.name, 'Level:', selectedHero?.progression.level);
              refreshQuests(selectedHero?.progression.level || 1);
            }}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-md font-medium transition-colors"
          >
            Gerar Novas Missões
          </button>
        </div>
      )}

      {selectedTab === 'active' && selectedHero.activeQuests.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400">Você não tem missões ativas.</p>
        </div>
      )}

      {selectedTab === 'completed' && selectedHero.completedQuests.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400">Você ainda não completou nenhuma missão.</p>
        </div>
      )}

      {/* Mensagens de estado de narrativas removidas */}

      {/* Modal narrativo removido */}
    </div>
  );
};

const ConcludeButton: React.FC<{ heroId: string; questId: string; onConcluded?: () => void }> = ({ heroId, questId, onConcluded }) => {
  const completeQuest = useHeroStore(s => s.completeQuest);
  const [busy, setBusy] = React.useState(false);
  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      completeQuest(heroId, questId, false);
      onConcluded?.();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3">
      <div className="text-sm text-gray-200">Missão finalizada.</div>
      <button onClick={handle} disabled={busy} className={`mt-2 px-3 py-2 rounded ${busy ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{busy ? 'Concluindo...' : 'Concluir Oficialmente'}</button>
    </div>
  );
};

export default QuestBoard;

const AutoCompleteMission: React.FC<{ hero: Hero; quest: Quest }> = ({ hero, quest }) => {
  const completeQuest = useHeroStore(s => s.completeQuest);
  const updateHero = useHeroStore(s => s.updateHero);
  const [started, setStarted] = React.useState(false);
  React.useEffect(() => {
    if (started) return;
    try {
      const stAll = { ...(((hero.stats as any)?.missionRunState) || {}) } as Record<string, any>;
      const k = String(quest.id);
      const st = stAll[k];
      if (st?.finished || st?.running) return;
      stAll[k] = { phase: 0, running: true, finished: false, logs: [] };
      updateHero(hero.id, { stats: { ...hero.stats, missionRunState: stAll } });
      setStarted(true);
      setTimeout(() => {
        completeQuest(hero.id, quest.id, false);
      }, 100);
    } catch {}
  }, [hero.id, quest.id, started]);
  return (
    <div className="mt-2 text-xs text-gray-400">Finalizando missão...</div>
  );
};
