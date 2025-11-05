/**
 * Componente de Display de Stamina
 * Mostra a stamina atual e recuperação em tempo real
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHeroStore } from '../store/heroStore';
import { worldStateManager } from '../utils/worldState';

export const StaminaDisplay: React.FC = () => {
  const { getSelectedHero, updateHero } = useHeroStore();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const selectedHero = getSelectedHero();

  // Atualizar o tempo a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Atualizar stamina do herói baseado no tempo
  useEffect(() => {
    if (selectedHero) {
      const prevCurrent = selectedHero.stamina?.current;
      worldStateManager.updateStamina(selectedHero);
      const nextCurrent = selectedHero.stamina?.current;

      if (typeof prevCurrent === 'number' && typeof nextCurrent === 'number' && nextCurrent !== prevCurrent) {
        updateHero(selectedHero.id, { stamina: selectedHero.stamina });
      }
    }
  }, [currentTime, selectedHero, updateHero]);

  if (!selectedHero || !selectedHero.stamina) {
    return null;
  }

  const { current, max, lastRecovery, recoveryRate } = selectedHero.stamina;
  const percentage = (current / max) * 100;
  
  // Calcular tempo até próxima recuperação
  const lastRecoveryMs = new Date(lastRecovery).getTime();
  const timeSinceLastRecovery = currentTime - lastRecoveryMs;
  const timeToNextRecovery = Math.max(0, 3600000 - (timeSinceLastRecovery % 3600000)); // 1 hora em ms
  const minutesToNext = Math.floor(timeToNextRecovery / 60000);
  const secondsToNext = Math.floor((timeToNextRecovery % 60000) / 1000);

  const getStaminaColor = () => {
    if (percentage >= 80) return 'from-green-500 to-green-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    if (percentage >= 20) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const canDoMission = (cost: number) => current >= cost;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white flex items-center">
          ⚡ Stamina
        </h3>
        <div className="text-sm text-gray-300">
          {current}/{max}
        </div>
      </div>

      {/* Barra de Stamina */}
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

      {/* Informações de Recuperação */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-300">
          <span>Taxa de Recuperação:</span>
          <span>{recoveryRate}/hora</span>
        </div>
        
        {current < max && (
          <div className="flex justify-between text-gray-300">
            <span>Próxima Recuperação:</span>
            <span className="font-mono">
              {minutesToNext.toString().padStart(2, '0')}:
              {secondsToNext.toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* Custos de Missão */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <h4 className="text-sm font-semibold text-white mb-2">Custos de Missão:</h4>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { name: 'Fácil', cost: 20 },
            { name: 'Média', cost: 40 },
            { name: 'Difícil', cost: 60 }
          ].map(({ name, cost }) => (
            <div
              key={name}
              className={`p-2 rounded text-center ${
                canDoMission(cost)
                  ? 'bg-green-900 text-green-300 border border-green-500'
                  : 'bg-red-900 text-red-300 border border-red-500'
              }`}
            >
              <div className="font-semibold">{name}</div>
              <div>{cost} ⚡</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ações de Stamina */}
      <div className="mt-4 space-y-2">
        <button
          onClick={() => {
            // Simular descanso em cidade (recuperação completa)
            const fullStamina = {
              ...selectedHero.stamina,
              current: max,
              lastRecovery: new Date(currentTime).toISOString()
            };
            updateHero(selectedHero.id, { stamina: fullStamina });
          }}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        >
          🏠 Descansar na Cidade (Recuperação Completa)
        </button>
        
        <button
          onClick={() => {
            // Simular uso de item premium (recuperação instantânea)
            const premiumStamina = {
              ...selectedHero.stamina,
              current: Math.min(max, current + 50),
              lastRecovery: new Date(currentTime).toISOString()
            };
            updateHero(selectedHero.id, { stamina: premiumStamina });
          }}
          disabled={current >= max}
          className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          💎 Usar Poção de Energia (+50 ⚡)
        </button>
      </div>

      {/* Status de Stamina */}
      <div className="mt-3 text-center">
        {current === max && (
          <div className="text-green-400 text-sm font-semibold">
            ✨ Stamina Completa!
          </div>
        )}
        {current < 20 && (
          <div className="text-red-400 text-sm font-semibold">
            ⚠️ Stamina Baixa - Descanse!
          </div>
        )}
        {current >= 20 && current < max && (
          <div className="text-yellow-400 text-sm">
            🔄 Recuperando...
          </div>
        )}
      </div>
    </div>
  );
};
