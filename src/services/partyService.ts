export interface ServerParty {
  id: string;
  name: string;
  leaderId: string | null;
  createdAt: string;
  members: string[];
  readyMembers?: string[];
  maxMembers?: number;
}

export async function listParties(): Promise<ServerParty[]> {
  const apiBase = (import.meta as any)?.env?.VITE_API_BASE;
  if (!apiBase) return [];
  const res = await fetch(`${apiBase}/party/list`);
  if (!res.ok) throw new Error(`Falha ao listar parties: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.parties) ? data.parties : [];
}

export async function createPartyOnline(name: string, playerId: string): Promise<ServerParty> {
  const res = await fetch('/api/party/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, playerId })
  });
  if (!res.ok) throw new Error(`Falha ao criar party: ${res.status}`);
  const data = await res.json();
  return data?.party as ServerParty;
}

export async function joinPartyOnline(partyId: string, playerId: string): Promise<ServerParty> {
  const res = await fetch('/api/party/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, playerId })
  });
  if (!res.ok) throw new Error(`Falha ao entrar na party: ${res.status}`);
  const data = await res.json();
  return data?.party as ServerParty;
}

export async function leavePartyOnline(partyId: string, playerId: string): Promise<void> {
  const res = await fetch('/api/party/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, playerId })
  });
  if (!res.ok) throw new Error(`Falha ao sair da party: ${res.status}`);
}

export async function setPartyReady(partyId: string, playerId: string, ready: boolean): Promise<ServerParty> {
  const res = await fetch('/api/party/ready', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, playerId, ready })
  });
  if (!res.ok) throw new Error(`Falha ao atualizar pronto: ${res.status}`);
  const data = await res.json();
  return data?.party as ServerParty;
}

export interface PartyMessage {
  id: string;
  playerId: string;
  text: string;
  ts: number;
}

export async function fetchPartyChat(partyId: string): Promise<PartyMessage[]> {
  const res = await fetch(`/api/party/chat?partyId=${encodeURIComponent(partyId)}`);
  if (!res.ok) throw new Error(`Falha ao carregar chat: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.messages) ? data.messages as PartyMessage[] : [];
}

export async function sendPartyChat(partyId: string, playerId: string, text: string): Promise<PartyMessage> {
  const res = await fetch('/api/party/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, playerId, text })
  });
  if (!res.ok) throw new Error(`Falha ao enviar mensagem: ${res.status}`);
  const data = await res.json();
  return data?.message as PartyMessage;
}

export async function startPartyMission(partyId: string, actorId: string): Promise<boolean> {
  const res = await fetch('/api/party/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, actorId })
  });
  if (res.status === 409) return false; // nem todos prontos
  if (!res.ok) throw new Error(`Falha ao iniciar missão: ${res.status}`);
  const data = await res.json();
  return !!data?.started;
}

export async function kickMemberOnline(partyId: string, actorId: string, targetId: string): Promise<ServerParty> {
  const res = await fetch('/api/party/kick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, actorId, targetId })
  });
  if (!res.ok) throw new Error(`Falha ao remover membro: ${res.status}`);
  const data = await res.json();
  return data?.party as ServerParty;
}

export async function transferLeadershipOnline(partyId: string, actorId: string, newLeaderId: string): Promise<ServerParty> {
  const res = await fetch('/api/party/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, actorId, newLeaderId })
  });
  if (!res.ok) throw new Error(`Falha ao transferir liderança: ${res.status}`);
  const data = await res.json();
  return data?.party as ServerParty;
}

export function startLobbyPolling(
  onUpdate: (parties: ServerParty[]) => void,
  intervalMs: number = 3000
): () => void {
  let stopped = false;
  async function tick() {
    try {
      const parties = await listParties();
      if (!stopped) onUpdate(parties);
    } catch (err) {
      // Silencia erros para não quebrar o fluxo inicial
      console.warn('party polling error:', (err as Error)?.message);
    } finally {
      if (!stopped) setTimeout(tick, intervalMs);
    }
  }
  tick();
  return () => { stopped = true; };
}

export function subscribePartyChatStream(
  partyId: string,
  onInit: (messages: PartyMessage[]) => void,
  onMessage: (message: PartyMessage) => void
): () => void {
  const es = new EventSource(`/api/party/chat/stream?partyId=${encodeURIComponent(partyId)}`);
  const handleInit = (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      onInit(Array.isArray(data) ? data as PartyMessage[] : []);
    } catch {}
  };
  const handleMsg = (ev: MessageEvent) => {
    try {
      const data = JSON.parse(ev.data);
      onMessage(data as PartyMessage);
    } catch {}
  };
  es.addEventListener('init', handleInit as any);
  es.addEventListener('message', handleMsg as any);
  es.onerror = () => {};
  return () => {
    try { es.close(); } catch {}
  };
}

const partyChannels = new Map<string, any>();

export function subscribePartyChatSupabase(
  partyId: string,
  onInit: (messages: PartyMessage[]) => void,
  onMessage: (message: PartyMessage) => void
): () => void {
  try {
    const mod = require('../lib/supabaseClient') as any;
    const supabase = mod.supabase;
    const supabaseConfigured = mod.supabaseConfigured;
    if (!supabaseConfigured) return () => {};
    const channel = supabase.channel(`party-chat-${partyId}`, { config: { broadcast: { self: false }, presence: { key: 'client' } } });
    channel.on('broadcast', { event: 'message' }, (payload: any) => {
      const msg = payload?.payload as PartyMessage;
      if (msg && msg.id) onMessage(msg);
    });
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') onInit([]);
    });
    partyChannels.set(partyId, channel);
    return () => {
      try { supabase.removeChannel(channel); } catch {}
      partyChannels.delete(partyId);
    };
  } catch { return () => {}; }
}

export async function sendPartyChatRealtime(partyId: string, message: PartyMessage): Promise<void> {
  try {
    const ch = partyChannels.get(partyId);
    if (!ch) return;
    await ch.send({ type: 'broadcast', event: 'message', payload: message });
  } catch {}
}
