import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import type { Hero } from '../types/hero';

export type GuildLetter = {
  id: string;
  author_id: string;
  author_name: string;
  to_hero_id: string;
  to_hero_name: string;
  subject: string;
  body: string;
  created_at: string;
};

const LOCAL_KEY = 'heroforge-guild-letters';

function loadLocal(): GuildLetter[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(letters: GuildLetter[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(letters)); } catch {}
}

export async function sendGuildLetter(author: Hero, toHeroId: string, toHeroName: string, subject: string, body: string): Promise<{ ok: boolean; error?: string; offline?: boolean; letter?: GuildLetter }>{
  const letter: GuildLetter = {
    id: `letter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    author_id: author.id,
    author_name: author.name,
    to_hero_id: toHeroId,
    to_hero_name: toHeroName,
    subject: subject.trim(),
    body: body.trim(),
    created_at: new Date().toISOString()
  };

  if (supabaseConfigured) {
    try {
      const { error } = await supabase.from('guild_letters').insert({
        id: letter.id,
        author_id: letter.author_id,
        author_name: letter.author_name,
        to_hero_id: letter.to_hero_id,
        to_hero_name: letter.to_hero_name,
        subject: letter.subject,
        body: letter.body,
        created_at: letter.created_at
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, letter };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Falha ao enviar carta.' };
    }
  } else {
    const letters = loadLocal();
    letters.unshift(letter);
    saveLocal(letters);
    return { ok: true, offline: true, letter };
  }
}

export async function listInbox(heroId: string, limit = 50): Promise<{ data: GuildLetter[]; offline?: boolean; error?: string }>{
  if (supabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('guild_letters')
        .select('*')
        .eq('to_hero_id', heroId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return { data: [], error: error.message };
      return { data: (data || []) as GuildLetter[] };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Falha ao carregar inbox.' };
    }
  } else {
    const letters = loadLocal().filter(l => l.to_hero_id === heroId).slice(0, limit);
    return { data: letters, offline: true };
  }
}

export async function listOutbox(heroId: string, limit = 50): Promise<{ data: GuildLetter[]; offline?: boolean; error?: string }>{
  if (supabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('guild_letters')
        .select('*')
        .eq('author_id', heroId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) return { data: [], error: error.message };
      return { data: (data || []) as GuildLetter[] };
    } catch (err: any) {
      return { data: [], error: err?.message || 'Falha ao carregar outbox.' };
    }
  } else {
    const letters = loadLocal().filter(l => l.author_id === heroId).slice(0, limit);
    return { data: letters, offline: true };
  }
}
