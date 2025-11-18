import React, { useEffect, useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { listFriends, addFriend, removeFriend } from '../services/userService';
import { tokens } from '../styles/designTokens';

const FriendsPage: React.FC = () => {
  const { getSelectedHero, heroes } = useHeroStore();
  const me = getSelectedHero();
  const userId = useMemo(() => me?.id || '', [me?.id]);
  const [friends, setFriends] = useState<string[]>([]);
  const [targetId, setTargetId] = useState('');

  const load = async () => {
    if (!userId) { setFriends([]); return; }
    const list = await listFriends(userId);
    setFriends(list);
  };

  useEffect(() => { load(); }, [userId]);

  const add = async () => {
    if (!userId || !targetId) return;
    const ok = await addFriend(userId, targetId);
    if (ok) load();
    setTargetId('');
  };

  const remove = async (id: string) => {
    if (!userId) return;
    const ok = await removeFriend(userId, id);
    if (ok) load();
  };

  if (!userId) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-2">🤝</div>
        <div className="text-slate-400">Selecione um herói para gerenciar amigos</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className={`bg-gray-800 p-6 rounded border border-slate-700`}>
        <div className="text-2xl font-bold text-white mb-4">Amigos</div>
        <div className="flex gap-2 mb-4">
          <select value={targetId} onChange={e=>setTargetId(e.target.value)} className="flex-1 p-2 border rounded bg-slate-900 border-slate-600 text-slate-200">
            <option value="">Selecionar herói…</option>
            {heroes.filter(h=>h.id!==userId).map(h=> (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <button onClick={add} disabled={!targetId} className={`${tokens.tabActive}`}>Adicionar</button>
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-300 mb-2">Seus amigos</div>
          <ul className="space-y-2">
            {friends.map(fid => (
              <li key={fid} className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700">
                <span className="text-slate-100">{heroes.find(h=>h.id===fid)?.name || fid.slice(0,6)}</span>
                <button onClick={()=>remove(fid)} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Remover</button>
              </li>
            ))}
            {friends.length===0 && (
              <li className="text-xs text-slate-400">Você ainda não tem amigos adicionados.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;