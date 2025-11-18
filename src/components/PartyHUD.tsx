import React, { useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import PartyInviteModal from './PartyInviteModal';
import { tokens } from '../styles/designTokens';

const PartyHUD: React.FC = () => {
  const { heroes, getSelectedHero, getHeroParty } = useHeroStore();
  const hero = getSelectedHero();
  const party = hero ? getHeroParty(hero.id) : undefined;
  const [showInvites, setShowInvites] = useState(false);
  if (!hero) return null;
  const memberNames = party ? party.members.map(id => {
    const h = heroes.find(x => x.id === id);
    return { id, name: h?.name || 'Aventureiro', isNPC: h?.origin === 'npc' };
  }) : [];
  const invites = party ? (party.invites || []) : [];
  return (
    <div className={`${tokens.cardBase} border border-gray-700`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">👥 Party</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowInvites(true)} className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">Convites ({invites.length})</button>
        </div>
      </div>
      {party ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {memberNames.map(m => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded border bg-gray-900 border-gray-700">
              <div className="font-medium flex items-center gap-2">{m.name}{m.isNPC && <span className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded">NPC</span>}</div>
              <div className="text-xs text-gray-400">ID: {m.id.slice(0,6)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-300">Você não está em nenhuma party.</div>
      )}
      <PartyInviteModal open={showInvites} onClose={() => setShowInvites(false)} />
    </div>
  );
};

export default PartyHUD;