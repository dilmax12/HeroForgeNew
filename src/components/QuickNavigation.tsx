import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { useMonetizationStore } from '../store/monetizationStore';
import { getSeasonalButtonGradient } from '../styles/medievalTheme';

const QuickNavigation: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const location = useLocation();
  const { getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const { activeSeasonalTheme } = useMonetizationStore();
  const g = getSeasonalButtonGradient(activeSeasonalTheme as any);
  
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
      id: 'pets',
      label: 'Mascotes',
      icon: '🐾',
      path: '/pets',
      color: 'bg-teal-600 hover:bg-teal-700',
      badge: (() => {
        const eggs = selectedHero.eggs || [];
        const ready = eggs.filter(e => e.status === 'pronto_para_chocar').length;
        return ready > 0 ? String(ready) : null;
      })()
    },
    {
      id: 'hatch-next',
      label: 'Chocar Próximo',
      icon: '🐣',
      path: '/pets?hatchNext=1',
      color: 'bg-amber-600 hover:bg-amber-700'
    },
    {
      id: 'guild-hub',
      label: 'Guilda dos Aventureiros',
      icon: '🏰',
      path: '/guild-hub',
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    {
      id: 'dungeon-infinita',
      label: 'Dungeon Infinita',
      icon: '🗝️',
      path: '/dungeon-infinita',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    
    {
      id: 'training',
      label: 'Treinamento',
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
    }
  ];

  const isCurrentPath = (path: string) => location.pathname === path;
  const actionsById = Object.fromEntries(quickActions.map(a => [a.id, a]));

  const groups: { id: string; title: string; icon: string; items: string[] }[] = [
    { id: 'aventura', title: 'Aventura', icon: '🧭', items: ['quests','dungeon-infinita'] },
    { id: 'companheiros', title: 'Companheiros', icon: '🐾', items: ['pets','hatch-next'] },
    { id: 'progresso', title: 'Progresso', icon: '📈', items: ['training','daily-goals'] },
    { id: 'comunidade', title: 'Comunidade', icon: '🏰', items: ['guild-hub'] },
    { id: 'economia', title: 'Economia', icon: '💰', items: ['shop'] }
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-14 h-14 rounded-full bg-gradient-to-r ${g} hover:brightness-110 text-white shadow-lg transition-all duration-300 flex items-center justify-center ${
          isExpanded ? 'rotate-45' : ''
        }`}
      >
        <span className="text-2xl">⚡</span>
      </button>

      {/* Quick Action Menu */}
      {isExpanded && (
        <div className="absolute bottom-16 left-0 animate-slide-in-up">
          <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-3 shadow-2xl w-[90vw] max-w-sm sm:max-w-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups.map((grp) => {
                const active = grp.items.some(id => isCurrentPath(actionsById[id]?.path || ''));
                const open = openGroupId === grp.id;
                return (
                  <div key={grp.id} className="bg-slate-800 border border-slate-700 rounded-lg">
                    <button
                      onClick={() => setOpenGroupId(open ? null : grp.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm text-white rounded-t-lg ${active ? 'ring-2 ring-amber-400' : ''}`}
                    >
                      <span className="inline-flex items-center gap-2"><span>{grp.icon}</span><span className="font-semibold">{grp.title}</span></span>
                      <span className="text-xs text-gray-300">{open ? '−' : '+'}</span>
                    </button>
                    {open && (
                      <div className="px-2 pb-2 grid grid-cols-1 gap-2">
                        {grp.items.map((id) => {
                          const a = actionsById[id];
                          if (!a) return null;
                          return (
                            <Link
                              key={id}
                              to={a.path}
                              onClick={() => setIsExpanded(false)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white bg-gradient-to-r ${g} ${isCurrentPath(a.path) ? 'ring-2 ring-white/50' : ''}`}
                            >
                              <div className="relative">
                                <span className="text-lg">{a.icon}</span>
                                {a.badge && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">{a.badge}</div>
                                )}
                              </div>
                              <span className="text-sm font-medium">{a.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 bg-gray-800 rounded-lg p-3 text-white shadow-lg">
              <div className="text-xs text-gray-400 mb-2">Status Rápido</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  <span className="text-blue-400">⭐</span>
                  <span>Nv. {selectedHero.progression.level}</span>
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
        </div>
      )}
    </div>
  );
};

export default QuickNavigation;
