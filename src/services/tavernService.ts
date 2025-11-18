import { supabase, supabaseConfigured } from '../lib/supabaseClient';

export type TavernScope = 'global' | 'local';

export interface TavernMessage {
  id: string;
  author: string;
  content: string;
  scope: TavernScope;
  created_at: string; // ISO string
}

export interface TavernListResult {
  data: TavernMessage[];
  error?: string;
  offline?: boolean;
}

export async function listMessages(scope: TavernScope = 'global', limit = 50): Promise<TavernListResult> {
  if (!supabaseConfigured) {
    return { data: [], error: 'Supabase desabilitado: exibindo chat offline.', offline: true };
  }

  try {
    const { data, error } = await supabase
      .schema('public')
      .from('tavern_messages')
      .select('id, author, content, scope, created_at')
      .eq('scope', scope)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      const friendly = (msg.includes('schema cache') || msg.includes('does not exist'))
        ? 'Tabelas da Taverna não encontradas. Aplique supabase/tavern.sql no seu projeto Supabase.'
        : `Erro ao carregar mensagens: ${error.message}`;
      return { data: [], error: friendly };
    }
    return { data: (data as TavernMessage[]) || [] };
  } catch (err: any) {
    return { data: [], error: `Falha ao listar mensagens: ${err?.message || 'erro desconhecido'}` };
  }
}

export interface SendMessageResult {
  ok: boolean;
  error?: string;
  offline?: boolean;
  message?: TavernMessage;
  pendingApproval?: boolean;
}

export async function sendMessage(author: string, content: string, scope: TavernScope = 'global'): Promise<SendMessageResult> {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Mensagem vazia.' };
  }

  if (!supabaseConfigured) {
    // Retorna como offline; o componente deve gerenciar estado local
    const offlineMsg: TavernMessage = {
      id: `offline-${Date.now()}`,
      author,
      content: trimmed,
      scope,
      created_at: new Date().toISOString(),
    };
    return { ok: true, offline: true, message: offlineMsg };
  }

  try {
    const { data, error } = await supabase
      .schema('public')
      .from('tavern_messages')
      .insert({ author, content: trimmed, scope })
      .select('id, author, content, scope, created_at')
      .single();

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      const friendly = (msg.includes('schema cache') || msg.includes('does not exist'))
        ? 'Tabelas da Taverna não encontradas. Aplique supabase/tavern.sql no seu projeto Supabase.'
        : `Erro ao enviar: ${error.message}`;
      return { ok: false, error: friendly };
    }
    return { ok: true, message: data as TavernMessage };
  } catch (err: any) {
    return { ok: false, error: `Falha ao enviar mensagem: ${err?.message || 'erro desconhecido'}` };
  }
}

export async function sendMessageForApproval(author: string, content: string, scope: TavernScope = 'global'): Promise<SendMessageResult> {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Mensagem vazia.' };
  }
  if (!supabaseConfigured) {
    const offlineMsg: TavernMessage = {
      id: `offline-${Date.now()}`,
      author,
      content: trimmed,
      scope,
      created_at: new Date().toISOString(),
    };
    return { ok: true, offline: true, message: offlineMsg };
  }
  try {
    // Insere como não aprovada; RLS impedirá retorno no select
    const { error } = await supabase
      .schema('public')
      .from('tavern_messages')
      .insert({ author, content: trimmed, scope, approved: false });
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      const friendly = (msg.includes('schema cache') || msg.includes('does not exist'))
        ? 'Tabelas da Taverna não encontradas. Aplique supabase/tavern.sql no seu projeto Supabase.'
        : `Erro ao enviar para aprovação: ${error.message}`;
      return { ok: false, error: friendly };
    }
    // Retorna uma cópia local marcada como pendente
    const pending: TavernMessage = {
      id: `pending-${Date.now()}`,
      author,
      content: `${trimmed} (pendente de aprovação)`,
      scope,
      created_at: new Date().toISOString(),
    };
    return { ok: true, message: pending, pendingApproval: true };
  } catch (err: any) {
    return { ok: false, error: `Falha ao enviar para aprovação: ${err?.message || 'erro desconhecido'}` };
  }
}

export function moderateMessage(content: string): { ok: boolean; sanitized: string; reason?: string } {
  const trimmed = (content || '').trim();
  if (!trimmed) return { ok: false, sanitized: '', reason: 'Mensagem vazia.' };
  if (trimmed.length > 500) return { ok: false, sanitized: trimmed.slice(0, 500), reason: 'Muito longa.' };
  // Simples moderação placeholder (poderemos integrar um serviço real depois)
  return { ok: true, sanitized: trimmed };
}

