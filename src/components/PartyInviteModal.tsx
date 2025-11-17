import React from 'react';
import { useHeroStore } from '../store/heroStore';

const PartyInviteModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { getSelectedHero, parties, acceptPartyInvite, declinePartyInvite } = useHeroStore() as any;
  const hero = getSelectedHero();
  if (!open || !hero) return null;
  const invites = parties.filter((p: any) => (p.invites || []).includes(hero.id));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-lg border border-gray-300 p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">👥 Convites de Party</h2>
          <button onClick={onClose} className="text-gray-600">✖</button>
        </div>
        {invites.length === 0 ? (
          <div className="text-gray-600">Sem convites no momento.</div>
        ) : (
          <div className="space-y-2">
            {invites.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded border bg-gray-50">
                <div>
                  <div className="font-medium text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-600">ID: {p.id.slice(0,6)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { acceptPartyInvite(hero.id, p.id); onClose(); }} className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">Aceitar</button>
                  <button onClick={() => { declinePartyInvite(hero.id, p.id); }} className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Recusar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyInviteModal;