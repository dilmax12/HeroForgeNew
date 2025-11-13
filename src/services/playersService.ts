import { supabase } from '../lib/supabaseClient';

export type PlayerProfile = {
  id: string;
  username?: string | null;
  created_at?: string;
};

// Garante um perfil na tabela `players` para o usuário autenticado
export async function ensurePlayerProfile(userId: string, username?: string | null): Promise<PlayerProfile | null> {
  if (!userId) return null;
  const safeUsername = username || null;
  // tenta buscar o perfil
  const { data: existing, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('id', userId)
    .limit(1);
  if (fetchError) {
    // se RLS bloquear, apenas retorne null
    return null;
  }
  if (existing && existing.length > 0) {
    // atualiza username se mudou
    const { data: updated, error: updateError } = await supabase
      .from('players')
      .update({ username: safeUsername })
      .eq('id', userId)
      .select('*')
      .limit(1);
    if (updateError) return existing[0] as PlayerProfile;
    return (updated && updated[0]) as PlayerProfile;
  }
  // cria novo perfil
  const { data: inserted, error: insertError } = await supabase
    .from('players')
    .insert({ id: userId, username: safeUsername })
    .select('*')
    .limit(1);
  if (insertError) return null;
  return (inserted && inserted[0]) as PlayerProfile;
}

