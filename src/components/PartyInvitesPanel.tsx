import React from 'react'
import { useHeroStore } from '../store/heroStore'

const PartyInvitesPanel: React.FC = () => {
  const { getSelectedHero, heroes } = useHeroStore()
  const selectedHero = getSelectedHero()
  const parties = useHeroStore(s => (Array.isArray((s as any).parties) ? (s as any).parties : [])) as any[]
  const acceptInvite = useHeroStore(s => s.acceptPartyInvite)
  const declineInvite = useHeroStore(s => (s as any).declinePartyInvite)

  if (!selectedHero) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <div className="text-5xl mb-3">👥</div>
        <div className="text-gray-300">Selecione um herói para gerenciar convites de party.</div>
      </div>
    )
  }

  const myInvites = parties.filter(p => Array.isArray(p.invites) && p.invites.includes(selectedHero.id))

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-amber-300 mb-4">Convites de Party</h1>
      {myInvites.length === 0 ? (
        <div className="text-gray-400">Nenhum convite pendente.</div>
      ) : (
        <div className="space-y-3">
          {myInvites.map(p => {
            const leader = heroes.find(h => h.id === p.leaderId)
            const leaderName = leader?.name || p.leaderId.slice(-4)
            return (
              <div key={p.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded p-3">
                <div>
                  <div className="text-white font-semibold">{p.name}</div>
                  <div className="text-xs text-gray-300">Líder: {leaderName} • Membros: {Array.isArray(p.members) ? p.members.length : 0}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => acceptInvite(selectedHero.id, p.id)} className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm">Aceitar</button>
                  <button onClick={() => declineInvite(selectedHero.id, p.id)} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm">Recusar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PartyInvitesPanel