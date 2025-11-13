import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { Hero } from '../types/hero';
import { getOrRunDailyResult } from '../services/idleBattleService';
import { notificationBus } from './NotificationSystem';
import { calculateXPForLevel, LEVEL_CAP } from '../utils/progression';
import { worldStateManager } from '../utils/worldState';
import { trackMetric } from '../utils/metricsSystem';

interface EnhancedHUDProps {
  hero: Hero;
}

const EnhancedHUD: React.FC<EnhancedHUDProps> = ({ hero }) => {
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
    setSubmitting(true);
    try {
      const payload = { hero };
      await fetch('/api/daily-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resLb = await fetch('/api/daily-leaderboard');
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

  return (
    <div className="fixed top-2 right-2 md:top-4 md:right-4 z-50 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 md:p-4 min-w-64 md:min-w-80 shadow-xl">
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
        <div className="text-amber-400 text-base md:text-lg">⚡</div>
      </div>

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
          <button
            onClick={submitDaily}
            disabled={submitting}
            className={`text-xs px-2 py-1 rounded ${submitting ? 'bg-gray-700 text-gray-400' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
            title="Enviar resultado para o ranking diário"
          >
            {submitting ? 'Enviando...' : 'Enviar'}
          </button>
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
