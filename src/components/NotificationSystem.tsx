import React, { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'xp' | 'levelup' | 'gold' | 'item' | 'achievement' | 'quest' | 'stamina';
  title: string;
  message: string;
  value?: number;
  duration?: number;
  icon?: string;
}

interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<{ notification: Notification; onRemove: (id: string) => void }> = ({ 
  notification, 
  onRemove 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, notification.duration || 4000);

    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onRemove]);

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'xp':
        return 'bg-blue-600 border-blue-500';
      case 'levelup':
        return 'bg-purple-600 border-purple-500';
      case 'gold':
        return 'bg-yellow-600 border-yellow-500';
      case 'item':
        return 'bg-green-600 border-green-500';
      case 'achievement':
        return 'bg-amber-600 border-amber-500';
      case 'quest':
        return 'bg-indigo-600 border-indigo-500';
      case 'stamina':
        return 'bg-red-600 border-red-500';
      default:
        return 'bg-gray-600 border-gray-500';
    }
  };

  const getIcon = (type: string, customIcon?: string) => {
    if (customIcon) return customIcon;
    
    switch (type) {
      case 'xp':
        return '⭐';
      case 'levelup':
        return '🎉';
      case 'gold':
        return '🪙';
      case 'item':
        return '📦';
      case 'achievement':
        return '🏆';
      case 'quest':
        return '⚔️';
      case 'stamina':
        return '💤';
      default:
        return '📢';
    }
  };

  return (
    <div className={`${getNotificationStyle(notification.type)} border-l-4 p-4 rounded-r-lg shadow-lg transform transition-all duration-300 animate-slide-in-right mb-2`}>
      <div className="flex items-center">
        <div className="text-2xl mr-3">
          {getIcon(notification.type, notification.icon)}
        </div>
        <div className="flex-1">
          <div className="text-white font-semibold text-sm">
            {notification.title}
            {notification.value && (
              <span className="ml-2 text-lg font-bold">
                +{notification.value}
              </span>
            )}
          </div>
          <div className="text-gray-200 text-xs mt-1">
            {notification.message}
          </div>
        </div>
        <button
          onClick={() => onRemove(notification.id)}
          className="text-white hover:text-gray-300 ml-2 text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed top-20 right-4 z-40 max-w-sm space-y-2">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

// Hook para gerenciar notificações
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Funções de conveniência para tipos específicos
  const notifyXPGain = (amount: number, source: string) => {
    addNotification({
      type: 'xp',
      title: 'XP Ganho!',
      message: `Você ganhou experiência de ${source}`,
      value: amount,
      duration: 3000
    });
  };

  const notifyLevelUp = (newLevel: number) => {
    addNotification({
      type: 'levelup',
      title: 'Level Up!',
      message: `Parabéns! Você alcançou o nível ${newLevel}!`,
      duration: 5000
    });
  };

  const notifyGoldGain = (amount: number, source: string) => {
    addNotification({
      type: 'gold',
      title: 'Ouro Ganho!',
      message: `Você ganhou ouro de ${source}`,
      value: amount,
      duration: 3000
    });
  };

  const notifyItemReceived = (itemName: string) => {
    addNotification({
      type: 'item',
      title: 'Item Recebido!',
      message: `Você recebeu: ${itemName}`,
      duration: 4000
    });
  };

  const notifyAchievement = (achievementName: string) => {
    addNotification({
      type: 'achievement',
      title: 'Conquista Desbloqueada!',
      message: achievementName,
      duration: 5000
    });
  };

  const notifyQuestComplete = (questName: string) => {
    addNotification({
      type: 'quest',
      title: 'Missão Completa!',
      message: `Você completou: ${questName}`,
      duration: 4000
    });
  };

  const notifyStaminaLow = () => {
    addNotification({
      type: 'stamina',
      title: 'Stamina Baixa!',
      message: 'Descanse para recuperar sua energia',
      duration: 3000
    });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    notifyXPGain,
    notifyLevelUp,
    notifyGoldGain,
    notifyItemReceived,
    notifyAchievement,
    notifyQuestComplete,
    notifyStaminaLow
  };
};

export default NotificationSystem;

// Barramento global de notificações para disparo de toasts a partir de qualquer componente
export type NotificationPayload = Omit<Notification, 'id'>;

type NotificationListener = (n: NotificationPayload) => void;

class NotificationBus {
  private listeners: Set<NotificationListener> = new Set();
  private recent: Map<string, number> = new Map();
  private minIntervalMs = 30000;
  private recentByType: Map<string, number[]> = new Map();
  private lastAnyTs: number = 0;
  private globalMinSpacingMs = 6000;
  private maxPerMinuteByType: Record<string, number> = { achievement: 3, quest: 3 };

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(notification: NotificationPayload) {
    const key = `${notification.type}|${notification.title}|${notification.message}`;
    const now = Date.now();
    const last = this.recent.get(key) || 0;
    if (now - last < this.minIntervalMs) return;
    this.recent.set(key, now);
    if (this.recent.size > 200) {
      const threshold = now - this.minIntervalMs * 2;
      this.recent.forEach((ts, k) => { if (ts < threshold) this.recent.delete(k); });
    }
    if (now - this.lastAnyTs < this.globalMinSpacingMs) return;
    const type = notification.type;
    const cap = this.maxPerMinuteByType[type] || 9999;
    const arr = (this.recentByType.get(type) || []).filter(ts => now - ts < 60000);
    if (arr.length >= cap) return;
    arr.push(now);
    this.recentByType.set(type, arr);
    this.lastAnyTs = now;
    this.listeners.forEach((listener) => listener(notification));
  }
}

export const notificationBus = new NotificationBus();
