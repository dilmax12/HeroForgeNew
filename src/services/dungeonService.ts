import { supabase, supabaseConfigured } from '../lib/supabaseClient';
import type { Hero } from '../types/hero';

export type DungeonRunPayload = {
  user_id: string;
  hero_id: string;
  hero_name: string;
  max_floor_reached: number;
  victory: boolean;
  total_xp: number;
  total_gold: number;
  logs: any;
  started_at?: string;
  finished_at?: string;
};

export async function saveDungeonRun(hero: Hero, summary: Omit<DungeonRunPayload, 'user_id' | 'hero_id' | 'hero_name'>): Promise<{ ok: boolean; error?: string; offline?: boolean }>{
  if (!supabaseConfigured) return { ok: true, offline: true };
  try {
    const { data: usr } = await supabase.auth.getUser();
    const userId = usr?.user?.id;
    if (!userId) return { ok: false, error: 'Faça login para registrar a run.' };
    const payload: DungeonRunPayload = {
      user_id: userId,
      hero_id: hero.id,
      hero_name: hero.name,
      max_floor_reached: summary.max_floor_reached,
      victory: summary.victory,
      total_xp: summary.total_xp,
      total_gold: summary.total_gold,
      logs: summary.logs,
      started_at: summary.started_at,
      finished_at: summary.finished_at || new Date().toISOString()
    };
    const { error } = await supabase
      .from('dungeon_runs')
      .insert(payload);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao salvar run.' };
  }
}

// Inicia uma run com started_at e retorna o id do registro
export async function startDungeonRun(hero: Hero, startedAt?: string): Promise<{ ok: boolean; runId?: string; offline?: boolean; error?: string }>{
  if (!supabaseConfigured) return { ok: true, offline: true };
  try {
    const { data: usr } = await supabase.auth.getUser();
    const userId = usr?.user?.id;
    if (!userId) return { ok: false, error: 'Faça login para iniciar a run.' };
    const payload: Partial<DungeonRunPayload> = {
      user_id: userId,
      hero_id: hero.id,
      hero_name: hero.name,
      max_floor_reached: 0,
      victory: false,
      total_xp: 0,
      total_gold: 0,
      logs: [],
      started_at: startedAt || new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('dungeon_runs')
      .insert(payload)
      .select('id')
      .limit(1);
    if (error) return { ok: false, error: error.message };
    const runId = Array.isArray(data) && data.length ? (data[0] as any).id : undefined;
    return { ok: true, runId };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao iniciar run.' };
  }
}

// Atualiza snapshot da run (andares, totais e logs) de forma incremental
export async function updateDungeonRun(runId: string, snapshot: { max_floor_reached: number; total_xp: number; total_gold: number; logs: any[] }): Promise<{ ok: boolean; offline?: boolean; error?: string }>{
  if (!supabaseConfigured) return { ok: true, offline: true };
  try {
    const { error } = await supabase
      .from('dungeon_runs')
      .update({
        max_floor_reached: snapshot.max_floor_reached,
        total_xp: snapshot.total_xp,
        total_gold: snapshot.total_gold,
        logs: snapshot.logs
      })
      .eq('id', runId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao atualizar run.' };
  }
}

// Finaliza a run existente com vitória/derrota, totais e finished_at
export async function finishDungeonRun(runId: string, summary: { victory: boolean; max_floor_reached: number; total_xp: number; total_gold: number; logs: any[]; finished_at?: string }): Promise<{ ok: boolean; offline?: boolean; error?: string }>{
  if (!supabaseConfigured) return { ok: true, offline: true };
  try {
    const { error } = await supabase
      .from('dungeon_runs')
      .update({
        victory: summary.victory,
        max_floor_reached: summary.max_floor_reached,
        total_xp: summary.total_xp,
        total_gold: summary.total_gold,
        logs: summary.logs,
        finished_at: summary.finished_at || new Date().toISOString()
      })
      .eq('id', runId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao finalizar run.' };
  }
}

export async function getLastRunForHeroToday(hero: Hero): Promise<{ exists: boolean; error?: string; offline?: boolean }>{
  if (!supabaseConfigured) return { exists: false, offline: true };
  try {
    const { data: usr } = await supabase.auth.getUser();
    const userId = usr?.user?.id;
    if (!userId) return { exists: false };
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from('dungeon_runs')
      .select('id, finished_at')
      .eq('user_id', userId)
      .eq('hero_id', hero.id)
      .gte('finished_at', startOfDay.toISOString())
      .limit(1);
    if (error) return { exists: false, error: error.message };
    return { exists: Array.isArray(data) && data.length > 0 };
  } catch (err: any) {
    return { exists: false, error: err?.message || 'Erro ao verificar tentativas.' };
  }
}

export type DungeonLeaderboardEntry = {
  hero_name: string;
  max_floor_reached: number;
  total_xp: number;
  total_gold: number;
  finished_at: string;
};

export async function getDungeonLeaderboard(limit = 10): Promise<{ data: DungeonLeaderboardEntry[]; offline?: boolean; error?: string }>{
  if (!supabaseConfigured) return { data: [], offline: true };
  try {
    const { data, error } = await supabase
      .from('dungeon_leaderboard')
      .select('*')
      .limit(limit);
    if (error) {
      const msg = String(error.message || '');
      const notFound = msg.includes('Could not find the table') || msg.includes('does not exist');
      return notFound ? { data: [], offline: true } : { data: [], error: error.message };
    }
    return { data: (Array.isArray(data) ? data : []) as DungeonLeaderboardEntry[] };
  } catch (err: any) {
    return { data: [], error: err?.message || 'Falha ao carregar leaderboard da dungeon.' };
  }
}

export type WeeklyDungeonHighlights = {
  bestRun?: {
    hero_name: string;
    max_floor_reached: number;
    finished_at: string;
  };
  biggestLoot?: {
    hero_name: string;
    total_gold: number;
    finished_at: string;
  };
};

export async function getWeeklyDungeonHighlights(): Promise<{ data: WeeklyDungeonHighlights; offline?: boolean; error?: string }>{
  if (!supabaseConfigured) return { data: {}, offline: true };
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: bestRuns, error: errBest } = await supabase
      .from('dungeon_runs')
      .select('hero_name, max_floor_reached, finished_at')
      .gte('finished_at', oneWeekAgo.toISOString())
      .order('max_floor_reached', { ascending: false })
      .order('finished_at', { ascending: true })
      .limit(1);

    const { data: lootRuns, error: errLoot } = await supabase
      .from('dungeon_runs')
      .select('hero_name, total_gold, finished_at')
      .gte('finished_at', oneWeekAgo.toISOString())
      .order('total_gold', { ascending: false })
      .order('finished_at', { ascending: true })
      .limit(1);

    if (errBest || errLoot) {
      const msg = String(errBest?.message || errLoot?.message || '');
      const notFound = msg.includes('Could not find the table') || msg.includes('does not exist');
      return notFound ? { data: {}, offline: true } : { data: {}, error: (errBest?.message || errLoot?.message) };
    }

    const bestRun = Array.isArray(bestRuns) && bestRuns.length ? bestRuns[0] : undefined;
    const biggestLoot = Array.isArray(lootRuns) && lootRuns.length ? lootRuns[0] : undefined;

    return { data: { bestRun, biggestLoot } };
  } catch (err: any) {
    return { data: {}, error: err?.message || 'Falha ao carregar destaques semanais da dungeon.' };
  }
}
