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