export async function reportMessage(messageId: string, reason: string, autoHide = false, userId?: string): Promise<{ ok: boolean; error?: string }>{
  try {
    const resp = await fetch('/api/tavern-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, reason, autoHide, userId })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err?.error || 'Falha ao enviar denúncia' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro desconhecido ao denunciar' };
  }
}

export async function adminListPendingMessages(adminToken: string): Promise<{ pending: TavernMessage[]; error?: string }>{
  try {
    const resp = await fetch('/api/tavern-approve', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { pending: [], error: json?.error || 'Falha ao listar pendentes' };
    }
    return { pending: (json?.pending || []) as TavernMessage[] };
  } catch (err: any) {
    return { pending: [], error: err?.message || 'Erro ao listar pendentes' };
  }
}

export async function adminSetMessageApproval(messageId: string, approved: boolean, adminToken: string): Promise<{ ok: boolean; error?: string }>{
  try {
    const resp = await fetch('/api/tavern-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ messageId, approved })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { ok: false, error: json?.error || 'Falha ao atualizar aprovação' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao atualizar aprovação' };
  }
}

export async function generateRumorsAI(scope: TavernScope = 'global', extraContext: string = ''): Promise<{ rumors: string[]; error?: string }>{
  try {
    // Coleta de contexto leve: últimas mensagens aprovadas do escopo
    let contextPieces: string[] = [];
    if (supabaseConfigured && !import.meta.env.DEV) {
      const list = await listMessages(scope, 10);
      if (list.data && list.data.length > 0) {
        const parts = list.data.slice(0, 5).map(m => `Autor: ${m.author}; Conteúdo: ${m.content}`);
        contextPieces.push(...parts);
      }
    }
    if (extraContext) contextPieces.push(extraContext);
    const prompt = `Gere 5 rumores curtos, em português, no estilo fantasia medieval, cada um em uma linha, baseados nestes fatos do chat da taverna:
${contextPieces.length ? contextPieces.join('\n') : 'Sem fatos disponíveis hoje.'}
Regras: máximo 120 caracteres por rumor, sem spoilers, tom leve e divertido.`;

    const resp = await fetch('/api/hf-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, maxTokens: 256, temperature: 0.8 })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = json?.error?.message || json?.error || 'Falha ao gerar rumores';
      return { rumors: [], error: msg };
    }
    const text = (json?.text || json?.resultado || '') as string;
    const lines = String(text)
      .split(/\r?\n/)
      .map(s => s.replace(/^[-•\d.\)\s]+/, '').trim())
      .filter(s => s.length > 0)
      .slice(0, 5);
    return { rumors: lines };
  } catch (err: any) {
    return { rumors: [], error: err?.message || 'Erro desconhecido ao gerar rumores' };
  }
}

export interface DiceEventPayload {
  heroId: string;
  heroName: string;
  roll: number;
  critical?: boolean;
  betAmount?: number;
  opponentName?: string;
}

export async function recordDiceEvent(ev: DiceEventPayload): Promise<{ ok: boolean; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=dice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ev)
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { ok: false, error: json?.error || 'Falha ao registrar evento de dados' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro desconhecido ao registrar evento de dados' };
  }
}

export interface WeeklyDiceEntry { heroName: string; best: number; crits: number; count: number }
export async function getWeeklyDiceLeadersServer(): Promise<{ entries: WeeklyDiceEntry[]; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=dice-weekly', { method: 'GET' });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { entries: [], error: json?.error || 'Falha ao obter ranking semanal' };
    }
    return { entries: (json?.entries || []) as WeeklyDiceEntry[] };
  } catch (err: any) {
    return { entries: [], error: err?.message || 'Erro desconhecido ao obter ranking semanal' };
  }
}

export async function getWeeklyChampions(): Promise<{ champions: { week_start: string; week_end: string; hero_name: string; score: number }[]; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=dice-weekly-champions', { method: 'GET' });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { champions: [], error: json?.error || 'Falha ao obter campeões' };
    }
    return { champions: (json?.champions || []) as any[] };
  } catch (err: any) {
    return { champions: [], error: err?.message || 'Erro desconhecido ao obter campeões' };
  }
}

export async function snapshotWeeklyChampion(adminToken: string): Promise<{ ok: boolean; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=dice-weekly-snapshot', { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { ok: false, error: json?.error || 'Falha ao criar snapshot semanal' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro desconhecido ao criar snapshot' };
  }
}

