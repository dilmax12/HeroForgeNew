import React, { useState } from 'react';
import { Hero, Party } from '../types/hero';
import { useHeroStore } from '../store/heroStore';
import { notificationBus } from './NotificationSystem';

interface PartySystemProps {
  hero: Hero;
}

const PartySystem: React.FC<PartySystemProps> = ({ hero }) => {
  const {
    heroes,
    parties,
    createParty,
    joinParty,
    leaveParty,
    getHeroParty,
    inviteHeroToParty,
    acceptPartyInvite,
    transferPartyLeadership,
    togglePartySharedLoot,
    togglePartySharedXP,
    removeMemberFromParty,
  } = useHeroStore();

  const [activeTab, setActiveTab] = useState<'browse' | 'my-party' | 'create'>('browse');
  const [newPartyName, setNewPartyName] = useState('');
  const [inviteHeroId, setInviteHeroId] = useState('');
  const [newLeaderId, setNewLeaderId] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | { type: 'leave' | 'remove'; targetId?: string }>(null);

  const currentParty: Party | undefined = getHeroParty(hero.id);
  const myInvites = parties.filter(p => (p.invites || []).includes(hero.id));

  const handleCreateParty = () => {
    const name = newPartyName.trim();
    if (!name) return;
    const party = createParty(hero.id, name);
    if (party) {
      setActiveTab('my-party');
      setNewPartyName('');
      notificationBus.emit({
        type: 'achievement',
        title: 'Party criada',
        message: `A party ${party.name} foi criada com sucesso.`,
        icon: '🎉',
        duration: 3500
      });
    } else {
      notificationBus.emit({
        type: 'stamina',
        title: 'Falha ao criar party',
        message: 'Não foi possível criar a party. Tente novamente.',
        icon: '⚠️',
        duration: 3500
      });
    }
  };

  const handleJoinParty = (partyId: string) => {
    if (joinParty(hero.id, partyId)) {
      setActiveTab('my-party');
    }
  };

  const handleLeaveParty = () => {
    if (currentParty) {
      setConfirmAction({ type: 'leave' });
    }
  };

  const confirmLeaveParty = () => {
    if (!currentParty) return;
    const ok = leaveParty(hero.id);
    notificationBus.emit({
      type: ok ? 'quest' : 'stamina',
      title: ok ? 'Você saiu da party' : 'Erro ao sair da party',
      message: ok ? `Você deixou ${currentParty.name}.` : 'Ação não concluída. Tente novamente.',
      icon: ok ? '🚪' : '⚠️',
      duration: 3000
    });
    setActiveTab('browse');
    setConfirmAction(null);
  };

  const handleInvite = () => {
    if (currentParty && inviteHeroId) {
      const ok = inviteHeroToParty(currentParty.id, hero.id, inviteHeroId);
      notificationBus.emit({
        type: ok ? 'quest' : 'stamina',
        title: ok ? 'Convite enviado' : 'Convite não enviado',
        message: ok
          ? `Convite enviado para ${getHeroName(inviteHeroId)}.`
          : 'Verifique permissões ou duplicidade de convite.',
        icon: ok ? '📨' : '⚠️',
        duration: 3500
      });
      setInviteHeroId('');
    }
  };

  const handleAcceptInvite = (partyId: string) => {
    const ok = acceptPartyInvite(hero.id, partyId);
    notificationBus.emit({
      type: ok ? 'achievement' : 'stamina',
      title: ok ? 'Convite aceito' : 'Erro ao aceitar convite',
      message: ok ? 'Você agora faz parte da party.' : 'Convite inválido ou expirado.',
      icon: ok ? '✅' : '⚠️',
      duration: 3500
    });
    setActiveTab('my-party');
  };

  const handleTransferLeadership = () => {
    if (currentParty && newLeaderId) {
      const ok = transferPartyLeadership(currentParty.id, hero.id, newLeaderId);
      notificationBus.emit({
        type: ok ? 'achievement' : 'stamina',
        title: ok ? 'Liderança transferida' : 'Transferência falhou',
        message: ok ? `Novo líder: ${getHeroName(newLeaderId)}.` : 'Apenas o líder pode transferir para um membro válido.',
        icon: ok ? '👑' : '⚠️',
        duration: 3500
      });
      setNewLeaderId('');
    }
  };

  const getHeroName = (id: string) => heroes.find(h => h.id === id)?.name || 'Herói';

  return (
    <div className="max-w-6xl mx-auto p-6">
      {myInvites.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded mb-6">
          <div className="font-semibold text-indigo-700 mb-2">Convites para você</div>
          <div className="space-y-2">
            {myInvites.map(p => (
              <div key={p.id} className="flex items-center justify-between">
                <span>Convite da party <span className="font-medium">{p.name}</span></span>
                <button onClick={() => handleAcceptInvite(p.id)} className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">Aceitar</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">👥 Sistema de Party</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-4 py-2 rounded ${activeTab === 'browse' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'} hover:opacity-90`}
          >Explorar</button>
          <button
            onClick={() => setActiveTab('my-party')}
            className={`px-4 py-2 rounded ${activeTab === 'my-party' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'} hover:opacity-90`}
          >Minha Party</button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded ${activeTab === 'create' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'} hover:opacity-90`}
          >Criar</button>
        </div>
      </div>

      {activeTab === 'browse' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Parties Disponíveis</h2>
          {parties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parties.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">Criada em {new Date(p.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-2xl">👥</div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Membros:</span>
                      <span className="font-medium">{p.members.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">XP Compartilhado:</span>
                      <span className="font-medium">{p.sharedXP ? 'Sim' : 'Não'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Loot Compartilhado:</span>
                      <span className="font-medium">{p.sharedLoot ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>
                  {currentParty?.id === p.id ? (
                    <button className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded cursor-not-allowed">Já na party</button>
                  ) : (
                    <button
                      onClick={() => handleJoinParty(p.id)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                    >Entrar na Party</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-medium mb-2">Nenhuma party encontrada</h3>
              <p>Crie a primeira party e comece a aventura em grupo!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'my-party' && (
        <div className="space-y-6">
          {currentParty ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 text-gray-800">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{currentParty.name}</h2>
                  <p className="text-gray-600 mt-1">Membros trabalhando juntos para completar missões.</p>
                </div>
                <button
                  onClick={handleLeaveParty}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >Sair da Party</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Líder</div>
                  <div className="text-lg font-semibold">{getHeroName(currentParty.leaderId || '')}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Loot Compartilhado</div>
                  <div className="text-lg font-semibold">{currentParty.sharedLoot ? 'Sim' : 'Não'}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">XP Compartilhado</div>
                  <div className="text-lg font-semibold">{currentParty.sharedXP ? 'Sim' : 'Não'}</div>
                </div>
              </div>

              {currentParty.leaderId === hero.id && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 p-4 rounded border">
                    <div className="font-semibold mb-2">Convidar Herói</div>
                    <div className="flex space-x-2">
                      <select value={inviteHeroId} onChange={(e) => setInviteHeroId(e.target.value)} className="flex-1 p-2 border rounded">
                        <option value="">Selecionar herói...</option>
                        {heroes.filter(h => !currentParty.members.includes(h.id)).map(h => (
                          <option key={h.id} value={h.id}>
                            {h.name}{(currentParty.invites || []).includes(h.id) ? ' (convidado)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleInvite}
                        disabled={!inviteHeroId || (currentParty.invites || []).includes(inviteHeroId) || currentParty.members.includes(inviteHeroId)}
                        className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >Convidar</button>
                      {inviteHeroId && (currentParty.invites || []).includes(inviteHeroId) && (
                        <span className="text-xs text-gray-500 self-center">Convite já enviado</span>
                      )}
                    </div>
                    {(currentParty.invites || []).length > 0 && (
                      <div className="text-sm text-gray-600 mt-2">Pendentes: {(currentParty.invites || []).map(id => getHeroName(id)).join(', ')}</div>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded border">
                    <div className="font-semibold mb-2">Transferir Liderança</div>
                    <div className="flex space-x-2">
                      <select value={newLeaderId} onChange={(e) => setNewLeaderId(e.target.value)} className="flex-1 p-2 border rounded">
                        <option value="">Selecionar membro...</option>
                        {currentParty.members.filter(id => id !== hero.id).map(id => (
                          <option key={id} value={id}>{getHeroName(id)}</option>
                        ))}
                      </select>
                      <button onClick={handleTransferLeadership} className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700">Transferir</button>
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button onClick={() => {
                        const ok = togglePartySharedLoot(currentParty.id, hero.id);
                        notificationBus.emit({
                          type: ok ? 'item' : 'stamina',
                          title: ok ? 'Loot Compartilhado' : 'Ação não permitida',
                          message: ok ? (currentParty.sharedLoot ? 'Desativado' : 'Ativado') : 'Apenas o líder pode alterar.',
                          icon: ok ? '🪙' : '⚠️',
                          duration: 3000
                        });
                      }} className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">Alternar Loot</button>
                      <button onClick={() => {
                        const ok = togglePartySharedXP(currentParty.id, hero.id);
                        notificationBus.emit({
                          type: ok ? 'xp' : 'stamina',
                          title: ok ? 'XP Compartilhado' : 'Ação não permitida',
                          message: ok ? (currentParty.sharedXP ? 'Desativado' : 'Ativado') : 'Apenas o líder pode alterar.',
                          icon: ok ? '⭐' : '⚠️',
                          duration: 3000
                        });
                      }} className="px-3 py-2 rounded bg-gray-800 text-white hover:bg-gray-700">Alternar XP</button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">Membros</h3>
                <ul className="space-y-2">
                  {currentParty.members.map(id => (
                    <li key={id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <span>{getHeroName(id)}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">ID: {id.slice(0, 6)}</span>
                        {currentParty.leaderId === hero.id && id !== hero.id && (
                          <button
                            onClick={() => setConfirmAction({ type: 'remove', targetId: id })}
                            className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-sm"
                          >Remover</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-medium mb-2">Você não está em nenhuma party</h3>
              <p className="mb-6">Explore parties existentes ou crie a sua própria!</p>
              <div className="space-x-4">
                <button onClick={() => setActiveTab('browse')} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">Explorar Parties</button>
                <button onClick={() => setActiveTab('create')} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors">Criar Party</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">➕ Criar Nova Party</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome da Party</label>
                <input
                  type="text"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Ex: Devastadores do Norte"
                  className="mt-1 w-full p-2 border rounded"
                />
              </div>
              <button
                onClick={handleCreateParty}
                disabled={!newPartyName.trim()}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >Criar Party</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmAction(null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Confirmação</h2>
              <button onClick={() => setConfirmAction(null)} className="text-gray-300 hover:text-white">✖</button>
            </div>
            <div className="mt-3 text-sm text-gray-200">
              {confirmAction.type === 'leave' && (
                <div>Tem certeza que deseja sair da party?</div>
              )}
              {confirmAction.type === 'remove' && (
                <div>
                  Remover {getHeroName(confirmAction.targetId || '')} da party? Esta ação não pode ser desfeita.
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (confirmAction.type === 'leave') {
                    confirmLeaveParty();
                  } else if (confirmAction.type === 'remove' && confirmAction.targetId && currentParty) {
                    const ok = removeMemberFromParty(currentParty.id, hero.id, confirmAction.targetId);
                    notificationBus.emit({
                      type: ok ? 'quest' : 'stamina',
                      title: ok ? 'Membro removido' : 'Remoção não permitida',
                      message: ok ? `${getHeroName(confirmAction.targetId)} foi removido da party.` : 'Apenas o líder pode remover membros válidos.',
                      icon: ok ? '🗡️' : '⚠️',
                      duration: 3000
                    });
                    setConfirmAction(null);
                  }
                }}
                className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >Confirmar</button>
              <button
                onClick={() => setConfirmAction(null)}
                className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700"
              >Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartySystem;
