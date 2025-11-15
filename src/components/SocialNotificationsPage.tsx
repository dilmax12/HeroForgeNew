import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { listNotifications } from '../services/userService';
import { useNavigate } from 'react-router-dom';

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
        <div className="text-gray-600">Selecione um herói para ver notificações</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Notificações</h1>
        <button onClick={load} className="px-3 py-2 rounded bg-gray-200">Atualizar</button>
      </div>
      {items.length>0 ? (
        <div className="space-y-3">
          {items.map(n => (
            <div key={n.id} className="bg-white p-4 rounded border">
              <div className="text-sm text-gray-700">Evento recomendado</div>
              <div className="text-lg font-semibold text-gray-800">{n.event?.name}</div>
              <div className="text-xs text-gray-600">{new Date(n.event?.dateTime).toLocaleString()}</div>
              <div className="mt-2">
                <button onClick={()=>navigate(`/event/${n.event?.id}`)} className="px-3 py-2 rounded bg-blue-600 text-white">Ver evento</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-2">🔔</div>
          <div>Sem notificações no momento</div>
        </div>
      )}
    </div>
  );
};

export default SocialNotificationsPage;