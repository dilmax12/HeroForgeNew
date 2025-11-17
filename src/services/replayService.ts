import { supabase, supabaseConfigured } from '../lib/supabaseClient'

export async function getActiveWeeklyMutator(): Promise<{ id: string; name: string; modifiers: any } | null> {
  try { localStorage.removeItem('replay_weekly_mutator') } catch {}
  return null
}

export async function getActiveGlobalEvents(): Promise<Array<{ id: string; name: string; modifiers: any }>> {
  try { localStorage.removeItem('replay_global_events') } catch {}
  return []
}

export async function getPlayerRelics(): Promise<Array<{ id: string; name: string; effect: any }>> {
  if (!supabaseConfigured) return []
  const { data: u } = await supabase.auth.getUser()
  const userId = u?.user?.id
  if (!userId) return []
  const { data, error } = await supabase
    .from('player_relics')
    .select('relic_id, relics(name,effect)')
    .eq('user_id', userId)
  if (error) return []
  const rows = (data || []).map((r: any) => ({ id: r.relic_id, name: r.relics?.name, effect: r.relics?.effect }))
  try { localStorage.setItem('replay_player_relics', JSON.stringify(rows)) } catch {}
  return rows
}

export async function claimDailyChest(): Promise<{ ok: boolean; error?: string; rewards?: any; streak?: number }>{
  if (!supabaseConfigured) return { ok: false, error: 'Supabase desabilitado' }
  const { data: u } = await supabase.auth.getUser()
  const userId = u?.user?.id
  if (!userId) return { ok: false, error: 'Usuário não autenticado' }
  const now = new Date()
  const base = { xp: 100, gold: 50, rare_item_chance: 0.1 }
  const { data, error } = await supabase
    .from('daily_chest_claims')
    .insert({ user_id: userId, rewards: base })
    .select('id,claimed_at,streak_count,rewards')
    .single()
  if (error) {
    const msg = String(error.message || '')
    if (msg.toLowerCase().includes('duplicate')) return { ok: false, error: 'Cofre diário já coletado' }
    return { ok: false, error: 'Falha ao coletar cofre' }
  }
  return { ok: true, rewards: data?.rewards || base, streak: data?.streak_count || 0 }
}