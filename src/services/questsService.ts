import { supabase } from '../lib/supabaseClient';
import type { Quest } from '../types/hero';

export type StoredQuest = {
  id: string;
  user_id: string;
  hero_id: string;
  data: any;
  status?: 'active' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
};

export async function saveQuest(userId: string, heroId: string, quest: Quest, status: StoredQuest['status'] = 'active'): Promise<StoredQuest | null> {
  if (!userId || !heroId || !quest?.id) return null;
  const payload = { id: quest.id, user_id: userId, hero_id: heroId, data: quest, status };
  const { data, error } = await supabase
    .from('quests')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .limit(1);
  if (error) {
    console.error('saveQuest error', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      payload
    });
    return null;
  }
  return (data && data[0]) as StoredQuest;
}

export async function listQuestsByHero(userId: string, heroId: string): Promise<StoredQuest[]> {
  if (!userId || !heroId) return [];
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', userId)
    .eq('hero_id', heroId)
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('listQuestsByHero error', {
      code: (error as any)?.code,
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      userId,
      heroId
    });
    return [];
  }
  return (Array.isArray(data) ? data : []) as StoredQuest[];
}

export async function updateQuestStatus(questId: string, status: StoredQuest['status']): Promise<StoredQuest | null> {
  if (!questId) return null;
  const { data, error } = await supabase
    .from('quests')
    .update({ status })
    .eq('id', questId)
    .select('*')
    .limit(1);
  if (error) {
    console.error('updateQuestStatus error', error);
    return null;
  }
  return (data && data[0]) as StoredQuest;
}

export async function deleteQuest(questId: string): Promise<boolean> {
  if (!questId) return false;
  const { error } = await supabase
    .from('quests')
    .delete()
    .eq('id', questId);
  if (error) {
    console.error('deleteQuest error', error);
    return false;
  }
  return true;
}
