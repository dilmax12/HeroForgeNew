import React, { useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { tokens } from '../styles/designTokens';

const PartyContractPanel: React.FC = () => {
  const { getSelectedHero, parties, acceptPartyInvite, declinePartyInvite, availableQuests, acceptQuest } = useHeroStore() as any;
  const hero = getSelectedHero();
  if (!hero) return null;
  const contracts = parties
    .filter((p: any) => (p.invites || []).includes(hero.id))
    .map((p: any) => ({
      party: p,
      terms: (p.inviteTerms || {})[hero.id] || { duration: 'one_mission', rewardShare: 0, leaderPref: 'none' }
    }));

  if (contracts.length === 0) return null;

  return (
    <div className={`${tokens.cardBase} border border-gray-700`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">📜 Contratos de Party</h2>
        <div className="text-sm text-gray-400">Convites pendentes: {contracts.length}</div>
      </div>
      <div className="space-y-3">
        {contracts.map(({ party, terms }: any) => (
          <div key={party.id} className="p-3 rounded border bg-gray-900 border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{party.name}</div>
                <div className="text-xs text-gray-400">ID: {party.id.slice(0,6)}</div>
              </div>
              <div className="text-xs text-gray-400">Líder: {party.leaderId.slice(0,6)}</div>
            </div>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="p-2 rounded bg-gray-900 border border-gray-700">
                <div className="text-xs text-gray-400">Duração</div>
                <div className="font-medium flex items-center gap-2">
                  <span>{terms.duration === 'one_mission' ? '🕒' : '📅'}</span>
                  <span>{terms.duration === 'one_mission' ? '1 Missão' : `${terms.days || 1} dia(s)`}</span>
                </div>
              </div>
              <div className="p-2 rounded bg-gray-900 border border-gray-700">
                <div className="text-xs text-gray-400">Recompensa</div>
                <div className="font-medium flex items-center gap-2"><span>💰</span><span>{terms.rewardShare || 0}%</span></div>
              </div>
              <div className="p-2 rounded bg-gray-900 border border-gray-700">
                <div className="text-xs text-gray-400">Liderança</div>
                <div className="font-medium flex items-center gap-2">
                  <span>👑</span>
                  <span>{terms.leaderPref === 'inviter' ? 'Você' : terms.leaderPref === 'invitee' ? 'NPC' : 'Indiferente'}</span>
                </div>
              </div>
              <div className="p-2 rounded bg-gray-900 border border-gray-700">
                <div className="text-xs text-gray-400">Loot/XP</div>
                <div className="font-medium flex items-center gap-2"><span>🧭</span><span>{party.sharedLoot ? 'Loot compartilhado' : 'Loot individual'} • {party.sharedXP ? 'XP compartilhado' : 'XP individual'}</span></div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-gray-300 flex items-center gap-2">
                <input type="checkbox" id={`agree-${party.id}`} /> Estou de acordo
              </label>
              <button
                onClick={() => {
                  const cb = document.getElementById(`agree-${party.id}`) as HTMLInputElement;
                  if (!cb || !cb.checked) return;
                  const ok = acceptPartyInvite(hero.id, party.id);
                  if (ok) {
                    const targetQuest = (availableQuests || []).find((q: any) => q.isGuildQuest) || (availableQuests || [])[0];
                    if (targetQuest) acceptQuest(hero.id, targetQuest.id);
                  }
                }}
                className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >Aceitar Contrato</button>
              <button onClick={() => declinePartyInvite(hero.id, party.id)} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Recusar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartyContractPanel;