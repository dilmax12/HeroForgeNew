import { createClient } from '@supabase/supabase-js'
import { resolveServerCombat, buildOpponentFromHero } from './duel-combat.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function parseAction(req) {
  try {
    const q = (req.query && (req.query.action || req.query.a)) || null
    if (q) return String(q)
    const u = new URL(req.url, 'http://localhost')
    return u.searchParams.get('action') || u.searchParams.get('a') || null
  } catch { return null }
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase server env ausente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)' })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const action = parseAction(req)
  if (!action) return res.status(400).json({ error: 'Missing action' })

  if (action === 'start') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    let body = req.body
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = ''
          req.on('data', c => { data += c })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        if (raw) body = JSON.parse(raw)
      } catch {}
    }
    const { heroId, heroName, opponentName, mode } = body || {}
    if (!heroId || !heroName || !opponentName) return res.status(400).json({ error: 'Parâmetros inválidos: heroId, heroName, opponentName' })
    try {
      const { error } = await supabase
        .schema('public')
        .from('duel_events')
        .insert({ type: 'start', hero_id: heroId, hero_name: heroName, opponent_name: opponentName, mode: String(mode || '1v1'), created_at: new Date().toISOString() })
      if (error) return res.status(500).json({ error: error.message || 'Falha ao registrar início de duelo' })
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao iniciar duelo' })
    }
  }

  if (action === 'submit') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    let body = req.body
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = ''
          req.on('data', c => { data += c })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        if (raw) body = JSON.parse(raw)
      } catch {}
    }
    const { heroId, heroName, opponentName, victory, xp, gold } = body || {}
    if (!heroId || !heroName || typeof victory !== 'boolean') return res.status(400).json({ error: 'Parâmetros inválidos: heroId, heroName e victory são obrigatórios' })
    const safeXp = Math.max(0, Math.min(5000, Number(xp || 0)))
    const safeGold = Math.max(0, Math.min(100000, Number(gold || 0)))
    try {
      const { error } = await supabase
        .schema('public')
        .from('duel_events')
        .insert({ type: 'result', hero_id: heroId, hero_name: heroName, opponent_name: opponentName || null, victory: !!victory, xp: safeXp, gold: safeGold, created_at: new Date().toISOString() })
      if (error) return res.status(500).json({ error: error.message || 'Falha ao registrar resultado do duelo' })
      return res.status(200).json({ ok: true, result: { victory: !!victory, xp: safeXp, gold: safeGold } })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao registrar resultado' })
    }
  }

  if (action === 'resolve') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    let body = req.body
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = ''
          req.on('data', c => { data += c })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        if (raw) body = JSON.parse(raw)
      } catch {}
    }
    const { hero, opponentHero, seed } = body || {}
    if (!hero || !hero.name || !hero.hp || !hero.maxHp || !hero.forca) {
      return res.status(400).json({ error: 'Dados do herói inválidos' })
    }
    try {
      // Sanitização básica
      const cleanHero = {
        id: hero.id || null,
        name: String(hero.name).slice(0, 64),
        hp: Math.max(1, Math.min(9999, Number(hero.hp) || 1)),
        maxHp: Math.max(1, Math.min(9999, Number(hero.maxHp) || 1)),
        armor: Math.max(0, Math.min(999, Number(hero.armor) || 0)),
        forca: Math.max(0, Math.min(999, Number(hero.forca) || 0)),
        destreza: Math.max(0, Math.min(999, Number(hero.destreza) || 0)),
        constituicao: Math.max(0, Math.min(999, Number(hero.constituicao) || 0)),
        level: Math.max(1, Math.min(100, Number(hero.level) || 1)),
        element: String(hero.element || 'physical')
      }
      const opponent = opponentHero ? buildOpponentFromHero(opponentHero) : undefined
      const result = resolveServerCombat(cleanHero, opponent, seed)
      try {
        await supabase.schema('public').from('duel_events').insert({ type: 'resolved', hero_id: cleanHero.id || null, hero_name: cleanHero.name, opponent_name: opponent?.name || null, victory: !!result.victory, xp: result.xpGained, gold: result.goldGained, created_at: new Date().toISOString() })
      } catch {}
      return res.status(200).json({ ok: true, result })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao resolver combate' })
    }
  }

  if (action === 'weekly') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    try {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .schema('public')
        .from('duel_events')
        .select('hero_name, victory, created_at')
        .gte('created_at', since)
        .limit(2000)
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter eventos' })
      const map = {}
      ;(data || []).forEach(ev => {
        const name = ev.hero_name
        const v = !!ev.victory
        const cur = map[name] || { heroName: name, wins: 0, total: 0 }
        cur.wins += v ? 1 : 0
        cur.total += 1
        map[name] = cur
      })
      const entries = Object.values(map).sort((a,b)=>{
        if (b.wins !== a.wins) return b.wins - a.wins
        return b.total - a.total
      }).slice(0,50)
      return res.status(200).json({ entries })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao gerar ranking semanal' })
    }
  }

  if (action === 'queue') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    let body = req.body
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = ''
          req.on('data', c => { data += c })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        if (raw) body = JSON.parse(raw)
      } catch {}
    }
    const { heroId, heroName } = body || {}
    if (!heroId || !heroName) return res.status(400).json({ error: 'Parâmetros inválidos: heroId e heroName' })
    try {
      await supabase.schema('public').from('duel_queue').delete().lt('created_at', new Date(Date.now() - 3*60*1000).toISOString())
      const ins = await supabase.schema('public').from('duel_queue').insert({ hero_id: heroId, hero_name: heroName, created_at: new Date().toISOString() }).select('*').single()
      if (ins.error) return res.status(500).json({ error: ins.error.message || 'Falha ao enfileirar' })
      const { data: candidates, error } = await supabase.schema('public').from('duel_queue').select('*').neq('hero_id', heroId).gte('created_at', new Date(Date.now()-60*1000).toISOString()).limit(10)
      if (error) return res.status(500).json({ error: error.message || 'Falha ao buscar oponentes' })
      let opponent = (candidates || [])[0]
      if (candidates && candidates.length > 0) {
        try {
          const ids = [heroId, ...candidates.map(c => c.hero_id)]
          const { data: ratings } = await supabase.schema('public').from('duel_ratings').select('hero_id,rating').in('hero_id', ids)
          const ratingMap = {}
          (ratings || []).forEach(r => { ratingMap[r.hero_id] = r.rating })
          const heroR = ratingMap[heroId] || 1000
          let best = candidates[0]
          let bestDiff = Math.abs((ratingMap[best.hero_id] || 1000) - heroR)
          candidates.forEach(c => {
            const diff = Math.abs((ratingMap[c.hero_id] || 1000) - heroR)
            if (diff < bestDiff) { best = c; bestDiff = diff }
          })
          opponent = best
        } catch {}
      }
      if (opponent) {
        const matchIns = await supabase.schema('public').from('duel_matches').insert({ a_id: heroId, a_name: heroName, b_id: opponent.hero_id, b_name: opponent.hero_name, status: 'pending', created_at: new Date().toISOString() }).select('*').single()
        if (matchIns.error) return res.status(500).json({ error: matchIns.error.message || 'Falha ao criar partida' })
        await supabase.schema('public').from('duel_queue').delete().eq('hero_id', heroId)
        await supabase.schema('public').from('duel_queue').delete().eq('hero_id', opponent.hero_id)
        return res.status(200).json({ matched: true, match: matchIns.data })
      }
      return res.status(200).json({ matched: false })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao enfileirar' })
    }
  }

  if (action === 'match-start') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    let body = req.body
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = ''
          req.on('data', c => { data += c })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        if (raw) body = JSON.parse(raw)
      } catch {}
    }
    const { matchId } = body || {}
    if (!matchId) return res.status(400).json({ error: 'Missing matchId' })
    try {
      const { data, error } = await supabase.schema('public').from('duel_matches').update({ status: 'started', started_at: new Date().toISOString() }).eq('id', matchId).select('*').single()
      if (error) return res.status(500).json({ error: error.message || 'Falha ao iniciar partida' })
      return res.status(200).json({ match: data })
    } catch (err) { return res.status(500).json({ error: 'Erro ao iniciar partida' }) }
  }

  if (action === 'match-complete') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    let body = req.body
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      try {
        const raw = await new Promise((resolve, reject) => {
          let data = ''
          req.on('data', c => { data += c })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        if (raw) body = JSON.parse(raw)
      } catch {}
    }
    const { matchId, winnerId, winnerName, xp = 0, gold = 0, durationMs = 0 } = body || {}
    if (!matchId || !winnerId) return res.status(400).json({ error: 'Missing matchId or winnerId' })
    try {
      const safeXp = Math.max(0, Math.min(5000, Number(xp)))
      const safeGold = Math.max(0, Math.min(100000, Number(gold)))
      const safeDur = Math.max(0, Math.min(24*60*60*1000, Number(durationMs)))
      const up = await supabase.schema('public').from('duel_matches').update({ status: 'completed', winner_id: winnerId, winner_name: winnerName || null, duration_ms: safeDur, completed_at: new Date().toISOString() }).eq('id', matchId).select('*').single()
      if (up.error) return res.status(500).json({ error: up.error.message || 'Falha ao concluir partida' })
      const m = up.data
      if (m) {
        const aWin = m.a_id === winnerId
        const bWin = m.b_id === winnerId
        const evs = []
        evs.push({ type: 'match_complete', hero_id: m.a_id, hero_name: m.a_name, opponent_name: m.b_name, victory: aWin, xp: safeXp, gold: safeGold, created_at: new Date().toISOString() })
        evs.push({ type: 'match_complete', hero_id: m.b_id, hero_name: m.b_name, opponent_name: m.a_name, victory: bWin, xp: safeXp, gold: safeGold, created_at: new Date().toISOString() })
        await supabase.schema('public').from('duel_events').insert(evs)

        const defRating = 1000
        const getRating = async (id, name) => {
          const { data, error } = await supabase.schema('public').from('duel_ratings').select('*').eq('hero_id', id).limit(1)
          if (error) return { hero_id: id, hero_name: name || null, rating: defRating }
          const row = Array.isArray(data) && data[0]
          return row || { hero_id: id, hero_name: name || null, rating: defRating }
        }
        const a = await getRating(m.a_id, m.a_name)
        const b = await getRating(m.b_id, m.b_name)
        const expectedA = 1 / (1 + Math.pow(10, (b.rating - a.rating) / 400))
        const expectedB = 1 / (1 + Math.pow(10, (a.rating - b.rating) / 400))
        const k = 32
        const scoreA = aWin ? 1 : 0
        const scoreB = bWin ? 1 : 0
        const nextA = Math.max(0, Math.round(a.rating + k * (scoreA - expectedA)))
        const nextB = Math.max(0, Math.round(b.rating + k * (scoreB - expectedB)))
        await supabase.schema('public').from('duel_ratings').upsert([{ hero_id: m.a_id, hero_name: m.a_name, rating: nextA, updated_at: new Date().toISOString() }, { hero_id: m.b_id, hero_name: m.b_name, rating: nextB, updated_at: new Date().toISOString() }], { onConflict: 'hero_id' })
      }
      return res.status(200).json({ match: up.data })
    } catch (err) { return res.status(500).json({ error: 'Erro ao concluir partida' }) }
  }

  if (action === 'rating-get') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    try {
      const u = new URL(req.url, 'http://localhost')
      const heroId = u.searchParams.get('heroId')
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' })
      const { data, error } = await supabase.schema('public').from('duel_ratings').select('*').eq('hero_id', heroId).limit(1)
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter rating' })
      const row = Array.isArray(data) && data[0]
      return res.status(200).json({ rating: row ? row.rating : 1000 })
    } catch (err) { return res.status(500).json({ error: 'Erro ao obter rating' }) }
  }

  if (action === 'rating-leaderboard') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    try {
      const { data, error } = await supabase.schema('public').from('duel_ratings').select('hero_id, hero_name, rating').order('rating', { ascending: false }).limit(50)
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter leaderboard' })
      return res.status(200).json({ entries: Array.isArray(data) ? data : [] })
    } catch (err) { return res.status(500).json({ error: 'Erro ao obter leaderboard' }) }
  }

  if (action === 'matches-get') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    try {
      const u = new URL(req.url, 'http://localhost')
      const heroId = u.searchParams.get('heroId')
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' })
      const { data, error } = await supabase.schema('public').from('duel_matches').select('*').or(`a_id.eq.${heroId},b_id.eq.${heroId}`).order('created_at', { ascending: false }).limit(20)
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter partidas' })
      return res.status(200).json({ matches: Array.isArray(data) ? data : [] })
    } catch (err) { return res.status(500).json({ error: 'Erro ao obter partidas' }) }
  }

  if (action === 'poll') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    try {
      const u = new URL(req.url, 'http://localhost')
      const heroId = u.searchParams.get('heroId')
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' })
      const { data, error } = await supabase.schema('public').from('duel_matches').select('*').or(`a_id.eq.${heroId},b_id.eq.${heroId}`).order('created_at', { ascending: false }).limit(1)
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter partidas' })
      const match = Array.isArray(data) ? data[0] : null
      if (!match) return res.status(200).json({ match: null })
      return res.status(200).json({ match })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao pesquisar partida' })
    }
  }

  if (action === 'history') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    try {
      const u = new URL(req.url, 'http://localhost')
      const heroId = u.searchParams.get('heroId')
      if (!heroId) return res.status(400).json({ error: 'Missing heroId' })
      const { data, error } = await supabase
        .schema('public')
        .from('duel_events')
        .select('hero_name, opponent_name, victory, xp, gold, created_at')
        .eq('hero_id', heroId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) return res.status(500).json({ error: error.message || 'Falha ao obter histórico' })
      return res.status(200).json({ events: Array.isArray(data) ? data : [] })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao obter histórico' })
    }
  }

  return res.status(400).json({ error: 'Ação inválida' })
}