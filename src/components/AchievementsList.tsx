import React, { useState } from 'react';
import { Hero } from '../types/hero';
import { QUEST_ACHIEVEMENTS } from '../utils/quests';
import Achievement from './Achievement';
import { medievalTheme, seasonalThemes } from '../styles/medievalTheme';
import { useMonetizationStore } from '../store/monetizationStore';

interface AchievementsListProps {
  hero: Hero;
}

const AchievementsList: React.FC<AchievementsListProps> = ({ hero }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');

  // Combinar achievements desbloqueados com templates para mostrar progresso
  const allAchievements = QUEST_ACHIEVEMENTS.map(template => {
    const unlockedAchievement = hero.progression.achievements.find(a => a.id === template.id);
    
    if (unlockedAchievement) {
      return { ...unlockedAchievement, isUnlocked: true };
    }
    
    // Calcular progresso atual para achievements não desbloqueados
    let currentProgress = 0;
    
    switch (template.id) {
      case 'primeira-missao':
        currentProgress = hero.stats.questsCompleted >= 1 ? 1 : 0;
        break;
      case 'heroi-da-vila':
        currentProgress = Math.min(template.maxProgress!, hero.stats.questsCompleted);
        break;
      case 'cacador-experiente':
        currentProgress = Math.min(template.maxProgress!, Math.floor(hero.stats.questsCompleted * 0.4));
        break;
      case 'explorador-corajoso':
        currentProgress = Math.min(template.maxProgress!, Math.floor(hero.stats.questsCompleted * 0.3));
        break;
      case 'lenda-epica':
        currentProgress = Math.min(template.maxProgress!, Math.floor(hero.stats.questsCompleted * 0.1));
        break;
      case 'amigo-dos-animais':
        currentProgress = Math.min(template.maxProgress!, (hero.stats.companionQuestsCompleted || 0));
        break;
      case 'domador-de-feras':
        currentProgress = Math.min(template.maxProgress!, (hero.stats.beastEssenceCollected || 0));
        break;
      case 'cavaleiro-mitico':
        currentProgress = Math.min(template.maxProgress!, (hero.stats.mountScrollsFound || 0));
        break;
    }
    
    return {
      ...template,
      progress: currentProgress,
      isUnlocked: false
    };
  });

  const cardsWins = Number((hero.stats as any)?.miniCardsWins || 0);
  const rpsBest = Number((hero.stats as any)?.miniRpsBestStreak || 0);
  const titleAchievements = [
    {
      id: 'cards-champion-achievement',
      title: 'Campeão das Cartas',
      description: 'Vença 10 partidas no Jogo das Cartas',
      icon: '🃏',
      maxProgress: 10,
      progress: cardsWins,
      isUnlocked: !!(hero.achievements || []).find(a => a.id === 'cards-champion-achievement') || !!(hero.progression.achievements || []).find(a => a.id === 'cards-champion-achievement')
    },
    {
      id: 'rps-master-achievement',
      title: 'Mestre do RPS',
      description: 'Alcance sequência de 5 vitórias em RPS',
      icon: '🎯',
      maxProgress: 5,
      progress: rpsBest,
      isUnlocked: !!(hero.achievements || []).find(a => a.id === 'rps-master-achievement') || !!(hero.progression.achievements || []).find(a => a.id === 'rps-master-achievement')
    }
  ];

  const combinedAchievements = [...allAchievements, ...titleAchievements];

  // Filtrar achievements
  const filteredAchievements = combinedAchievements.filter(achievement => {
    if (filter === 'unlocked' && !achievement.isUnlocked) return false;
    if (filter === 'locked' && achievement.isUnlocked) return false;
    if (rarityFilter !== 'all' && achievement.rarity !== rarityFilter) return false;
    return true;
  });

  // Estatísticas
  const unlockedCount = combinedAchievements.filter(a => a.isUnlocked).length;
  const totalCount = combinedAchievements.length;
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-amber-600/30' : 'border-amber-600/30';

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className={`bg-gradient-to-r ${medievalTheme.gradients.backgrounds.hero} text-white p-6 rounded-lg border border-slate-700`}>
        <h2 className="text-2xl font-bold mb-2">🏆 Conquistas</h2>
        <div className="flex items-center space-x-6">
          <div>
            <div className="text-3xl font-bold">{unlockedCount}/{totalCount}</div>
            <div className="text-sm opacity-90">Desbloqueadas</div>
          </div>
          <div className="flex-1">
            <div className="text-sm mb-1">Progresso Geral</div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${medievalTheme.gradients.buttons.royal}`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="text-sm mt-1">{completionPercentage}% completo</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className={`flex flex-wrap gap-4 p-4 rounded-lg border ${seasonalBorder} bg-gray-800`}>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-200">Status:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1 border border-gray-700 bg-gray-900 text-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas</option>
            <option value="unlocked">Desbloqueadas</option>
            <option value="locked">Bloqueadas</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-200">Raridade:</label>
          <select 
            value={rarityFilter} 
            onChange={(e) => setRarityFilter(e.target.value)}
            className="px-3 py-1 border border-gray-700 bg-gray-900 text-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas</option>
            <option value="comum">Comum</option>
            <option value="raro">Raro</option>
            <option value="épico">Épico</option>
            <option value="lendário">Lendário</option>
          </select>
        </div>
      </div>

      {/* Lista de Achievements */}
      <div className="grid gap-4">
        {filteredAchievements.length > 0 ? (
          filteredAchievements.map(achievement => (
            <Achievement
              key={achievement.id}
              achievement={achievement}
              isUnlocked={achievement.isUnlocked}
              showProgress={!achievement.isUnlocked}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <div>Nenhuma conquista encontrada com os filtros selecionados.</div>
          </div>
        )}
      </div>

      {/* Títulos Desbloqueados */}
      {hero.progression.titles && hero.progression.titles.length > 0 && (
        <div className={`bg-gray-800 p-6 rounded-lg border border-gray-700`}>
          <h3 className="text-xl font-bold mb-4 text-white">🎖️ Títulos Conquistados</h3>
          <div className="flex flex-wrap gap-2">
            {hero.progression.titles.map((title, index) => (
              <span 
                key={index}
                className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r ${medievalTheme.gradients.buttons.royal} border border-purple-700/40`}
              >
                {title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dicas para Próximas Conquistas */}
      <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-600/30">
        <h4 className="font-semibold text-blue-300 mb-2">💡 Próximas Conquistas</h4>
        <div className="text-sm text-blue-200 space-y-1">
          {!hero.progression.achievements.some(a => a.id === 'primeira-missao') && (
            <div>• Complete sua primeira missão para desbloquear "Primeira Aventura"</div>
          )}
          {hero.stats.questsCompleted < 5 && (
            <div>• Complete {5 - hero.stats.questsCompleted} missões para "Herói da Vila"</div>
          )}
          {hero.stats.questsCompleted < 10 && (
            <div>• Continue completando missões para desbloquear mais conquistas!</div>
          )}
          {(hero.stats.companionQuestsCompleted || 0) < 5 && (
            <div>• Conclua {(5 - (hero.stats.companionQuestsCompleted || 0))} missões de Companheiros para "Amigo dos Animais"</div>
          )}
          {(hero.stats.beastEssenceCollected || 0) < 3 && (
            <div>• Colete {(3 - (hero.stats.beastEssenceCollected || 0))} Essências Bestiais para "Domador de Feras"</div>
          )}
          {(hero.stats.mountScrollsFound || 0) < 2 && (
            <div>• Encontre {(2 - (hero.stats.mountScrollsFound || 0))} Pergaminhos de Montaria para "Cavaleiro Mítico"</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AchievementsList;