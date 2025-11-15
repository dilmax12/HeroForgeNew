import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { listEventsHistory } from '../services/userService';
import { useNavigate } from 'react-router-dom';

const UserEventsHistoryPage: React.FC = () => {
  const { getSelectedHero } = useHeroStore();
  const me = getSelectedHero();
  const userId = useMemo(() => me?.id || '', [me?.id]);
  const [events, setEvents] = useState<any[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    if (!userId) { setEvents([]); return; }
    const list = await listEventsHistory(userId);
    setEvents(list);
  };

  useEffect(() => { load(); }, [userId]);

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-2">🗂️</div>
        <div className="text-gray-600">Selecione um herói para ver seu histórico</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Histórico de Participação</h1>
        <button onClick={load} className="px-3 py-2 rounded bg-gray-200">Atualizar</button>
      </div>
      {events.length>0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(ev => (
            <div key={ev.id} className="bg-white p-4 rounded border hover:shadow">
              <div className="text-lg font-semibold text-gray-800">{ev.name}</div>
              <div className="text-xs text-gray-600">{new Date(ev.dateTime).toLocaleString()}</div>
              {ev.locationText && <div className="text-xs text-gray-600">{ev.locationText}</div>}
              <div className="mt-3">
                <button onClick={()=>navigate(`/event/${ev.id}`)} className="w-full px-3 py-2 rounded bg-blue-600 text-white">Abrir</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-2">🗂️</div>
          <div>Nenhum evento no histórico</div>
        </div>
      )}
    </div>
  );
};

export default UserEventsHistoryPage;