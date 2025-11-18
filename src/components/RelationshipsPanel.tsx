import React, { useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { tokens } from '../styles/designTokens';
import { computeTier } from '../utils/relationshipSystem';

const RelationshipsPanel: React.FC = () => {
  const { heroes, getSelectedHero } = useHeroStore();
  const hero = getSelectedHero();
  const [filter, setFilter] = useState<'todos' | 'conhecido' | 'amigo' | 'melhor_amigo'>('todos');
  if (!hero) return null;
  const statusById = hero.npcMemory?.friendStatusByHeroId || {};
  const list = useMemo(() => {
    const relMap = hero.socialRelations || {};
    const npcIds = heroes.filter(h => h.origin === 'npc').map(h => h.id);
    const ids = Array.from(new Set([ ...npcIds, ...Object.keys(statusById), ...Object.keys(relMap) ]));
    return ids
      .map(id => {
        const npc = heroes.find(h => h.id === id);
        const rel = relMap[id] || (npc?.socialRelations || {})[hero.id] || 0;
        const status = statusById[id] ?? computeTier(rel);
        return { id, status, rel, name: npc?.name || 'NPC', npc };
      })
      .filter(r => filter === 'todos' || r.status === filter);
  }, [statusById, filter, heroes, hero.id, hero.socialRelations]);

  const friends = hero.friends || [];
  const bestFriends = hero.bestFriends || [];
  return (
    <div className={`${tokens.cardBase} border border-gray-700`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">🤝 Relações</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="px-2 py-1 border rounded text-sm bg-gray-900 text-gray-200 border-gray-700">
          <option value="todos">Todos</option>
          <option value="conhecido">Conhecidos</option>
          <option value="amigo">Amigos</option>
          <option value="melhor_amigo">Melhores Amigos</option>
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map(r => (
          <div key={r.id} className="p-3 rounded border bg-gray-900 border-gray-700">
            <div className="font-semibold flex items-center gap-2">{r.name} <span className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded">NPC</span></div>
            <div className="text-sm text-gray-300">Status: {r.status.replace('_',' ')} • Relação: {r.rel}</div>
            <div className="text-xs text-gray-400">Contato recente: {hero.npcMemory?.lastContactByHeroId?.[r.id] ? new Date(hero.npcMemory!.lastContactByHeroId![r.id]).toLocaleString() : '—'}</div>
            <div className="mt-2 text-xs text-gray-400">Amigo: {friends.includes(r.id) ? 'Sim' : 'Não'} • Melhor amigo: {bestFriends.includes(r.id) ? 'Sim' : 'Não'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelationshipsPanel;