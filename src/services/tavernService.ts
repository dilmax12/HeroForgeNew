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
    if (supabaseConfigured) {
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
      .map(s => s.replace(/^[-•\d\.\)\s]+/, '').trim())
      .filter(s => s.length > 0)
      .slice(0, 5);
    return { rumors: lines };
  } catch (err: any) {
    return { rumors: [], error: err?.message || 'Erro desconhecido ao gerar rumores' };
  }
}
