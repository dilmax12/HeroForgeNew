/**
 * Componente de Display de Stamina
 * Mostra a stamina atual e recuperação em tempo real
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHeroStore } from '../store/heroStore';
import { worldStateManager } from '../utils/worldState';
 

export const StaminaDisplay: React.FC = () => {
  const { getSelectedHero, updateHero, gainGold } = useHeroStore();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const selectedHero = getSelectedHero();
  const trainingUntilISO = selectedHero?.stats?.trainingActiveUntil;
  const trainingName = selectedHero?.stats?.trainingActiveName;
  const [trainingSeconds, setTrainingSeconds] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  

  // Atualizar o tempo a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  

  // Atualizar contador de treino baseado no tempo atual
  useEffect(() => {
    if (trainingUntilISO) {
      const until = new Date(trainingUntilISO).getTime();
      const remainingMs = Math.max(0, until - currentTime);
      if (remainingMs > 0) {
        setTrainingSeconds(Math.ceil(remainingMs / 1000));
      } else {
        setTrainingSeconds(null);
      }
    } else {
      setTrainingSeconds(null);
    }
  }, [currentTime, trainingUntilISO]);

  const formatSecondsToMMSS = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!selectedHero) {
    return null;
  }
  const currentFatigue = Math.max(0, Number(selectedHero.progression?.fatigue || 0));
  const percentage = Math.max(0, Math.min(100, (currentFatigue / 100) * 100));

  const getStaminaColor = () => {
    if (percentage >= 80) return 'from-green-500 to-green-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    if (percentage >= 20) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center">
          😴 Fadiga
        </h3>
        <div className="text-sm text-gray-300">
          {currentFatigue}/100
        </div>
      </div>

      {/* Barra de Fadiga */}
      <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden mb-3">
        <motion.div
          className={`h-full bg-gradient-to-r ${getStaminaColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
          {Math.round(percentage)}%
        </div>
      </div>

      {/* Informações de Fadiga */}
      <div className="space-y-2 text-sm">
        <div className="text-gray-300">Fadiga aumenta ao realizar ações e treinos.</div>
        <div className="text-gray-400">Descanse na taverna para reduzir a fadiga.</div>
      </div>

      {/* Descanso na Taverna */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <h4 className="text-sm font-semibold text-white mb-2">Descanso na Taverna:</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label: 'Soneca', cost: 15, recovery: 15 },
            { label: 'Noite', cost: 30, recovery: 30 },
            { label: 'Luxo', cost: 60, recovery: 60 }
          ].map(o => (
            <button
              key={o.label}
              disabled={busy || currentFatigue <= 0}
              onClick={() => { 
                if (busy) return; 
                setBusy(true); 
                const h = { ...selectedHero } as any;
                worldStateManager.rest(h, 'item', o.recovery);
                updateHero(selectedHero.id, { progression: h.progression, stats: h.stats });
                gainGold(selectedHero.id, -(o.cost));
                setBusy(false); 
              }}
              className={`p-2 rounded ${currentFatigue>0?'bg-amber-700 hover:bg-amber-800 text-white border border-amber-500':'bg-gray-700 text-gray-400 border border-gray-600'} text-center`}
            >
              <div className="font-semibold">{o.label}</div>
              <div>-{o.recovery} • {o.cost} 🪙</div>
            </button>
          ))}
        </div>
      </div>

      

      {/* Status de Fadiga */}
      <div className="mt-3 text-center">
        {currentFatigue >= 80 && (
          <div className="text-red-400 text-sm font-semibold">
            ⚠️ Fadiga muito alta — descanse!
          </div>
        )}
        {currentFatigue > 0 && currentFatigue < 80 && (
          <div className="text-yellow-400 text-sm">
            🔔 Fadiga presente — considere descansar.
          </div>
        )}
        {trainingSeconds !== null && (
          <div className="mt-2 text-sm text-yellow-300">
            🏃 Treino: {trainingName || 'Em andamento'} — {formatSecondsToMMSS(trainingSeconds)}
          </div>
        )}
      </div>
      
    </div>
  );
};
