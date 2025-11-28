import { supabase } from '../lib/supabaseClient';
import type { Hero } from '../types/hero';

// Versão do schema de persistência de herói no Supabase
export const HERO_SCHEMA_VERSION = 1;

export type StoredHero = {
  id: string;
  user_id: string;
  name?: string;
  class?: string;
  data: any;
  created_at?: string;
  updated_at?: string;
};

// Lê a versão do schema a partir do json armazenado
export function getStoredHeroVersion(storedData: any): number {
  const raw = storedData?.hero ? storedData.hero : storedData;
  const v = raw?.__schema_version;
  return typeof v === 'number' ? v : 0;
}

// Sanitiza os dados para importação no store (remove metadados e suporta forma encapsulada)
export function sanitizeStoredHeroData(storedData: any): Hero {
  const candidate = storedData?.hero ? storedData.hero : storedData;
  const { __schema_version, ...sanitized } = candidate || {};
  return sanitized as Hero;
}

export async function saveHero(userId: string, hero: Hero): Promise<StoredHero | null> {
  if (!userId || !hero?.id) return null;
  // Persistimos todos os campos do herói com uma flag de versão de schema
  const nameValue = hero?.name || hero?.id || 'Unknown';
  const classValue = (hero as any)?.class || 'Unknown';
  const payload = { id: hero.id, user_id: userId, name: nameValue, class: classValue, data: { ...hero, __schema_version: HERO_SCHEMA_VERSION } };
  const { data, error } = await supabase
    .from('heroes')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .limit(1);
  if (error) {
    console.error('saveHero error', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      payload
    });
    return null;
  }
  return (data && data[0]) as StoredHero;
}

export async function listHeroesByUser(userId: string): Promise<StoredHero[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('heroes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('listHeroesByUser error', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      userId
    });
    return [];
  }
  return (Array.isArray(data) ? data : []) as StoredHero[];
}

export async function getHeroStatus(heroId: string): Promise<{ id: string; stamina: number; maxStamina: number; lastRestAt: number; dayCounter: number; actionsAvailable: string[] }> {
  const res = await fetch(`/api/hero/${encodeURIComponent(heroId)}/status`, { method: 'GET' });
  if (!res.ok) throw new Error('status_error');
  return res.json();
}

export async function canPerformAction(heroId: string, actionType: string): Promise<{ ok: boolean; reason?: string; cost: number; stamina: number }> {
  const res = await fetch(`/api/hero/${encodeURIComponent(heroId)}/can-perform`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionType }) });
  if (!res.ok) throw new Error('can_perform_error');
  return res.json();
}

export async function performAction(heroId: string, actionType: string, payload: any = {}): Promise<{ ok: boolean; newStamina: number; actionId: string }> {
  const res = await fetch(`/api/hero/${encodeURIComponent(heroId)}/perform-action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionType, payload }) });
  if (!res.ok) throw new Error('perform_error');
  return res.json();
}

export async function restHero(heroId: string, restType: 'guild' | 'inn' = 'guild'): Promise<{ ok: boolean; stamina: number; dayCounter: number; summary: any }> {
  const res = await fetch(`/api/hero/${encodeURIComponent(heroId)}/rest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restType }) });
  if (!res.ok) throw new Error('rest_error');
  return res.json();
}

export async function restItem(heroId: string, itemId: string): Promise<{ ok: boolean; stamina: number }> {
  const res = await fetch(`/api/hero/${encodeURIComponent(heroId)}/rest-item`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId }) });
  if (!res.ok) throw new Error('rest_item_error');
  return res.json();
}

export async function consumeInnXpBuff(heroId: string): Promise<{ percent: number; remaining: number }> {
  const res = await fetch(`/api/hero/${encodeURIComponent(heroId)}/consume-inn-xp-buff`, { method: 'POST' });
  if (!res.ok) throw new Error('inn_buff_error');
  return res.json();
}

export async function performActionUnified(heroId: string, actionKey: string, payload: any = {}): Promise<{ ok: boolean; hero: any; actionId: string }> {
  const res = await fetch(`/api/hero/${encodeURIComponent(heroId)}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionKey, payload }) });
  if (!res.ok) throw new Error('perform_unified_error');
  return res.json();
}

export async function getDailySummary(heroId: string): Promise<any> {
  const res = await fetch(`/api/hero/${encodeURIComponent(heroId)}/daily-summary`, { method: 'GET' });
  if (!res.ok) throw new Error('daily_summary_error');
  return res.json();
}

export async function listGuildBoard(heroId: string): Promise<{ quests: any[] }> {
  const res = await fetch(`/api/guild/board?heroId=${encodeURIComponent(heroId)}`, { method: 'GET' });
  if (!res.ok) throw new Error('guild_board_error');
  return res.json();
}
