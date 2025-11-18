import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroStore, calculateDerivedAttributes } from '../store/heroStore';
import { notificationBus } from './NotificationSystem';
import { Hero } from '../types/hero';
import { getOrRunDailyResult } from '../services/idleBattleService';
import { calculateXPForLevel, LEVEL_CAP } from '../utils/progression';
import { worldStateManager } from '../utils/worldState';
import { trackMetric } from '../utils/metricsSystem';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes, getRankIcon } from '../styles/medievalTheme';
import { getActiveWeeklyMutator, getActiveGlobalEvents, getPlayerRelics } from '../services/replayService';

interface EnhancedHUDProps {
  hero: Hero;
}

const EnhancedHUD: React.FC<EnhancedHUDProps> = ({ hero }) => {
  const { activeSeasonalTheme } = useMonetizationStore();
  const [daily, setDaily] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [weeklyMutator, setWeeklyMutator] = useState<string | null>(null);
  const submitAbortRef = useRef<AbortController | null>(null);

  const isMaxLevel = hero.progression.level >= LEVEL_CAP;
  const currentLevelXP = calculateXPForLevel(hero.progression.level);
  const nextLevelXP = isMaxLevel ? currentLevelXP : calculateXPForLevel(hero.progression.level + 1);
  const xpProgressRaw = hero.progression.xp - currentLevelXP;
  const xpProgress = Math.max(0, xpProgressRaw);
  const xpNeeded = Math.max(1, nextLevelXP - currentLevelXP);
  const xpPercentage = isMaxLevel ? 100 : Math.max(0, Math.min(100, (xpProgress / xpNeeded) * 100));
  
  // HP / Mana
  const maxHp = hero.derivedAttributes.hp || 0;
  const currentHp = hero.derivedAttributes.currentHp ?? maxHp;
  const hpPercentage = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  
  const maxMp = hero.derivedAttributes.mp || 0;
  const currentMp = hero.derivedAttributes.currentMp ?? maxMp;
  const mpPercentage = Math.max(0, Math.min(100, (currentMp / maxMp) * 100));

  // UI: contadores e pulsos de recuperação
  const [nextHpMpSeconds, setNextHpMpSeconds] = useState<number | null>(null);
  const [nextStaminaSeconds, setNextStaminaSeconds] = useState<number | null>(null);
  const [trainingSeconds, setTrainingSeconds] = useState<number | null>(null);
  const [hpPulse, setHpPulse] = useState<number>(0);
  const [mpPulse, setMpPulse] = useState<number>(0);

  // Usar stamina do objeto de estado do herói para evitar duplicidade
  const maxStamina = hero.stamina?.max ?? 100;
  const currentStamina = hero.stamina?.current ?? 0;
  const staminaPercentage = Math.max(0, Math.min(100, (currentStamina / maxStamina) * 100));
  
  
  
  const getStaminaColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getXPColor = (progress: number) => {
    if (progress >= 80) return 'bg-blue-500';
    if (progress >= 50) return 'bg-blue-400';
    return 'bg-blue-300';
  };

  const getHPColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-red-500';
    if (percentage >= 30) return 'bg-red-400';
    return 'bg-red-300';
  };

  const getMPColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-indigo-500';
    if (percentage >= 30) return 'bg-indigo-400';
    return 'bg-indigo-300';
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await getOrRunDailyResult(hero);
        if (mounted) setDaily(result);
      } catch (e) {
        // silencioso no HUD
      }
      try {
        const wm = await getActiveWeeklyMutator();
        if (mounted) setWeeklyMutator(wm?.name || null);
        await getActiveGlobalEvents();
        await getPlayerRelics();
      } catch {}
    })();
    return () => { mounted = false; };
  }, [hero.id]);

  // Pulsos: detectar aumentos em HP/MP e exibir +N por 2s
  const prevHpRef = useRef<number>(currentHp);
  const prevMpRef = useRef<number>(currentMp);
  useEffect(() => {
    const prevHp = prevHpRef.current ?? 0;
    const prevMp = prevMpRef.current ?? 0;
    const dhp = Math.max(0, (currentHp ?? 0) - (prevHp ?? 0));
    const dmp = Math.max(0, (currentMp ?? 0) - (prevMp ?? 0));
    if (dhp > 0) {
      setHpPulse(dhp);
      const t = setTimeout(() => setHpPulse(0), 2000);
      return () => clearTimeout(t);
    }
    if (dmp > 0) {
      setMpPulse(dmp);
      const t = setTimeout(() => setMpPulse(0), 2000);
      return () => clearTimeout(t);
    }
    prevHpRef.current = currentHp ?? 0;
    prevMpRef.current = currentMp ?? 0;
  }, [currentHp, currentMp]);

  // Contagem regressiva local para próxima recuperação (HP/Mana e Stamina)
  const getSelectedHero = useHeroStore(s => s.getSelectedHero);
  const setActiveMount = useHeroStore(s => s.setActiveMount);
  const evolveMountForSelected = useHeroStore(s => s.evolveMountForSelected);
  const refineCompanion = useHeroStore(s => s.refineCompanion);
  
  const trainMountForSelected = useHeroStore(s => s.trainMountForSelected);
  React.useEffect(() => { const onKey = (e: KeyboardEvent) => { const favs = hero.favoriteMountIds || []; if (e.key === '1' && favs[0]) setActiveMount(favs[0]); if (e.key === '2' && favs[1]) setActiveMount(favs[1]); if (e.key === '3' && favs[2]) setActiveMount(favs[2]); }; window.addEventListener('keydown', onKey as any); return () => window.removeEventListener('keydown', onKey as any); }, [hero.favoriteMountIds])
  const bestMountId = React.useMemo(() => {
    const mounts = hero.mounts || [];
    if (!mounts.length) return undefined as string | undefined;
    if (hero.favoriteMountId && mounts.some(m => m.id === hero.favoriteMountId)) return hero.favoriteMountId as string;
    const stageOrder: Record<string, number> = { comum: 0, encantada: 1, lendaria: 2 };
    const rarityOrder: Record<string, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4, mistico: 5 } as any;
    const score = (m: any) => {
      const attrSum = Object.values(m.attributes || {}).reduce((s: number, v: any) => s + (typeof v === 'number' ? v : 0), 0);
      return (m.speedBonus || 0) * 3 + attrSum + (stageOrder[m.stage] || 0) * 2 + (rarityOrder[m.rarity] || 0);
    };
    return mounts.slice().sort((a,b) => score(b) - score(a))[0]?.id as string | undefined;
  }, [hero.mounts, hero.favoriteMountId]);
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const latest = getSelectedHero() ?? hero;
      // HP/Mana: baseado em lastActiveAt
      const lastAct = latest.stats?.lastActiveAt ? new Date(latest.stats.lastActiveAt).getTime() : now;
      const ttnHpMp = Math.max(0, 60000 - ((now - lastAct) % 60000));
      setNextHpMpSeconds(Math.ceil(ttnHpMp / 1000));
      // Stamina: baseado em lastRecovery
      if (latest.stamina?.lastRecovery) {
        const lr = new Date(latest.stamina.lastRecovery).getTime();
        const ttnSt = Math.max(0, 60000 - ((now - lr) % 60000));
        setNextStaminaSeconds(Math.ceil(ttnSt / 1000));
      } else {
        setNextStaminaSeconds(null);
      }
      // Treino: baseado em stats.trainingActiveUntil
      if (latest.stats?.trainingActiveUntil) {
        const until = new Date(latest.stats.trainingActiveUntil).getTime();
        const remainingMs = Math.max(0, until - now);
        if (remainingMs > 0) {
          setTrainingSeconds(Math.ceil(remainingMs / 1000));
        } else {
          setTrainingSeconds(null);
        }
      } else {
        setTrainingSeconds(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hero.id, getSelectedHero]);

  const formatSecondsToMMSS = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const submitDaily = async () => {
    if (!hero || submitting) return;
    const apiBase = (import.meta as any)?.env?.VITE_API_BASE;
    if (!apiBase) return; // modo offline: não chama API
    setSubmitting(true);
    try {
      const payload = { hero };
      if (submitAbortRef.current) { try { submitAbortRef.current.abort(); } catch {} }
      submitAbortRef.current = new AbortController();
      await fetch(`${apiBase}/daily-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: submitAbortRef.current.signal
      });
      const resLb = await fetch(`${apiBase}/daily-leaderboard`, { signal: submitAbortRef.current.signal });
      const dataLb = await resLb.json();
      setLeaderboard(Array.isArray(dataLb.entries) ? dataLb.entries.slice(0, 3) : []);
      notificationBus.emit({
        type: 'achievement',
        title: 'Ranking Diário',
        message: 'Resultado enviado com sucesso! Confira o Top do dia.',
        icon: '📅',
        duration: 3500
      });
    } catch (err) {
      // silencioso no HUD
      notificationBus.emit({
        type: 'quest',
        title: 'Falha no envio',
        message: 'Não foi possível enviar seu resultado diário.',
        icon: '⚠️',
        duration: 4000
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Envio automático de resumo diário
  useEffect(() => {
    (async () => {
      if (!hero) return;
      if (submitting) return;
      const apiBase = (import.meta as any)?.env?.VITE_API_BASE;
      if (!apiBase) return; // não enviar em dev offline
      await submitDaily();
    })();
    return () => { try { submitAbortRef.current?.abort(); } catch {} };
  }, [hero?.id]);

  const prevAchCount = useRef<number>(hero.progression.achievements.length);
  useEffect(() => {
    const current = hero.progression.achievements.length;
    if (current > prevAchCount.current) {
      const newly = hero.progression.achievements.slice(prevAchCount.current);
      newly.forEach(a => {
        notificationBus.emit({ type: 'quest', title: 'Conquista Desbloqueada', message: `${a.title}`, icon: '🏆', duration: 3000 });
      });
      prevAchCount.current = current;
    }
  }, [hero.progression.achievements.length]);

  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-gray-700' : 'border-gray-700';
  const powerValue = typeof hero.derivedAttributes.power === 'number' 
    ? hero.derivedAttributes.power 
    : calculateDerivedAttributes(hero.attributes, hero.class, hero.progression.level, hero.inventory, hero.activeTitle).power;
  const activePet = (hero.pets || []).find(p => p.id === hero.activePetId);
  const costMap: Record<string, number> = { 'Instinto Feral': 8, 'Pulso Arcano': 10, 'Aura Sagrada': 9, 'Sussurro Sombrio': 12 };
  const petSkillReady = activePet?.exclusiveSkill ? ((activePet.energy || 0) >= (costMap[activePet.exclusiveSkill] || 8)) : false;
  const glowClass = petSkillReady ? 'shadow-2xl shadow-amber-500/20 border-amber-500/40' : seasonalBorder;
  return (
    <div className={`fixed top-2 right-2 md:top-4 md:right-4 z-50 bg-gray-900/95 backdrop-blur-sm border ${glowClass} rounded-lg p-2 md:p-4 min-w-56 sm:min-w-64 md:min-w-80 max-w-[90vw] shadow-xl`}>
      {/* Hero Level and Name */}
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {hero.image ? (
                <img src={hero.image} alt={hero.name} className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border border-amber-500/40 shadow-sm" loading="lazy" decoding="async" />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-gray-800 flex items_center justify-center text-2xl">
                  <span>{hero.avatar || '🛡️'}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-1 inline-flex items-center gap-1 px-3 py-0 rounded-md bg-black/50 border border-amber-500/30 text-[10px] md:text-[11px]">
                <span className="text-white">Nv. {hero.progression.level}</span>
                <span className="text-yellow-300">{getRankIcon(((hero as any)?.rankData?.currentRank) || 'F')} {((hero as any)?.rankData?.currentRank) || 'F'}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-white font-semibold text-sm md:text-base leading-tight truncate max-w-[40vw]">{hero.name}</div>
              </div>
              <div className="text-gray-400 text-[10px] md:text-xs">{hero.class}</div>
            </div>
          </div>
          <div className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] md:text-xs">Poder {powerValue}</div>
        </div>
        {weeklyMutator && (
          <div className="mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded bg-purple-800/40 text-purple-200 border border-purple-600/40 text-[10px] md:text-xs">Mutador semanal: {weeklyMutator}</span>
          </div>
        )}

      

      {/* Montaria Ativa */}
      {(hero.mounts || []).find(m => m.id === hero.activeMountId) && (
        <div className="mb-2 md:mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-amber-300 text-[11px] md:text-xs font-medium">Montaria Ativa</span>
            <span className="text-gray-300 text-[11px] md:text-xs">Velocidade +{(hero.mounts || []).find(m => m.id === hero.activeMountId)?.speedBonus || 0}</span>
          </div>
            <div className="w-full bg-gray-800 rounded p-2">
              <div className="flex items-center justify-between">
                <div className="text-white text-xs md:text-sm font-medium">{(hero.mounts || []).find(m => m.id === hero.activeMountId)?.name}</div>
                <div className="text-xs">
                  {(() => {
                    const m = (hero.mounts || []).find(mm => mm.id === hero.activeMountId);
                    if (!m) return null;
                    return (
                      <span className="text-amber-300">
                        {m.stage}
                        {typeof m.refineLevel === 'number' && m.refineLevel > 0 ? ` • +${m.refineLevel}` : ''}
                        {typeof m.mastery === 'number' && m.mastery > 0 ? ` • Maestria ${m.mastery}` : ''}
                        {(() => { const ms = Math.max(0, m.mastery||0); return ms>=30 ? ' • Mestre' : ms>=20 ? ' • Perito' : ms>=10 ? ' • Adepto' : '' })()}
                      </span>
                    );
                  })()}
                </div>
              </div>
              {(() => {
                const red = worldStateManager.getMountStaminaReduction(hero);
                if (!red) return null;
                const pct = Math.round(red * 100);
                return <div className="mt-1 text-[11px] text-emerald-300">Redução de custo de stamina: {pct}%</div>
              })()}
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => setActiveMount(undefined)} className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-[11px]">Desativar</button>
                {bestMountId && bestMountId !== hero.activeMountId && (
                  <button onClick={() => setActiveMount(bestMountId)} className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]">Ativar melhor</button>
                )}
              <button onClick={() => trainMountForSelected()} className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px]">Treinar</button>
              {(() => {
                const m = (hero.mounts || []).find(mm => mm.id === hero.activeMountId);
                if (!m) return null;
                const needsEssence = m.stage === 'encantada';
                const hasScroll = (hero.inventory.items['pergaminho-montaria'] || 0) > 0;
                const hasEssence = (hero.inventory.items['essencia-bestial'] || 0) > 0;
                const enoughGold = (hero.progression.gold || 0) >= (m.stage === 'comum' ? 200 : 700);
                const canEvolve = hasScroll && enoughGold && (!needsEssence || hasEssence);
                const isMaxRefine = (m.refineLevel || 0) >= 10;
                return (
                  <>
                    <button
                      disabled={!canEvolve}
                      title={canEvolve?`Consome 📜 x1${needsEssence?' + 🧬 x1':''}`:''}
                      onClick={() => {
                        if (canEvolve) {
                          const ok = window.confirm(`Evoluir ${m.name}? Custos: 📜 x1${needsEssence?' + 🧬 x1':''} e ${(m.stage==='comum')?200:700} ouro.`);
                          if (ok) evolveMountForSelected(m.id);
                        }
                      }}
                      className={`px-2 py-1 rounded ${canEvolve?'bg-purple-600 hover:bg-purple-700':'bg-gray-700'} text-white text-[11px]`}
                    >Evoluir</button>
                    <button
                      disabled={isMaxRefine || !((hero.inventory.items['pedra-magica']||0) > 0 || (hero.inventory.items['essencia-vinculo']||0) > 0)}
                      title={isMaxRefine?'Refino máximo atingido':''}
                      onClick={() => {
                        const ok = window.confirm(`Refinar ${m.name}? Consome 1 material e pode falhar.`);
                        if (ok) refineCompanion(hero.id, 'mount', m.id);
                      }}
                      className={`px-2 py-1 rounded ${isMaxRefine?'bg-gray-700':'bg-violet-600 hover:bg-violet-700'} text-white text-[11px]`}
                    >{isMaxRefine?'Refino Máx.':'Refinar'}</button>
                  </>
                );
              })()}
            </div>
            {(() => {
              const mb = hero.mountBuff;
              if (!mb?.speedBonus) return null;
              const end = mb.expiresAt ? new Date(mb.expiresAt).getTime() : 0;
              const rem = Math.max(0, end - Date.now());
              const mins = Math.floor(rem / 60000);
              const secs = Math.floor((rem % 60000) / 1000);
              return <div className="mt-2 text-[11px] text-emerald-300">Buff de velocidade +{mb.speedBonus} • expira em {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</div>;
            })()}
            {(() => {
              const active = (hero.mounts || []).find(mm => mm.id === hero.activeMountId)
              const best = (hero.mounts || []).find(mm => mm.id === bestMountId)
              if (!active || !best || active.id === best.id) return null
              const baseInit = Math.max(0, (hero.derivedAttributes.initiative || 0) - (active.speedBonus || 0))
              const nextInit = Math.max(0, baseInit + (best.speedBonus || 0))
              return (
                <div className="mt-2 text-[11px] text-amber-300">
                  Melhor opção: {best.name} • Velocidade +{best.speedBonus} • Iniciativa se ativar: {nextInit}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* XP Progress */}
      <div className="mb-2 md:mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-blue-400 text-[11px] md:text-xs font-medium">Experiência</span>
          <span className="text-gray-300 text-[11px] md:text-xs">
            {isMaxLevel ? 'MAX' : `${xpProgress}/${xpNeeded} XP`}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 md:h-2">
          <div 
            className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${getXPColor(xpPercentage)}`}
            style={{ width: `${xpPercentage}%` }}
          />
        </div>
        <div className="text-[11px] md:text-xs text-gray-400 mt-1">
          {isMaxLevel ? 'Nível Máximo' : `${xpPercentage.toFixed(1)}% para o nível ${hero.progression.level + 1}`}
        </div>
      </div>

      {/* Attribute Points Indicator */}
      {typeof hero.attributePoints === 'number' && hero.attributePoints > 0 && (
        <div className="mb-2 md:mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-amber-300 text-[11px] md:text-xs font-medium">Pontos de Atributo</span>
            <span className="text-gray-200 text-[11px] md:text-xs">{hero.attributePoints}</span>
          </div>
          <div className="w-full bg-gray-700 rounded h-7 md:h-8 flex items-center justify-between px-2 md:px-3">
            <span className="text-[11px] md:text-xs text-gray-300">Você tem pontos para gastar</span>
            <Link
              to="/progression#atributos"
              title="Gaste seus pontos de atributo"
              onClick={() => {
                try { trackMetric.featureUsed(hero.id, 'hud-attribute-link'); } catch {}
              }}
              className="text-[11px] md:text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded animate-pulse">
              Gastar
            </Link>
          </div>
        </div>
      )}

      
      

      

      

      {/* HP */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-red-400 text-xs font-medium">Vida</span>
          <span className="text-gray-300 text-xs">
            {currentHp}/{maxHp}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getHPColor(hpPercentage)}`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
        
      </div>

      {/* Mana */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-indigo-400 text-xs font-medium">Mana</span>
          <span className="text-gray-300 text-xs">
            {currentMp}/{maxMp}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getMPColor(mpPercentage)}`}
            style={{ width: `${mpPercentage}%` }}
          />
        </div>
        
      </div>

      {/* Stamina */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-green-400 text-xs font-medium">Stamina</span>
          <span className="text-gray-300 text-xs">{currentStamina}/{maxStamina}</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getStaminaColor(staminaPercentage)}`}
            style={{ width: `${staminaPercentage}%` }}
          />
        </div>
        
      </div>

      {/* Treino Ativo */}
      {trainingSeconds !== null && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-yellow-300 text-xs font-medium">Treino</span>
            <span className="text-gray-300 text-[11px]">
              {hero.stats?.trainingActiveName || 'Em andamento'}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded h-7 flex items-center justify-between px-2">
            <span className="text-[11px] text-gray-300">Tempo restante</span>
            <span className="text-[11px] text-yellow-300 font-medium">{formatSecondsToMMSS(trainingSeconds)}</span>
          </div>
        </div>
      )}

      {/* Fadiga */}
      {typeof hero.progression.fatigue === 'number' && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-amber-300 text-xs font-medium">Fadiga</span>
            <span className="text-gray-300 text-xs">{hero.progression.fatigue}/100</span>
          </div>
          {hero.progression.fatigue >= 50 ? (
            <div className="text-xs text-amber-300 mt-1 flex items-center">
              😴 Fadiga alta — descanse na taverna ou use um tônico
            </div>
          ) : hero.progression.fatigue > 0 ? (
            <div className="text-[10px] text-gray-400">Em recuperação passiva durante o tempo</div>
          ) : null}
        </div>
      )}

      

      

      

      
    </div>
  );
};

export default EnhancedHUD;
