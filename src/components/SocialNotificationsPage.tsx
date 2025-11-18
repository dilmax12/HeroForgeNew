import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { listNotifications } from '../services/userService';
import { useNavigate } from 'react-router-dom';
import { tokens } from '../styles/designTokens';

const SocialNotificationsPage: React.FC = () => {
  const { getSelectedHero } = useHeroStore();
  const me = getSelectedHero();
  const userId = useMemo(() => me?.id || '', [me?.id]);
  const [items, setItems] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    if (!userId) { setItems([]); return; }
    const list = await listNotifications(userId);
    setItems(list);
  };

  useEffect(() => { load(); }, [userId]);

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-2">🔔</div>
        <div className="text-slate-400">Selecione um herói para ver notificações</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Notificações</h1>
        <button onClick={load} className={`${tokens.tabInactive}`}>Atualizar</button>
      </div>
      {items.length>0 ? (
        <div className="space-y-3">
          {items.map(n => (
            <div key={n.id} className="bg-gray-800 p-4 rounded border border-slate-700">
              <div className="text-sm text-slate-300">Evento recomendado</div>
              <div className="text-lg font-semibold text-white">{n.event?.name}</div>
              <div className="text-xs text-slate-400">{new Date(n.event?.dateTime).toLocaleString()}</div>
              <div className="mt-2">
                <button onClick={()=>navigate(`/event/${n.event?.id}`)} className={`${tokens.tabActive}`}>Ver evento</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400">
          <div className="text-6xl mb-2">🔔</div>
          <div>Sem notificações no momento</div>
        </div>
      )}
    </div>
  );
};

export default SocialNotificationsPage;