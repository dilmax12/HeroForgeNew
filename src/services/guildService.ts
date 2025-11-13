import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import type { Hero } from '../types/hero';

export type GuildMember = {
  id: string;
  user_id: string;
  hero_id: string;
  hero_name: string;
  rank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  reputation: number;
  joined_at: string;
};

export type GuildLeaderboardEntry = {
  hero_name: string;
  rank: GuildMember['rank'];
  reputation: number;
  joined_at: string;
};

const rankByReputation = (rep: number): GuildMember['rank'] => {
  if (rep >= 1100) return 'S';
  if (rep >= 800) return 'A';
  if (rep >= 550) return 'B';
  if (rep >= 350) return 'C';
  if (rep >= 200) return 'D';
  if (rep >= 100) return 'E';
  return 'F';
};

export async function joinAdventurersGuild(hero: Hero): Promise<{ ok: boolean; error?: string; member?: GuildMember; offline?: boolean }>{
  if (!hero?.id) return { ok: false, error: 'Herói inválido.' };
  if (!supabaseConfigured) {
    return { ok: true, offline: true };
  }
  try {
    const { data: usr } = await supabase.auth.getUser();
    const userId = usr?.user?.id;
    if (!userId) return { ok: false, error: 'Faça login para ingressar na Guilda.' };
    const payload = {
      user_id: userId,
      hero_id: hero.id,
      hero_name: hero.name,
      rank: 'F',
      reputation: 0
    };
    const { data, error } = await supabase
      .from('guild_members')
      .upsert(payload, { onConflict: 'user_id,hero_id' })
      .select('*')
      .limit(1);
    if (error) return { ok: false, error: error.message };
    const member = (data && data[0]) as GuildMember;
    return { ok: true, member };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao ingressar na Guilda.' };
  }
}

export async function addGuildReputation(hero: Hero, delta: number): Promise<{ ok: boolean; error?: string; member?: GuildMember; offline?: boolean }>{
  if (!hero?.id) return { ok: false, error: 'Herói inválido.' };
  if (!supabaseConfigured) return { ok: true, offline: true };
  try {
    const { data: usr } = await supabase.auth.getUser();
    const userId = usr?.user?.id;
    if (!userId) return { ok: false, error: 'Faça login para pontuar reputação.' };

    // Busca registro atual
    const { data: existing, error: fetchError } = await supabase
      .from('guild_members')
      .select('*')
      .eq('user_id', userId)
      .eq('hero_id', hero.id)
      .limit(1);
    if (fetchError) return { ok: false, error: fetchError.message };
    const current = (existing && existing[0]) as GuildMember | undefined;
    const newRep = Math.max(0, (current?.reputation || 0) + delta);
    const newRank = rankByReputation(newRep);

    const { data, error } = await supabase
      .from('guild_members')
      .upsert({
        user_id: userId,
        hero_id: hero.id,
        hero_name: hero.name,
        reputation: newRep,
        rank: newRank
      }, { onConflict: 'user_id,hero_id' })
      .select('*')
      .limit(1);
    if (error) return { ok: false, error: error.message };
    const member = (data && data[0]) as GuildMember;
    return { ok: true, member };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro ao atualizar reputação.' };
  }
}

export async function getGuildLeaderboard(limit = 10): Promise<{ data: GuildLeaderboardEntry[]; error?: string; offline?: boolean }>{
  if (!supabaseConfigured) return { data: [], offline: true };
  try {
    const { data, error } = await supabase
      .from('guild_rankings')
      .select('*')
      .limit(limit);
    if (error) return { data: [], error: error.message };
    return { data: (Array.isArray(data) ? data : []) as GuildLeaderboardEntry[] };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Falha ao carregar leaderboard.' };
  }
}

