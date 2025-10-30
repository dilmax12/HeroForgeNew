import React, { useState, useEffect } from 'react';
import { Activity, ActivityFilter } from '../types/activity';
import { activityManager } from '../utils/activitySystem';
import { useHeroStore } from '../store/heroStore';

interface ActivityFeedProps {
  heroId?: string;
  showFilters?: boolean;
  maxItems?: number;
  compact?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  heroId,
  showFilters = true,
  maxItems = 20,
  compact = false
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<Partial<ActivityFilter>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const { currentHero } = useHeroStore();

  useEffect(() => {
    loadActivities();
  }, [heroId, filter, maxItems]);

  const loadActivities = () => {
    let loadedActivities: Activity[];
    
    if (heroId) {
      loadedActivities = activityManager.getHeroActivities(heroId, maxItems);
    } else {
      const feed = activityManager.getActivityFeed(filter);
      loadedActivities = feed.activities.slice(0, maxItems);
    }
    
    setActivities(loadedActivities);
  };

  const handleLike = (activityId: string) => {
    if (activityManager.likeActivity(activityId)) {
      loadActivities();
    }
  };

  const handleComment = (activityId: string) => {
    const comment = newComment[activityId]?.trim();
    if (!comment || !currentHero) return;

    if (activityManager.addComment(
      activityId,
      currentHero.id,
      currentHero.name,
      comment
    )) {
      setNewComment(prev => ({ ...prev, [activityId]: '' }));
      loadActivities();
    }
  };

  const handleShare = async (activityId: string) => {
    const shareData = activityManager.shareActivity(activityId);
    if (!shareData) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'HeroForge - Conquista Épica',
          text: shareData.shareText,
          url: shareData.shareUrl
        });
      } catch (error) {
        // Fallback para cópia
        copyToClipboard(shareData.shareUrl);
      }
    } else {
      copyToClipboard(shareData.shareUrl);
    }

    loadActivities();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Mostrar notificação de sucesso
      console.log('Link copiado para a área de transferência!');
    });
  };

  const toggleComments = (activityId: string) => {
    setShowComments(prev => ({
      ...prev,
      [activityId]: !prev[activityId]
    }));
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const FilterPanel = () => (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-3">Filtros</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tipo de Atividade
          </label>
          <select
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            onChange={(e) => {
              const types = e.target.value ? [e.target.value as Activity['type']] : undefined;
              setFilter(prev => ({ ...prev, types }));
            }}
          >
            <option value="">Todos os tipos</option>
            <option value="quest-completed">Missões Completadas</option>
            <option value="epic-quest-completed">Missões Épicas</option>
            <option value="level-up">Subida de Nível</option>
            <option value="achievement-unlocked">Conquistas</option>
            <option value="title-earned">Títulos</option>
            <option value="event-completed">Eventos</option>
            <option value="daily-goal-completed">Metas Diárias</option>
            <option value="combat-victory">Vitórias em Combate</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Período
          </label>
          <select
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            onChange={(e) => {
              const value = e.target.value;
              let dateRange;
              
              if (value === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                dateRange = { start: today, end: tomorrow };
              } else if (value === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                dateRange = { start: weekAgo, end: new Date() };
              } else if (value === 'month') {
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                dateRange = { start: monthAgo, end: new Date() };
              }
              
              setFilter(prev => ({ ...prev, dateRange }));
            }}
          >
            <option value="">Todo o período</option>
            <option value="today">Hoje</option>
            <option value="week">Última semana</option>
            <option value="month">Último mês</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Visibilidade
          </label>
          <select
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            onChange={(e) => {
              const showOnlyPublic = e.target.value === 'public' ? true : undefined;
              setFilter(prev => ({ ...prev, showOnlyPublic }));
            }}
          >
            <option value="">Todas as atividades</option>
            <option value="public">Apenas públicas</option>
          </select>
        </div>
      </div>
    </div>
  );

  const ActivityCard = ({ activity }: { activity: Activity }) => (
    <div className={`bg-gradient-to-r ${activity.color} p-0.5 rounded-lg mb-4`}>
      <div className="bg-gray-900 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="text-2xl">{activity.icon}</div>
            <div className="flex-1">
              <p className="text-white font-medium">{activity.message}</p>
              <p className="text-gray-400 text-sm mt-1">
                {formatTimeAgo(activity.timestamp)}
              </p>
              
              {!compact && activity.data.questReward && (
                <div className="mt-2 text-sm text-gray-300">
                  <span className="text-yellow-400">+{activity.data.questReward.xp} XP</span>
                  {activity.data.questReward.gold > 0 && (
                    <span className="ml-2 text-yellow-500">+{activity.data.questReward.gold} ouro</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {!compact && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleLike(activity.id)}
                className="flex items-center space-x-1 text-gray-400 hover:text-red-400 transition-colors"
              >
                <span>❤️</span>
                <span className="text-sm">{activity.likes}</span>
              </button>

              <button
                onClick={() => toggleComments(activity.id)}
                className="flex items-center space-x-1 text-gray-400 hover:text-blue-400 transition-colors"
              >
                <span>💬</span>
                <span className="text-sm">{activity.comments.length}</span>
              </button>

              <button
                onClick={() => handleShare(activity.id)}
                className="flex items-center space-x-1 text-gray-400 hover:text-green-400 transition-colors"
              >
                <span>🔗</span>
                <span className="text-sm">{activity.shares}</span>
              </button>
            </div>
          </div>
        )}

        {!compact && showComments[activity.id] && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            {activity.comments.map(comment => (
              <div key={comment.id} className="mb-3 last:mb-0">
                <div className="flex items-start space-x-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {currentHero && (
              <div className="mt-3 flex space-x-2">
                <input
                  type="text"
                  placeholder="Adicionar comentário..."
                  value={newComment[activity.id] || ''}
                  onChange={(e) => setNewComment(prev => ({
                    ...prev,
                    [activity.id]: e.target.value
                  }))}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleComment(activity.id);
                    }
                  }}
                />
                <button
                  onClick={() => handleComment(activity.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Enviar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {!compact && (
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            {heroId ? 'Atividades do Herói' : 'Feed de Atividades'}
          </h2>
          <p className="text-gray-400">
            Acompanhe as conquistas e aventuras épicas!
          </p>
        </div>
      )}

      {showFilters && !compact && <FilterPanel />}

      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhuma atividade encontrada
            </h3>
            <p className="text-gray-400">
              {heroId 
                ? 'Este herói ainda não possui atividades registradas.'
                : 'Comece sua jornada épica para ver atividades aqui!'
              }
            </p>
          </div>
        ) : (
          activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))
        )}
      </div>

      {activities.length >= maxItems && (
        <div className="text-center mt-6">
          <button
            onClick={() => loadActivities()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Carregar mais atividades
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;