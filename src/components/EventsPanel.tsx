import React, { useState, useEffect } from 'react';
import { useHeroStore } from '../store/heroStore';
import { eventManager } from '../utils/eventSystem';
import { GameEvent, EventProgress, EventReward } from '../types/events';

const EventsPanel: React.FC = () => {
  const { selectedHeroId, gainXP, gainGold, addTitle } = useHeroStore();
  const [activeEvents, setActiveEvents] = useState<GameEvent[]>([]);
  const [eventProgress, setEventProgress] = useState<EventProgress[]>([]);
  const [timeUntilRotation, setTimeUntilRotation] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [selectedHeroId]);

  const loadEvents = () => {
    const events = eventManager.getActiveEvents();
    setActiveEvents(events);
    
    if (selectedHeroId) {
      const progress = eventManager.getEventProgress(selectedHeroId);
      setEventProgress(progress);
    }
    
    const timeLeft = eventManager.getTimeUntilNextRotation();
    setTimeUntilRotation(timeLeft);
  };

  const getEventProgress = (eventId: string): EventProgress | undefined => {
    return eventProgress.find(p => p.eventId === eventId);
  };

  const getProgressPercentage = (event: GameEvent): number => {
    const progress = getEventProgress(event.id);
    if (!progress) return 0;
    return Math.min((progress.progress / event.targetValue) * 100, 100);
  };

  const handleClaimRewards = async (event: GameEvent) => {
    if (!selectedHeroId) return;

    const rewards = eventManager.claimEventRewards(selectedHeroId, event.id);
    if (!rewards) return;

    // Apply rewards
    for (const reward of rewards) {
      switch (reward.type) {
        case 'xp':
          if (reward.amount) {
            gainXP(selectedHeroId, reward.amount);
          }
          break;
        case 'gold':
          if (reward.amount) {
            gainGold(selectedHeroId, reward.amount);
          }
          break;
        case 'title':
          if (reward.titleId) {
            addTitle(selectedHeroId, reward.titleId);
          }
          break;
      }
    }

    // Reload events to update UI
    loadEvents();
  };

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const formatRewards = (rewards: EventReward[]): string => {
    return rewards.map(reward => {
      switch (reward.type) {
        case 'xp': return `${reward.amount} XP`;
        case 'gold': return `${reward.amount} 🪙`;
        case 'title': return `Título: ${reward.titleId}`;
        case 'item': return reward.itemName || 'Item';
        default: return '';
      }
    }).join(', ');
  };

  const dailyEvents = activeEvents.filter(e => e.type === 'daily');
  const weeklyEvents = activeEvents.filter(e => e.type === 'weekly');
  const specialEvents = activeEvents.filter(e => e.type === 'special');

  if (!selectedHeroId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎪</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Eventos Especiais</h2>
          <p className="text-gray-600">Selecione um herói para ver os eventos disponíveis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🎪 Eventos Especiais</h1>
        <p className="text-gray-600">
          Participe de eventos limitados e ganhe recompensas exclusivas!
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-100 rounded-lg">
          <span className="text-sm text-blue-800">
            ⏰ Próxima rotação em: {timeUntilRotation.hours}h {timeUntilRotation.minutes}m
          </span>
        </div>
      </div>

      {/* Daily Events */}
      {dailyEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            ☀️ Eventos Diários
            <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
              {dailyEvents.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dailyEvents.map(event => {
              const progress = getEventProgress(event.id);
              const percentage = getProgressPercentage(event);
              const isCompleted = progress?.completed || false;
              const canClaim = isCompleted && !progress?.rewardsClaimed;

              return (
                <div
                  key={event.id}
                  className={`border-2 rounded-lg p-6 ${getRarityColor(event.rarity)} transition-all duration-200 hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-3xl mr-3">{event.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800">{event.name}</h3>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="text-green-500 text-xl">✅</span>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-700 mb-2">{event.objective}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${event.color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {progress?.progress || 0} / {event.targetValue}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Recompensas:</p>
                    <p className="text-sm text-gray-600">{formatRewards(event.rewards)}</p>
                  </div>

                  {canClaim && (
                    <button
                      onClick={() => handleClaimRewards(event)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium"
                    >
                      🎁 Resgatar Recompensas
                    </button>
                  )}

                  {progress?.rewardsClaimed && (
                    <div className="w-full bg-gray-100 text-gray-500 py-2 px-4 rounded-lg text-center text-sm">
                      ✅ Recompensas Resgatadas
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Events */}
      {weeklyEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            📅 Eventos Semanais
            <span className="ml-2 text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {weeklyEvents.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weeklyEvents.map(event => {
              const progress = getEventProgress(event.id);
              const percentage = getProgressPercentage(event);
              const isCompleted = progress?.completed || false;
              const canClaim = isCompleted && !progress?.rewardsClaimed;

              return (
                <div
                  key={event.id}
                  className={`border-2 rounded-lg p-6 ${getRarityColor(event.rarity)} transition-all duration-200 hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-4xl mr-4">{event.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{event.name}</h3>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="text-green-500 text-2xl">✅</span>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 mb-3">{event.objective}</p>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`bg-gradient-to-r ${event.color} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {progress?.progress || 0} / {event.targetValue}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="font-medium text-gray-700 mb-2">Recompensas Épicas:</p>
                    <p className="text-gray-600">{formatRewards(event.rewards)}</p>
                  </div>

                  {canClaim && (
                    <button
                      onClick={() => handleClaimRewards(event)}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium text-lg"
                    >
                      👑 Resgatar Recompensas Épicas
                    </button>
                  )}

                  {progress?.rewardsClaimed && (
                    <div className="w-full bg-gray-100 text-gray-500 py-3 px-4 rounded-lg text-center">
                      ✅ Recompensas Épicas Resgatadas
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Special Events */}
      {specialEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            ⭐ Eventos Especiais
            <span className="ml-2 text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">
              {specialEvents.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {specialEvents.map(event => {
              const progress = getEventProgress(event.id);
              const percentage = getProgressPercentage(event);
              const isCompleted = progress?.completed || false;
              const canClaim = isCompleted && !progress?.rewardsClaimed;

              return (
                <div
                  key={event.id}
                  className={`border-2 rounded-lg p-6 ${getRarityColor(event.rarity)} transition-all duration-200 hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <span className="text-4xl mr-4">{event.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{event.name}</h3>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="text-green-500 text-2xl">✅</span>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 mb-3">{event.objective}</p>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`bg-gradient-to-r ${event.color} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {progress?.progress || 0} / {event.targetValue}
                    </p>
                  </div>

                  <div className="mb-4">
                    <p className="font-medium text-gray-700 mb-2">Recompensas Lendárias:</p>
                    <p className="text-gray-600">{formatRewards(event.rewards)}</p>
                  </div>

                  {canClaim && (
                    <button
                      onClick={() => handleClaimRewards(event)}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium text-lg"
                    >
                      🏆 Resgatar Recompensas Lendárias
                    </button>
                  )}

                  {progress?.rewardsClaimed && (
                    <div className="w-full bg-gray-100 text-gray-500 py-3 px-4 rounded-lg text-center">
                      ✅ Recompensas Lendárias Resgatadas
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Events */}
      {activeEvents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎪</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum Evento Ativo</h2>
          <p className="text-gray-600">
            Novos eventos serão gerados em breve. Volte mais tarde!
          </p>
        </div>
      )}
    </div>
  );
};

export default EventsPanel;