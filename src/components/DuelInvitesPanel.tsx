import React from 'react';
import { useHeroStore } from '../store/heroStore';
import { tokens } from '../styles/designTokens';

const DuelInvitesPanel: React.FC = () => {
  const { getSelectedHero, getDuelInvitesForHero, acceptDuelInvite, declineDuelInvite } = useHeroStore();
  const hero = getSelectedHero();
  if (!hero) return null;
  const invites = getDuelInvitesForHero(hero.id);
  return (
    <div className={`${tokens.cardBase} border border-gray-700`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">⚔️ Convites de Duelo</h2>
        <div className="text-sm text-gray-400">{invites.length} convite(s)</div>
      </div>
      {invites.length === 0 ? (
        <div className="text-gray-300">Sem convites no momento.</div>
      ) : (
        <div className="space-y-3">
          {invites.map(inv => (
            <div key={`${inv.npcId}-${inv.expiresAt}`} className="p-3 rounded border bg-gray-900 border-gray-700 flex items-center justify-between">
              <div>
                <div className="font-semibold">Tipo: {inv.type}</div>
                <div className="text-sm text-gray-300">Diferença de nível: {inv.levelDiff} • Expira: {new Date(inv.expiresAt).toLocaleTimeString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => acceptDuelInvite(hero.id, inv.npcId)} className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">Aceitar</button>
                <button onClick={() => declineDuelInvite(hero.id, inv.npcId)} className="px-3 py-1 rounded bg-gray-600 text-white hover:bg-gray-700">Recusar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DuelInvitesPanel;