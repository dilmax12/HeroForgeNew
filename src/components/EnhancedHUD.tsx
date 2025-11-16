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
import { seasonalThemes } from '../styles/medievalTheme';

interface EnhancedHUDProps {
  hero: Hero;
}

const EnhancedHUD: React.FC<EnhancedHUDProps> = ({ hero }) => {
  const { activeSeasonalTheme } = useMonetizationStore();
  const [daily, setDaily] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

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
  
  const activeQuestId = hero.activeQuests[0]; // Get the first active quest ID
  
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
  const availableQuests = useHeroStore(s => s.availableQuests);
  const acceptQuest = useHeroStore(s => s.acceptQuest);
  const suggested = React.useMemo(() => {
    const list = availableQuests || [];
    return list.find((q: any) => q.isGuildQuest && q.sticky && String(q.id).startsWith('companion-'));
  }, [availableQuests]);
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
      await fetch(`${apiBase}/daily-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resLb = await fetch(`${apiBase}/daily-leaderboard`);
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
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm">
            {hero.progression.level}
          </div>
          <div>
            <div className="text-white font-semibold text-xs md:text-sm">{hero.name}</div>
            <div className="text-gray-400 text-[10px] md:text-xs">{hero.class}</div>
          </div>
        </div>
        <div className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] md:text-xs">Poder {powerValue}</div>
      </div>

      {/* Mascote Ativo */}
      {(hero.pets || []).find(p => p.id === hero.activePetId) && (
        <div className="mb-2 md:mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-amber-300 text-[11px] md:text-xs font-medium">Mascote Ativo</span>
            <span className="text-gray-300 text-[11px] md:text-xs">Skill: {activePet?.exclusiveSkill || '—'}</span>
          </div>
          <div className="w-full bg-gray-800 rounded p-2">
            <div className="flex items-center justify-between">
              <div className="text-white text-xs md:text-sm font-medium">{(hero.pets || []).find(p => p.id === hero.activePetId)?.name}</div>
              <div className="text-gray-400 text-[10px] md:text-xs">Nv. {(hero.pets || []).find(p => p.id === hero.activePetId)?.level}</div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between items-center">
                <span className="text-amber-300 text-[10px]">Energia</span>
                <span className="text-gray-300 text-[10px]">{Math.max(0, Math.min(100, (hero.pets || []).find(p => p.id === hero.activePetId)?.energy || 0))}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, (hero.pets || []).find(p => p.id === hero.activePetId)?.energy || 0))}%` }} />
              </div>
            </div>
          </div>
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

      <div className="mb-2 md:mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-emerald-300 text-xs font-medium">Companheiros</span>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] text-gray-300">
              <input type="checkbox" defaultChecked={(() => { try { return localStorage.getItem('auto_accept_companion_mission') === '1'; } catch { return false; } })()} onChange={e => { try { localStorage.setItem('auto_accept_companion_mission', e.target.checked ? '1' : '0'); } catch {} }} /> Auto-aceitar
            </label>
            <Link to="/mounts" className="text-[11px] text-emerald-300 hover:text-emerald-200">Abrir</Link>
          </div>
        </div>
        <div className="w-full bg-gray-700 rounded p-2 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-white text-xs md:text-sm font-medium">Missões</div>
            <div className="text-emerald-300 text-[11px] md:text-xs">{hero.stats?.companionQuestsCompleted || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-white text-xs md:text-sm font-medium">Essência</div>
            <div className="text-amber-300 text-[11px] md:text-xs">{hero.inventory.items['essencia-bestial'] || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-white text-xs md:text-sm font-medium">Pergaminhos</div>
            <div className="text-purple-300 text-[11px] md:text-xs">{hero.inventory.items['pergaminho-montaria'] || 0}</div>
          </div>
        </div>
        <div className="mt-1 text-[11px] text-gray-300">
          {(() => {
            const ids = hero.activeQuests || [];
            const count = (availableQuests || []).filter((q: any) => ids.includes(q.id) && q.isGuildQuest).length;
            return <Link to="/quests?companions=1" className="text-emerald-300 hover:text-emerald-200">Companheiros ativos: {count}</Link>;
          })()}
        </div>
        {suggested && (
          <div className="mt-1 text-[11px] flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-emerald-800/40 text-emerald-200 border border-emerald-600/40">🐾 Missão sugerida: {suggested.title}</span>
            <button onClick={() => acceptQuest(hero.id, suggested.id)} className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white">Aceitar</button>
            <Link to="/quests?companions=1" className="text-emerald-300 hover:text-emerald-200">Ver</Link>
          </div>
        )}
      </div>
      <div className="mb-2 md:mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-amber-300 text-xs font-medium">Ofertas Diárias</span>
          <Link to="/premium-center#daily" className="text-[11px] text-amber-300 hover:text-amber-200">Abrir</Link>
        </div>
        <div className="w-full bg-gray-700 rounded p-2 text-[11px] text-gray-300">
          {(() => {
            try {
              const dateStr = new Date().toDateString();
              let count = 0;
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i) || '';
                if (k.startsWith(`daily_offer_purchased:${dateStr}:`)) count++;
              }
              return <span>Compradas hoje: {count}</span>;
            } catch { return <span>Compradas hoje: 0</span>; }
          })()}
        </div>
      </div>

      <div className="mb-2 md:mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-yellow-300 text-xs font-medium">Conquistas</span>
          <Link to="/leaderboards#achievements" className="text-[11px] text-yellow-300 hover:text-yellow-200">Ver</Link>
        </div>
        <div className="w-full bg-gray-700 rounded p-2 flex flex-wrap gap-2">
          {(hero.progression.achievements || []).slice(Math.max(0, (hero.progression.achievements || []).length - 3)).map((a, idx) => (
            <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-[11px] bg-yellow-800/40 text-yellow-200 border border-yellow-600/40">
              <span className="mr-1">{a.icon || '🏆'}</span>{a.title}
            </span>
          ))}
          {(hero.progression.achievements || []).length === 0 && (
            <span className="text-[11px] text-gray-300">Sem conquistas recentes</span>
          )}
        </div>
      </div>

      <div className="mb-2 md:mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-indigo-300 text-xs font-medium">Roadmap de Companheiros</span>
          <div className="flex items-center gap-2">
            <Link to="/hunting" className="text-[11px] text-indigo-300 hover:text-indigo-200">Caça</Link>
            <Link to="/dungeon-infinita" className="text-[11px] text-indigo-300 hover:text-indigo-200">Dungeon</Link>
            <Link to="/shop" className="text-[11px] text-indigo-300 hover:text-indigo-200">Loja</Link>
            <Link to="/duel-arena" className="text-[11px] text-indigo-300 hover:text-indigo-200">Arena</Link>
          </div>
        </div>
        {(() => {
          const inv = hero.inventory.items || {} as Record<string, number>;
          const pet = (hero.pets || []).find(p => p.id === hero.activePetId);
          const mount = (hero.mounts || []).find(m => m.id === hero.activeMountId);
          const rows: Array<{ label: string; need: Array<{ id: string; qty: number }>; gold?: number; ready: boolean }> = [];
          if (pet) {
            const refine = Math.max(0, pet.refineLevel || 0);
            if (refine < 10) {
              const hasMagic = (inv['pedra-magica'] || 0) > 0;
              const hasBond = (inv['essencia-vinculo'] || 0) > 0;
              rows.push({ label: `Refinar Mascote (+${refine+1}%)`, need: [{ id: hasMagic ? 'pedra-magica' : 'essencia-vinculo', qty: 1 }], ready: hasMagic || hasBond });
            }
          }
          if (mount) {
            if (mount.stage === 'comum') {
              const needScroll = 1;
              const needGold = 200;
              rows.push({ label: 'Evoluir Montaria para Encantada', need: [{ id: 'pergaminho-montaria', qty: needScroll }], gold: needGold, ready: (inv['pergaminho-montaria']||0)>=needScroll && (hero.progression.gold||0)>=needGold });
            } else if (mount.stage === 'encantada') {
              const needScroll = 1;
              const needEssence = 1;
              const needGold = 700;
              rows.push({ label: 'Evoluir Montaria para Lendária', need: [{ id: 'pergaminho-montaria', qty: needScroll }, { id: 'essencia-bestial', qty: needEssence }], gold: needGold, ready: (inv['pergaminho-montaria']||0)>=needScroll && (inv['essencia-bestial']||0)>=needEssence && (hero.progression.gold||0)>=needGold });
            }
          }
          if (rows.length === 0) {
            return (<div className="w-full bg-gray-700 rounded p-2 text-[11px] text-gray-300">Nenhum objetivo de companheiro pendente</div>);
          }
          return (
            <div className="w-full bg-gray-700 rounded p-2 space-y-2">
              {rows.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="text-[11px] text-white">{r.label}</div>
                  <div className="flex items-center gap-2">
                    {r.need.map((n, i) => (
                      <span key={i} className={`inline-flex items-center px-2 py-1 rounded text-[11px] ${((inv[n.id]||0)>=n.qty)?'bg-emerald-800/40 text-emerald-200 border border-emerald-600/40':'bg-gray-800/40 text-gray-200 border border-gray-600/40'}`}>
                        {n.id} {inv[n.id]||0}/{n.qty}
                      </span>
                    ))}
                    {typeof r.gold === 'number' && (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] ${((hero.progression.gold||0)>=r.gold)?'bg-amber-800/40 text-amber-200 border border-amber-600/40':'bg-gray-800/40 text-gray-200 border border-gray-600/40'}`}>ouro {(hero.progression.gold||0)}/{r.gold}</span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[11px] ${r.ready?'bg-indigo-800/40 text-indigo-200 border border-indigo-600/40':'bg-gray-800/40 text-gray-200 border border-gray-600/40'}`}>{r.ready?'Pronto':'Falta'}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* HP */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-red-400 text-xs font-medium">Vida</span>
          <span className="text-gray-300 text-xs">
            {currentHp}/{maxHp}
            {hpPulse > 0 && (
              <span className="ml-1 text-green-400 text-[10px]">+{hpPulse}</span>
            )}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getHPColor(hpPercentage)}`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
        {hpPercentage < 100 && (
          <div className="text-[10px] text-gray-400 mt-1">⏱️ Próxima recuperação em {nextHpMpSeconds ?? '--'}s</div>
        )}
        {hpPercentage <= 0 && (
          <div className="text-xs text-red-400 mt-1 flex items-center">⚰️ Em recuperação — aguarde regeneração</div>
        )}
      </div>

      {/* Mana */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-indigo-400 text-xs font-medium">Mana</span>
          <span className="text-gray-300 text-xs">
            {currentMp}/{maxMp}
            {mpPulse > 0 && (
              <span className="ml-1 text-green-400 text-[10px]">+{mpPulse}</span>
            )}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getMPColor(mpPercentage)}`}
            style={{ width: `${mpPercentage}%` }}
          />
        </div>
        {mpPercentage < 100 && (
          <div className="text-[10px] text-gray-400 mt-1">⏱️ Próxima recuperação em {nextHpMpSeconds ?? '--'}s</div>
        )}
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
        <div className="text-[10px] text-gray-400 mt-1">⏱️ Próxima recuperação em {nextStaminaSeconds ?? '--'}s</div>
        {staminaPercentage < 30 && (
          <div className="text-xs text-red-400 mt-1 flex items-center">
            ⚠️ Stamina baixa - Descanse para recuperar
          </div>
        )}
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

      {/* Active Quest */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-purple-400 text-xs font-medium">Missão Ativa</span>
          {activeQuestId && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs">Em Progresso</span>
            </div>
          )}
        </div>
        
        {activeQuestId ? (
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400 text-xs font-medium">Missão Ativa</span>
              <span className="text-gray-400 text-xs">⚔️</span>
            </div>
            <div className="text-white text-sm font-medium mb-1 truncate">
              Missão em Andamento
            </div>
            <div className="text-gray-400 text-xs mb-2">
              Você tem uma missão ativa
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400">Em progresso</span>
              </div>
              <span className="text-gray-500">⭐</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-sm">Nenhuma missão ativa</div>
            <div className="text-gray-500 text-xs mt-1">Visite o Quadro de Missões</div>
          </div>
        )}
      </div>

      {/* Daily Goals Preview */}
      {hero.dailyGoals && hero.dailyGoals.length > 0 && (
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white text-sm font-medium flex items-center gap-1">
              🎯 Metas Diárias
            </div>
            <div className="text-xs text-gray-400">
              {hero.dailyGoals.filter(g => g.completed).length}/{hero.dailyGoals.length}
            </div>
          </div>
          <div className="space-y-1">
            {hero.dailyGoals.slice(0, 2).map((goal) => {
              const progressPercentage = (goal.progress / goal.maxProgress) * 100;
              return (
                <div key={goal.id} className="bg-gray-800 rounded p-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`text-gray-300 ${goal.completed ? 'line-through' : ''}`}>
                      {goal.description}
                    </span>
                    {goal.completed && <span className="text-green-400">✓</span>}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        goal.completed ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {hero.dailyGoals.length > 2 && (
              <div className="text-center text-xs text-gray-500 mt-1">
                +{hero.dailyGoals.length - 2} mais metas
              </div>
            )}
          </div>
        </div>
      )}

      {/* Daily Summary */}
      <div className="border-t border-gray-700 pt-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-white text-sm font-medium flex items-center gap-1">
            ⚔️ Resumo Diário
          </div>
          <div className="text-xs text-gray-400">Envio automático ativo</div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-gray-800 rounded p-2">
            <div className="text-blue-400 text-base">✨</div>
            <div className="text-white text-sm font-medium">{daily?.xpTotal ?? 0}</div>
            <div className="text-gray-400 text-xs">XP Hoje</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-yellow-400 text-base">🪙</div>
            <div className="text-white text-sm font-medium">{daily?.goldTotal ?? 0}</div>
            <div className="text-gray-400 text-xs">Ouro Hoje</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-green-400 text-base">✅</div>
            <div className="text-white text-sm font-medium">{daily?.victories ?? 0}</div>
            <div className="text-gray-400 text-xs">Vitórias</div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-purple-400 text-base">♻️</div>
            <div className="text-white text-sm font-medium">{Array.isArray(daily?.runs) ? daily?.runs.length : 0}</div>
            <div className="text-gray-400 text-xs">Execuções</div>
          </div>
        </div>
        {leaderboard.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">Top diário</div>
            <div className="space-y-1">
              {leaderboard.map((entry: any) => (
                <div key={entry.heroId} className={`flex items-center justify-between bg-gray-800 rounded p-2 text-xs ${entry.heroId === hero.id ? 'border border-amber-500/50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">{entry.heroName}</span>
                    {entry.heroId === hero.id && (
                      <span className="text-amber-400 bg-amber-600/20 px-2 py-0.5 rounded">Você</span>
                    )}
                  </div>
                  <div className="text-gray-400">{Math.round(entry.score)} pts</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="border-t border-gray-700 pt-3 mt-3">
        <div className="grid grid-cols-3 gap-2 text-center" data-testid="hero-stats">
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-yellow-400 text-lg">🪙</div>
            <div className="text-white text-sm font-medium">{hero.progression.gold}</div>
            <div className="text-gray-400 text-xs">Ouro</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-green-400 text-lg">✅</div>
            <div className="text-white text-sm font-medium">{hero.completedQuests.length}</div>
            <div className="text-gray-400 text-xs">Missões</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2">
            <div className="text-purple-400 text-lg">👑</div>
            <div className="text-white text-sm font-medium">{hero.titles?.length || 0}</div>
            <div className="text-gray-400 text-xs">Títulos</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedHUD;
