import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';

const QuickNavigation: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { selectedHero } = useHeroStore();
  
  if (!selectedHero) return null;

  const quickActions = [
    {
      id: 'quests',
      label: 'Missões',
      icon: '⚔️',
      path: '/quests',
      color: 'bg-blue-600 hover:bg-blue-700',
      badge: selectedHero.activeQuests.length > 0 ? selectedHero.activeQuests.length : null
    },
    {
      id: 'training',
      label: 'Treino',
      icon: '💪',
      path: '/training',
      color: 'bg-red-600 hover:bg-red-700',
      badge: (selectedHero.derivedAttributes.currentHp || selectedHero.derivedAttributes.hp) < selectedHero.derivedAttributes.hp * 0.3 ? '!' : null
    },
    {
      id: 'shop',
      label: 'Loja',
      icon: '🏪',
      path: '/shop',
      color: 'bg-green-600 hover:bg-green-700',
      badge: selectedHero.progression.gold >= 100 ? '$' : null
    },
    {
      id: 'daily-goals',
      label: 'Metas Diárias',
      icon: '🎯',
      path: '/daily-goals',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      badge: selectedHero.dailyGoals ? selectedHero.dailyGoals.filter(g => g.completed).length : null
    },
    {
      id: 'tutorial',
      label: 'Tutorial',
      icon: '🎓',
      path: '/tutorial',
      color: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      id: 'events',
      label: 'Eventos',
      icon: '🎪',
      path: '/events',
      color: 'bg-pink-600 hover:bg-pink-700'
    },
    {
      id: 'activities',
      label: 'Atividades',
      icon: '📰',
      path: '/activities',
      color: 'bg-cyan-600 hover:bg-cyan-700'
    },
    {
      id: 'guilds',
      label: 'Guildas',
      icon: '🏰',
      path: '/guilds',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'leaderboards',
      label: 'Rankings',
      icon: '🏆',
      path: '/leaderboards',
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    {
      id: 'metrics',
      label: 'Métricas',
      icon: '📊',
      path: '/metrics',
      color: 'bg-blue-600 hover:bg-blue-700'
    }
  ];

  const isCurrentPath = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg transition-all duration-300 flex items-center justify-center ${
          isExpanded ? 'rotate-45' : ''
        }`}
      >
        <span className="text-2xl">⚡</span>
      </button>

      {/* Quick Action Menu */}
      {isExpanded && (
        <div className="absolute bottom-16 left-0 space-y-2 animate-slide-in-up">
          {quickActions.map((action, index) => (
            <Link
              key={action.id}
              to={action.path}
              data-testid={`quick-nav-${action.id}`}
              onClick={() => setIsExpanded(false)}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg text-white shadow-lg transition-all duration-300 min-w-40
                ${action.color}
                ${isCurrentPath(action.path) ? 'ring-2 ring-white ring-opacity-50' : ''}
                transform hover:scale-105
              `}
              style={{
                animationDelay: `${index * 50}ms`
              }}
            >
              <div className="relative">
                <span className="text-xl">{action.icon}</span>
                {action.badge && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {action.badge}
                  </div>
                )}
              </div>
              <span className="font-medium">{action.label}</span>
            </Link>
          ))}
          
          {/* Quick Stats */}
          <div className="bg-gray-800 rounded-lg p-3 text-white shadow-lg">
            <div className="text-xs text-gray-400 mb-2">Status Rápido</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-blue-400">⭐</span>
                <span>Nv. {selectedHero.level}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-yellow-400">🪙</span>
                <span>{selectedHero.progression.gold}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-400">💚</span>
                <span>{Math.floor((selectedHero.derivedAttributes.currentHp || selectedHero.derivedAttributes.hp) / selectedHero.derivedAttributes.hp * (selectedHero.attributes.constituicao * 5))}/{selectedHero.attributes.constituicao * 5}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-purple-400">⚔️</span>
                <span>{selectedHero.activeQuests.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickNavigation;