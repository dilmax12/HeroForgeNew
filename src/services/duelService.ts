export async function startDuel(payload: { heroId: string; heroName: string; opponentName: string; mode: string }) {
  try {
    const resp = await fetch('/api/duel?action=start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    await resp.json().catch(()=>({}))
    return { ok: resp.ok }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao iniciar duelo' }
  }
}

export async function submitDuelResult(payload: { heroId: string; heroName: string; opponentName: string; victory: boolean; xp: number; gold: number; log: string[] }) {
  try {
    const resp = await fetch('/api/duel?action=submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { ok: false, error: json?.error || 'Falha ao registrar resultado' }
    return { ok: true, result: json?.result }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro desconhecido ao enviar resultado' }
  }
}

export async function getWeeklyDuelLeadersServer(): Promise<{ entries: { heroName: string; wins: number; total: number }[]; error?: string }>{
  try {
    const resp = await fetch('/api/duel?action=weekly', { method: 'GET' })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { entries: [], error: json?.error || 'Falha ao obter ranking semanal de duelos' }
    return { entries: (json?.entries || []) }
  } catch (err: any) {
    return { entries: [], error: err?.message || 'Erro desconhecido ao obter ranking' }
  }
}

export async function queueForDuel(heroId: string, heroName: string): Promise<{ matched: boolean; match?: any; error?: string }>{
  try {
    const resp = await fetch('/api/duel?action=queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ heroId, heroName }) })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { matched: false, error: json?.error || 'Falha ao entrar na fila' }
    return { matched: !!json?.matched, match: json?.match }
  } catch (err: any) {
    return { matched: false, error: err?.message || 'Erro desconhecido na fila' }
  }
}

export async function pollMatch(heroId: string): Promise<{ match: any; error?: string }>{
  try {
    const resp = await fetch(`/api/duel?action=poll&heroId=${encodeURIComponent(heroId)}`, { method: 'GET' })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { match: null, error: json?.error || 'Falha ao consultar partida' }
    return { match: json?.match || null }
  } catch (err: any) {
    return { match: null, error: err?.message || 'Erro desconhecido ao consultar' }
  }
}

export async function resolveDuelServer(payload: { hero: { id?: string; name: string; hp: number; maxHp: number; armor: number; forca: number; destreza: number; constituicao: number; level?: number }; opponentHero?: any; seed?: number }) {
  try {
    const resp = await fetch('/api/duel?action=resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { ok: false, error: json?.error || 'Falha ao resolver no servidor' }
    return { ok: true, result: json?.result }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erro desconhecido ao resolver' }
  }
}

export async function getDuelHistory(heroId: string): Promise<{ events: { hero_name: string; opponent_name: string; victory: boolean; xp: number; gold: number; created_at: string }[]; error?: string }>{
  try {
    const resp = await fetch(`/api/duel?action=history&heroId=${encodeURIComponent(heroId)}`, { method: 'GET' })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { events: [], error: json?.error || 'Falha ao obter histórico' }
    return { events: (json?.events || []) }
  } catch (err: any) {
    return { events: [], error: err?.message || 'Erro desconhecido ao obter histórico' }
  }
}

export async function getRating(heroId: string): Promise<{ rating: number; error?: string }>{
  try {
    const resp = await fetch(`/api/duel?action=rating-get&heroId=${encodeURIComponent(heroId)}`, { method: 'GET' })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { rating: 1000, error: json?.error || 'Falha ao obter rating' }
    return { rating: Number(json?.rating || 1000) }
  } catch (err: any) {
    return { rating: 1000, error: err?.message || 'Erro desconhecido ao obter rating' }
  }
}

export async function getRatingLeaderboard(): Promise<{ entries: { hero_id: string; hero_name: string; rating: number }[]; error?: string }>{
  try {
    const resp = await fetch('/api/duel?action=rating-leaderboard', { method: 'GET' })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { entries: [], error: json?.error || 'Falha ao obter leaderboard' }
    return { entries: (json?.entries || []) }
  } catch (err: any) {
    return { entries: [], error: err?.message || 'Erro desconhecido ao obter leaderboard' }
  }
}

export async function getMatches(heroId: string): Promise<{ matches: any[]; error?: string }>{
  try {
    const resp = await fetch(`/api/duel?action=matches-get&heroId=${encodeURIComponent(heroId)}`, { method: 'GET' })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { matches: [], error: json?.error || 'Falha ao obter partidas' }
    return { matches: (json?.matches || []) }
  } catch (err: any) {
    return { matches: [], error: err?.message || 'Erro desconhecido ao obter partidas' }
  }
}

export async function startMatch(matchId: string): Promise<{ match: any; error?: string }>{
  try {
    const resp = await fetch('/api/duel?action=match-start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId }) })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { match: null, error: json?.error || 'Falha ao iniciar partida' }
    return { match: json?.match || null }
  } catch (err: any) {
    return { match: null, error: err?.message || 'Erro desconhecido ao iniciar' }
  }
}

export async function completeMatch(payload: { matchId: string; winnerId: string; winnerName?: string; xp?: number; gold?: number; durationMs?: number }): Promise<{ match: any; error?: string }>{
  try {
    const resp = await fetch('/api/duel?action=match-complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await resp.json().catch(()=>({}))
    if (!resp.ok) return { match: null, error: json?.error || 'Falha ao concluir partida' }
    return { match: json?.match || null }
  } catch (err: any) {
    return { match: null, error: err?.message || 'Erro desconhecido ao concluir' }
  }
}

export function subscribeToMatchUpdates(heroId: string, onMatch: (match: any) => void) {
  try {
    const mod = require('../lib/supabaseClient') as any
    const supabase = mod.supabase
    const supabaseConfigured = mod.supabaseConfigured
    if (!supabaseConfigured) return () => {}
    const channel = supabase
      .channel(`duel-matches-${heroId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_matches', filter: `a_id=eq.${heroId}` }, (payload: any) => {
        onMatch(payload?.new || payload?.old || payload)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_matches', filter: `b_id=eq.${heroId}` }, (payload: any) => {
        onMatch(payload?.new || payload?.old || payload)
      })
      .subscribe()
    return () => { try { supabase.removeChannel(channel) } catch {} }
  } catch { return () => {} }
}