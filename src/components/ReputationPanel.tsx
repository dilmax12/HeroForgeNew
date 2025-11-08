import React from 'react';
import { Hero } from '../types/hero';
import { 
  getReputationLevel, 
  FACTION_DESCRIPTIONS,
  calculateReputationModifiers 
} from '../utils/reputationSystem';

interface ReputationPanelProps {
  hero: Hero;
}

const ReputationPanel: React.FC<ReputationPanelProps> = ({ hero }) => {
  const getProgressPercentage = (reputation: number) => {
    const nextLevelIndex = Math.min(
      6, // Máximo índice
      Math.max(0, 
        [...Array(7)].findIndex((_, i) => reputation < [
          -1000, -500, -100, 0, 100, 500, 1000
        ][i + 1] || i === 6)
      )
    );
    
    const currentThreshold = [-1000, -500, -100, 0, 100, 500, 1000][nextLevelIndex];
    const nextThreshold = [-1000, -500, -100, 0, 100, 500, 1000][nextLevelIndex + 1] || 1000;
    
    if (reputation >= 1000) return 100;
    if (reputation <= -1000) return 0;
    
    const progress = ((reputation - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-amber-400 mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Reputação das Facções
      </h3>
      
      <div className="space-y-4">
        {(hero.reputationFactions || []).map((faction) => {
          const level = getReputationLevel(faction.reputation);
          const modifiers = calculateReputationModifiers(hero, faction.name);
          const factionInfo = FACTION_DESCRIPTIONS[faction.name as keyof typeof FACTION_DESCRIPTIONS];
          const progress = getProgressPercentage(faction.reputation);
          
          return (
            <div key={faction.name} className="bg-gray-700 rounded-lg p-4" title={`${level.name}: ${level.description}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-white">{faction.name}</h4>
                  <p className="text-sm text-gray-400">{factionInfo?.description}</p>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${level.color}`}>
                    {level.name}
                  </span>
                  <div className="text-sm text-gray-400">
                    {faction.reputation}/1000
                  </div>
                  {(modifiers.goldBonus !== 0 || modifiers.xpBonus !== 0) && (
                    <div className="text-xs text-gray-300 mt-1">
                      {modifiers.goldBonus !== 0 && (
                        <span className={modifiers.goldBonus > 0 ? 'text-yellow-300' : 'text-red-400'}>
                          Ouro {modifiers.goldBonus > 0 ? '+' : ''}{Math.round(modifiers.goldBonus * 100)}%
                        </span>
                      )}
                      {modifiers.xpBonus !== 0 && (
                        <span className={`ml-2 ${modifiers.xpBonus > 0 ? 'text-blue-300' : 'text-red-400'}`}>
                          XP {modifiers.xpBonus > 0 ? '+' : ''}{Math.round(modifiers.xpBonus * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Barra de Progresso */}
              <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    faction.reputation >= 0 
                      ? 'bg-gradient-to-r from-green-500 to-blue-500' 
                      : 'bg-gradient-to-r from-red-500 to-orange-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              {/* Modificadores */}
              {(modifiers.goldBonus !== 0 || modifiers.xpBonus !== 0) && (
                <div className="flex space-x-4 text-sm">
                  {modifiers.goldBonus !== 0 && (
                    <span className={modifiers.goldBonus > 0 ? 'text-yellow-400' : 'text-red-400'}>
                      Gold: {modifiers.goldBonus > 0 ? '+' : ''}{Math.round(modifiers.goldBonus * 100)}%
                    </span>
                  )}
                  {modifiers.xpBonus !== 0 && (
                    <span className={modifiers.xpBonus > 0 ? 'text-blue-400' : 'text-red-400'}>
                      XP: {modifiers.xpBonus > 0 ? '+' : ''}{Math.round(modifiers.xpBonus * 100)}%
                    </span>
                  )}
                </div>
              )}
              
              {/* Missões Especiais Desbloqueadas */}
              {level.questModifiers.specialQuestsUnlocked.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-purple-400 font-medium">Missões Especiais:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {level.questModifiers.specialQuestsUnlocked.map((quest) => (
                      <span 
                        key={quest}
                        className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded"
                      >
                        {quest.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Facções Aliadas/Inimigas */}
              {factionInfo && (
                <div className="mt-3 text-xs">
                  {factionInfo.allyFactions.length > 0 && (
                    <div className="mb-1">
                      <span className="text-green-400">Aliados: </span>
                      <span className="text-gray-400">
                        {factionInfo.allyFactions.join(', ')}
                      </span>
                    </div>
                  )}
                  {factionInfo.opposingFactions.length > 0 && (
                    <div>
                      <span className="text-red-400">Inimigos: </span>
                      <span className="text-gray-400">
                        {factionInfo.opposingFactions.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Dicas de Reputação */}
      <div className="mt-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Dicas de Reputação</h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Missões do hub da Guilda afetam sua reputação com facções</li>
          <li>• Maior reputação = melhores recompensas e missões especiais</li>
          <li>• Cuidado: algumas facções são inimigas entre si</li>
          <li>• Reputação negativa pode fechar certas oportunidades</li>
        </ul>
      </div>
    </div>
  );
};

export default ReputationPanel;