export async function getNextWeeklySnapshot(tzOffsetMin?: number): Promise<{ nextSnapshotAt?: string; error?: string }>{
  try {
    const qs = typeof tzOffsetMin === 'number' ? `&tz_offset_min=${tzOffsetMin}` : '';
    const resp = await fetch(`/api/tavern?action=dice-weekly-next${qs}`, { method: 'GET' });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { error: json?.error || 'Falha ao obter próxima execução' };
    }
    return { nextSnapshotAt: json?.nextSnapshotAt };
  } catch (err: any) {
    return { error: err?.message || 'Erro desconhecido ao obter próxima execução' };
  }
}

export async function snapshotWeeklyChampionAuto(adminToken: string): Promise<{ ok: boolean; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=dice-weekly-snapshot-auto', { method: 'POST', headers: { 'Authorization': `Bearer ${adminToken}` } });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { ok: false, error: json?.error || 'Falha ao criar snapshot automático' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro desconhecido ao criar snapshot automático' };
  }
}

export async function getTavernSettings(): Promise<{ settings: Record<string, string>; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=settings-get', { method: 'GET' });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { settings: {}, error: json?.error || 'Falha ao obter configurações' };
    const list = Array.isArray(json?.settings) ? json.settings : [];
    const map: Record<string, string> = {};
    list.forEach((s: any) => { if (s && s.key) map[s.key] = String(s.value || ''); });
    return { settings: map };
  } catch (err: any) {
    return { settings: {}, error: err?.message || 'Erro ao obter configurações' };
  }
}

export async function setTavernSettings(adminToken: string, settings: { tz_offset_min?: number; reroll_daily_cap?: number }): Promise<{ ok: boolean; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=settings-set', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }, body: JSON.stringify(settings) });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: json?.error || 'Falha ao salvar configurações' };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao salvar configurações' };
  }
}

export async function setSupporterCap(adminToken: string, heroId: string, cap_bonus: number): Promise<{ ok: boolean; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=supporter-set', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }, body: JSON.stringify({ heroId, cap_bonus }) });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: json?.error || 'Falha ao definir cap bônus' };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao definir cap bônus' };
  }
}

export async function getCronStatus(): Promise<{ nextSnapshotAt?: string; lastSnapshotAt?: string; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=dice-weekly-cron-status', { method: 'GET' });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { error: json?.error || 'Falha ao obter status do cron' };
    return { nextSnapshotAt: json?.nextSnapshotAt, lastSnapshotAt: json?.lastSnapshotAt };
  } catch (err: any) {
    return { error: err?.message || 'Erro ao obter status do cron' };
  }
}

export async function getCronLogs(): Promise<{ logs: Array<{ executed_at: string; status: string; message?: string }>; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=dice-weekly-cron-logs', { method: 'GET' });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { logs: [], error: json?.error || 'Falha ao obter logs' };
    return { logs: Array.isArray(json?.logs) ? json.logs : [] };
  } catch (err: any) {
    return { logs: [], error: err?.message || 'Erro ao obter logs' };
  }
}

export async function getRerollUsage(heroId: string): Promise<{ count: number; cap: number; error?: string }>{
  try {
    const resp = await fetch(`/api/tavern?action=reroll-usage-get&heroId=${encodeURIComponent(heroId)}`, { method: 'GET' });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { count: 0, cap: 5, error: json?.error || 'Falha ao obter uso diário' };
    return { count: Number(json?.count || 0), cap: Number(json?.cap || 5) };
  } catch (err: any) {
    return { count: 0, cap: 5, error: err?.message || 'Erro ao obter uso diário' };
  }
}

export async function incrementRerollUsage(heroId: string): Promise<{ ok: boolean; count?: number; cap?: number; reason?: string; error?: string }>{
  try {
    const resp = await fetch('/api/tavern?action=reroll-usage-increment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heroId }) });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { ok: false, error: json?.error || 'Falha ao incrementar' };
    return { ok: !!json?.ok, count: json?.count, cap: json?.cap, reason: json?.reason };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao incrementar' };
  }
}

export async function getRerollUsageHistory(heroId: string, days: number = 7): Promise<{ history: Array<{ usage_date: string; count: number }>; cap: number; error?: string }>{
  try {
    const resp = await fetch(`/api/tavern?action=reroll-usage-history&heroId=${encodeURIComponent(heroId)}&days=${days}`, { method: 'GET' });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return { history: [], cap: 5, error: json?.error || 'Falha ao obter histórico' };
    return { history: Array.isArray(json?.history) ? json.history : [], cap: Number(json?.cap || 5) };
  } catch (err: any) {
    return { history: [], cap: 5, error: err?.message || 'Erro ao obter histórico' };
  }
}
