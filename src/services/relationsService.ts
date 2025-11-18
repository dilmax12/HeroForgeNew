import { supabase } from '../lib/supabaseClient';

export async function saveRelation(npcId: string, heroId: string, value: number, tier: string, lastContact: string) {
  try {
    if (!supabase || (supabase as any)._disabled) return;
    await supabase.from('relations').upsert({ npc_id: npcId, hero_id: heroId, value, tier, last_contact: lastContact }, { onConflict: 'npc_id,hero_id' });
  } catch {}
}