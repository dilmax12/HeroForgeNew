import React, { useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';

const RelationshipsPanel: React.FC = () => {
  const { heroes, getSelectedHero } = useHeroStore();
  const hero = getSelectedHero();
  const [filter, setFilter] = useState<'todos' | 'conhecido' | 'amigo' | 'melhor_amigo'>('todos');
  if (!hero) return null;
  const statusById = hero.npcMemory?.friendStatusByHeroId || {};
  const friends = hero.friends || [];
  const bestFriends = hero.bestFriends || [];
  const list = useMemo(() => {
    const ids = Object.keys(statusById);
    return ids
      .filter(id => filter === 'todos' || statusById[id] === filter)
      .map(id => ({ id, status: statusById[id], rel: (heroes.find(h => h.id === id)?.socialRelations || {})[hero.id] || 0, name: heroes.find(h => h.id === id)?.name || 'NPC' }));
  }, [statusById, filter, heroes, hero.id]);
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">🤝 Relações</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="px-2 py-1 border rounded text-sm">
          <option value="todos">Todos</option>
          <option value="conhecido">Conhecidos</option>
          <option value="amigo">Amigos</option>
          <option value="melhor_amigo">Melhores Amigos</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.length === 0 ? (
          <div className="text-gray-600">Nenhuma relação encontrada para este filtro.</div>
        ) : list.map(r => (
          <div key={r.id} className="p-3 rounded border bg-gray-50">
            <div className="font-semibold flex items-center gap-2">{r.name} <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">NPC</span></div>
            <div className="text-sm text-gray-600">Status: {r.status.replace('_',' ')} • Relação: {r.rel}</div>
            <div className="text-xs text-gray-500">Contato recente: {hero.npcMemory?.lastContactByHeroId?.[r.id] ? new Date(hero.npcMemory!.lastContactByHeroId![r.id]).toLocaleString() : '—'}</div>
            <div className="mt-2 text-xs text-gray-500">Melhor amigo: {bestFriends.includes(r.id) ? 'Sim' : 'Não'} • Amigo: {friends.includes(r.id) ? 'Sim' : 'Não'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelationshipsPanel;