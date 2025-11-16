import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Hero, Party } from '../types/hero';
import { useHeroStore } from '../store/heroStore';
import { notificationBus } from './NotificationSystem';
import { listParties, createPartyOnline, joinPartyOnline, leavePartyOnline, startLobbyPolling, ServerParty, setPartyReady, fetchPartyChat, sendPartyChat, startPartyMission, kickMemberOnline, transferLeadershipOnline, PartyMessage, subscribePartyChatStream, subscribePartyChatSupabase, sendPartyChatRealtime } from '../services/partyService';

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

  const [activeTab, setActiveTab] = useState<'browse' | 'my-party' | 'create' | 'lobby'>('browse');
  const [newPartyName, setNewPartyName] = useState('');
  const [inviteHeroId, setInviteHeroId] = useState('');
  const [newLeaderId, setNewLeaderId] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | { type: 'leave' | 'remove'; targetId?: string }>(null);
  const [onlineParties, setOnlineParties] = useState<ServerParty[]>([]);
  const [lobbyPartyName, setLobbyPartyName] = useState('');
  const [isLobbyBusy, setLobbyBusy] = useState(false);
  const [joinedOnlineParty, setJoinedOnlineParty] = useState<ServerParty | null>(null);
  const [lobbyFilter, setLobbyFilter] = useState('');
  const [chatMessages, setChatMessages] = useState<PartyMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const location = useLocation();
  const isMemberOfJoinedLobby = !!(joinedOnlineParty && joinedOnlineParty.members.includes(hero.id));

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

  // Polling do lobby online quando a aba estiver ativa
  useEffect(() => {
    if (activeTab !== 'lobby') return;
    let stop = startLobbyPolling(setOnlineParties, 2500);
    // Atualização imediata
    listParties().then(setOnlineParties).catch(() => {});
    return () => { stop(); };
  }, [activeTab]);

  // Mantém o painel do lobby sincronizado com a lista online
  useEffect(() => {
    if (!joinedOnlineParty) return;
    const updated = onlineParties.find(p => p.id === joinedOnlineParty.id);
    if (updated) {
      setJoinedOnlineParty(updated);
    } else {
      // Lobby desapareceu (servidor reiniciado ou lobby encerrado)
      setJoinedOnlineParty(null);
      setChatMessages([]);
      notificationBus.emit({ type: 'stamina', title: 'Lobby indisponível', message: 'O lobby foi encerrado ou expirou. Reentre na lista.', icon: '⚠️', duration: 3000 });
    }
  }, [onlineParties, joinedOnlineParty]);

  useEffect(() => {
    if (!joinedOnlineParty || activeTab !== 'lobby') return;
    let useSupabase = false;
    try {
      const mod = require('../lib/supabaseClient') as any;
      useSupabase = !!mod.supabaseConfigured;
    } catch {}
    if (useSupabase) {
      const unsub = subscribePartyChatSupabase(
        joinedOnlineParty.id,
        (messages) => setChatMessages(messages),
        (message) => setChatMessages(prev => [...prev.slice(-49), message])
      );
      return () => { unsub(); };
    } else {
      const unsub = subscribePartyChatStream(
        joinedOnlineParty.id,
        (messages) => setChatMessages(messages),
        (message) => setChatMessages(prev => [...prev.slice(-49), message])
      );
      return () => { unsub(); };
    }
  }, [joinedOnlineParty, activeTab]);

  // Deep-link: ?lobby=ID aplica filtro automaticamente
  useEffect(() => {
    if (activeTab !== 'lobby') return;
    const params = new URLSearchParams(location.search);
    const q = params.get('lobby');
    if (q) setLobbyFilter(q);
  }, [location.search, activeTab]);

  const handleCreatePartyOnline = async () => {
    const name = lobbyPartyName.trim();
    if (!name) return;
    try {
      setLobbyBusy(true);
      await createPartyOnline(name, hero.id);
      setLobbyPartyName('');
      notificationBus.emit({ type: 'achievement', title: 'Lobby criado', message: 'Party online criada com sucesso.', icon: '🌐', duration: 3000 });
      const list = await listParties();
      setOnlineParties(list);
    } catch (err) {
      notificationBus.emit({ type: 'stamina', title: 'Falha ao criar lobby', message: (err as Error)?.message || 'Erro desconhecido', icon: '⚠️', duration: 3500 });
    } finally {
      setLobbyBusy(false);
    }
  };

  const handleJoinPartyOnline = async (partyId: string) => {
    try {
      setLobbyBusy(true);
      const party = await joinPartyOnline(partyId, hero.id);
      setJoinedOnlineParty(party);
      notificationBus.emit({ type: 'quest', title: 'Entrou no lobby', message: 'Você entrou na party online.', icon: '✅', duration: 3000 });
      const list = await listParties();
      setOnlineParties(list);
      const msgs = await fetchPartyChat(party.id);
      setChatMessages(msgs);
    } catch (err) {
      notificationBus.emit({ type: 'stamina', title: 'Falha ao entrar', message: (err as Error)?.message || 'Erro desconhecido', icon: '⚠️', duration: 3500 });
    } finally {
      setLobbyBusy(false);
    }
  };

  const handleLeavePartyOnline = async () => {
    if (!joinedOnlineParty) return;
    try {
      setLobbyBusy(true);
      await leavePartyOnline(joinedOnlineParty.id, hero.id);
      setJoinedOnlineParty(null);
      setChatMessages([]);
      notificationBus.emit({ type: 'quest', title: 'Saiu do lobby', message: 'Você saiu da party online.', icon: '🚪', duration: 3000 });
      const list = await listParties();
      setOnlineParties(list);
    } catch (err) {
      notificationBus.emit({ type: 'stamina', title: 'Falha ao sair', message: (err as Error)?.message || 'Erro desconhecido', icon: '⚠️', duration: 3500 });
    } finally {
      setLobbyBusy(false);
    }
  };

  const toggleReady = async () => {
    if (!joinedOnlineParty) return;
    if (!isMemberOfJoinedLobby) {
      notificationBus.emit({ type: 'stamina', title: 'Herói não está no lobby', message: 'Entre no lobby com este herói para alterar pronto.', icon: '⚠️', duration: 3000 });
      return;
    }
    const isReady = (joinedOnlineParty.readyMembers || []).includes(hero.id);
    try {
      const updated = await setPartyReady(joinedOnlineParty.id, hero.id, !isReady);
      setJoinedOnlineParty(updated);
      const msg = !isReady ? 'Você está pronto.' : 'Você não está mais pronto.';
      notificationBus.emit({ type: 'quest', title: 'Status atualizado', message: msg, icon: '🟢', duration: 2500 });
    } catch (err) {
      const msg = (err as Error)?.message || 'Erro';
      if (msg.includes('404')) {
        // Re-sincroniza lista e limpa estado
        setJoinedOnlineParty(null);
        setChatMessages([]);
        listParties().then(setOnlineParties).catch(() => {});
        notificationBus.emit({ type: 'stamina', title: 'Lobby não encontrado', message: 'Atualize e reentre no lobby.', icon: '⚠️', duration: 3000 });
      } else {
        notificationBus.emit({ type: 'stamina', title: 'Falha no pronto', message: msg, icon: '⚠️', duration: 3000 });
      }
    }
  };

  const handleStartMission = async () => {
    if (!joinedOnlineParty) return;
    if (!isMemberOfJoinedLobby) {
      notificationBus.emit({ type: 'stamina', title: 'Herói não está no lobby', message: 'Entre no lobby com este herói para iniciar missão.', icon: '⚠️', duration: 3000 });
      return;
    }
    try {
      setLobbyBusy(true);
      const ok = await startPartyMission(joinedOnlineParty.id, hero.id);
      if (!ok) {
        notificationBus.emit({ type: 'stamina', title: 'Aguardando membros', message: 'Nem todos estão prontos.', icon: '⏳', duration: 3000 });
        return;
      }
      notificationBus.emit({ type: 'achievement', title: 'Missão iniciada', message: 'Missão compartilhada iniciada pelo líder.', icon: '🚀', duration: 3500 });
    } catch (err) {
      const msg = (err as Error)?.message || 'Erro';
      if (msg.includes('404')) {
        setJoinedOnlineParty(null);
        setChatMessages([]);
        listParties().then(setOnlineParties).catch(() => {});
        notificationBus.emit({ type: 'stamina', title: 'Lobby não encontrado', message: 'Atualize e reentre no lobby.', icon: '⚠️', duration: 3000 });
      } else {
        notificationBus.emit({ type: 'stamina', title: 'Falha ao iniciar', message: msg, icon: '⚠️', duration: 3000 });
      }
    } finally {
      setLobbyBusy(false);
    }
  };

  const handleKickMember = async (targetId: string) => {
    if (!joinedOnlineParty) return;
    if (!isMemberOfJoinedLobby) {
      notificationBus.emit({ type: 'stamina', title: 'Herói não está no lobby', message: 'Entre no lobby com este herói para gerenciar membros.', icon: '⚠️', duration: 3000 });
      return;
    }
    try {
      setLobbyBusy(true);
      const updated = await kickMemberOnline(joinedOnlineParty.id, hero.id, targetId);
      setJoinedOnlineParty(updated);
      notificationBus.emit({ type: 'quest', title: 'Membro removido', message: 'O membro foi removido do lobby.', icon: '🛑', duration: 3000 });
    } catch (err) {
      const msg = (err as Error)?.message || 'Erro';
      if (msg.includes('404')) {
        setJoinedOnlineParty(null);
        setChatMessages([]);
        listParties().then(setOnlineParties).catch(() => {});
        notificationBus.emit({ type: 'stamina', title: 'Lobby não encontrado', message: 'Atualize e reentre no lobby.', icon: '⚠️', duration: 3000 });
      } else {
        notificationBus.emit({ type: 'stamina', title: 'Falha ao remover', message: msg, icon: '⚠️', duration: 3000 });
      }
    } finally {
      setLobbyBusy(false);
    }
  };

  const handleTransferLeadershipOnline = async () => {
    if (!joinedOnlineParty || !newLeaderId) return;
    if (!isMemberOfJoinedLobby) {
      notificationBus.emit({ type: 'stamina', title: 'Herói não está no lobby', message: 'Entre no lobby com este herói para transferir liderança.', icon: '⚠️', duration: 3000 });
      return;
    }
    try {
      setLobbyBusy(true);
      const updated = await transferLeadershipOnline(joinedOnlineParty.id, hero.id, newLeaderId);
      setJoinedOnlineParty(updated);
      notificationBus.emit({ type: 'achievement', title: 'Liderança transferida', message: 'Novo líder definido no lobby.', icon: '👑', duration: 3000 });
      setNewLeaderId('');
    } catch (err) {
      const msg = (err as Error)?.message || 'Erro';
      if (msg.includes('404')) {
        setJoinedOnlineParty(null);
        setChatMessages([]);
        listParties().then(setOnlineParties).catch(() => {});
        notificationBus.emit({ type: 'stamina', title: 'Lobby não encontrado', message: 'Atualize e reentre no lobby.', icon: '⚠️', duration: 3000 });
      } else {
        notificationBus.emit({ type: 'stamina', title: 'Falha ao transferir', message: msg, icon: '⚠️', duration: 3000 });
      }
    } finally {
      setLobbyBusy(false);
    }
  };

  const sendChat = async () => {
    if (!joinedOnlineParty) return;
    if (!isMemberOfJoinedLobby) {
      notificationBus.emit({ type: 'stamina', title: 'Herói não está no lobby', message: 'Entre no lobby com este herói para enviar mensagens.', icon: '⚠️', duration: 3000 });
      return;
    }
    const text = chatInput.trim();
    if (!text) return;
    try {
      const msg = await sendPartyChat(joinedOnlineParty.id, hero.id, text);
      setChatInput('');
      setChatMessages(prev => [...prev.slice(-49), msg]);
      try { await sendPartyChatRealtime(joinedOnlineParty.id, msg); } catch {}
    } catch (err) {
      const msg = (err as Error)?.message || 'Erro';
      if (msg.includes('404')) {
        setJoinedOnlineParty(null);
        setChatMessages([]);
        listParties().then(setOnlineParties).catch(() => {});
        notificationBus.emit({ type: 'stamina', title: 'Lobby não encontrado', message: 'Atualize e reentre no lobby.', icon: '⚠️', duration: 3000 });
      } else {
        notificationBus.emit({ type: 'stamina', title: 'Falha no chat', message: msg, icon: '⚠️', duration: 3000 });
      }
    }
  };

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
          <button
            onClick={() => setActiveTab('lobby')}
            className={`px-4 py-2 rounded ${activeTab === 'lobby' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'} hover:opacity-90`}
          >Lobby Online</button>
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

      {activeTab === 'lobby' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">🌐 Lobby Online (Dev)</h2>
          {joinedOnlineParty && (
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm text-indigo-700">Você está no lobby</div>
                  <div className="text-xl font-bold text-indigo-900">{joinedOnlineParty.name}</div>
                  <div className="text-sm text-indigo-800 mt-1">Líder: {getHeroName(joinedOnlineParty.leaderId || '')}</div>
                  <div className="text-xs text-indigo-700 mt-1">ID do Lobby: <span className="font-mono">{joinedOnlineParty.id}</span></div>
                </div>
                <button onClick={handleLeavePartyOnline} disabled={isLobbyBusy} className="px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">Sair do Lobby</button>
              </div>
              <div className="flex gap-2 mb-3">
                {!isMemberOfJoinedLobby && (
                  <button
                    onClick={() => handleJoinPartyOnline(joinedOnlineParty.id)}
                    disabled={isLobbyBusy}
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >Entrar com este herói</button>
                )}
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(joinedOnlineParty.id);
                      notificationBus.emit({ type: 'quest', title: 'Convite copiado', message: 'ID do lobby copiado para a área de transferência.', icon: '📋', duration: 3000 });
                    } catch {
                      notificationBus.emit({ type: 'stamina', title: 'Falha ao copiar', message: 'Não foi possível copiar o ID. Copie manualmente.', icon: '⚠️', duration: 3000 });
                    }
                  }}
                  className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
                >Copiar ID do Lobby</button>
                <div className="text-xs text-gray-600 self-center">Compartilhe o ID para seu amigo filtrar e entrar.</div>
                <button onClick={toggleReady} disabled={!isMemberOfJoinedLobby || isLobbyBusy} className={`px-3 py-2 rounded ${ (joinedOnlineParty.readyMembers || []).includes(hero.id) ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600' } text-white disabled:opacity-50`}>
                  {(joinedOnlineParty.readyMembers || []).includes(hero.id) ? 'Pronto' : 'Marcar como Pronto'}
                </button>
                <div className="text-sm text-gray-700 self-center">Prontos: {(joinedOnlineParty.readyMembers || []).length} / {joinedOnlineParty.members.length}</div>
                {joinedOnlineParty.leaderId === hero.id && (joinedOnlineParty.readyMembers || []).length === joinedOnlineParty.members.length && (
                  <button onClick={handleStartMission} disabled={isLobbyBusy || !isMemberOfJoinedLobby} className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">Iniciar Missão</button>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-indigo-800 mb-2">Membros</h3>
                <ul className="space-y-1">
                  {joinedOnlineParty.members.map(id => (
                    <li key={id} className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-gray-800">{getHeroName(id)}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">ID: {id.slice(0,6)}</span>
                        {(joinedOnlineParty.readyMembers || []).includes(id) && <span className="text-xs text-green-700">Pronto</span>}
                        {joinedOnlineParty.leaderId === hero.id && id !== hero.id && (
                          <button onClick={() => handleKickMember(id)} disabled={isLobbyBusy} className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs">Remover</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {joinedOnlineParty.leaderId === hero.id && (
                <div className="bg-white p-3 rounded border mt-3">
                  <div className="font-semibold mb-2">Transferir Liderança</div>
                  <div className="flex gap-2">
                    <select value={newLeaderId} onChange={(e) => setNewLeaderId(e.target.value)} className="flex-1 p-2 border rounded">
                      <option value="">Selecionar membro...</option>
                      {joinedOnlineParty.members.filter(id => id !== hero.id).map(id => (
                        <option key={id} value={id}>{getHeroName(id)}</option>
                      ))}
                    </select>
                    <button onClick={handleTransferLeadershipOnline} disabled={!newLeaderId || isLobbyBusy} className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700">Transferir</button>
                  </div>
                </div>
              )}
              <div className="bg-white p-3 rounded border mt-3">
                <div className="font-semibold mb-2">Chat do Lobby</div>
                <div className="max-h-40 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
                  {chatMessages.length > 0 ? chatMessages.map(m => (
                    <div key={m.id} className="text-sm text-gray-800 flex justify-between">
                      <span><span className="font-semibold">{getHeroName(m.playerId)}</span>: {m.text}</span>
                      <span className="text-xs text-gray-500">{new Date(m.ts).toLocaleTimeString()}</span>
                    </div>
                  )) : <div className="text-xs text-gray-500">Sem mensagens ainda</div>}
                </div>
                <div className="flex gap-2">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Digite sua mensagem" className="flex-1 p-2 border rounded" />
                  <button onClick={sendChat} disabled={!chatInput.trim() || !isMemberOfJoinedLobby} className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">Enviar</button>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="font-semibold mb-2">Criar Party Online</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={lobbyPartyName}
                onChange={(e) => setLobbyPartyName(e.target.value)}
                placeholder="Nome do lobby"
                className="flex-1 p-2 border rounded"
              />
              <button onClick={handleCreatePartyOnline} disabled={!lobbyPartyName.trim() || isLobbyBusy} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">Criar</button>
            </div>
            <div className="mt-4">
              <div className="font-semibold mb-2">Filtrar Lobbies</div>
              <input
                type="text"
                value={lobbyFilter}
                onChange={(e) => setLobbyFilter(e.target.value)}
                placeholder="Filtrar por nome ou ID"
                className="w-full p-2 border rounded"
              />
              <div className="text-xs text-gray-500 mt-1">Dica: seu amigo pode colar o ID para achar rápido.</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold text-gray-800">Parties Online</div>
              <button onClick={async () => setOnlineParties(await listParties())} className="px-3 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Atualizar</button>
            </div>
            {onlineParties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {onlineParties
                  .filter(p => {
                    const f = lobbyFilter.trim().toLowerCase();
                    if (!f) return true;
                    return p.name.toLowerCase().includes(f) || p.id.toLowerCase().includes(f);
                  })
                  .map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{p.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">Criada em {new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-2xl">🌐</div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Membros:</span>
                        <span className="font-medium">{p.members.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Líder:</span>
                        <span className="font-medium">{getHeroName(p.leaderId || '')}</span>
                      </div>
                      <div className="text-xs text-gray-500">ID: <span className="font-mono">{p.id}</span></div>
                    </div>
                    {joinedOnlineParty?.id === p.id ? (
                      <button disabled className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded cursor-not-allowed">Já neste Lobby</button>
                    ) : (
                      <button onClick={() => handleJoinPartyOnline(p.id)} disabled={isLobbyBusy} className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition-colors">Entrar no Lobby</button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🌐</div>
                <h3 className="text-xl font-medium mb-2">Nenhuma party online</h3>
                <p>Crie um lobby acima e convide seus amigos.</p>
              </div>
            )}
          </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmAction(null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="confirm-dialog-title" className="text-lg font-bold text-white">Confirmação</h2>
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
