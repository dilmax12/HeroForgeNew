export default async function handler(req, res) {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return res.json({ ok: true, skipped: true })
    const sb = createClient(url, serviceKey)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0,0,0,0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const mutators = [
      { id: 'mutador_inimigos_fogo', name: 'Todos os inimigos são de fogo', modifiers: { enemy_element: 'fire' } },
      { id: 'mutador_critico_global', name: '+30% crítico global', modifiers: { global_crit_bonus: 0.3 } },
      { id: 'mutador_missoes_meia_stamina', name: 'Missões custam metade da stamina', modifiers: { mission_stamina_cost_multiplier: 0.5 } }
    ]
    const pick = mutators[Math.floor(Math.random() * mutators.length)]
    await sb.from('weekly_mutators').update({ active: false }).eq('active', true)
    const payload = { id: pick.id, name: pick.name, modifiers: pick.modifiers, week_start: weekStart.toISOString(), week_end: weekEnd.toISOString(), active: true }
    const { error: upErr } = await sb.from('weekly_mutators').upsert(payload)
    if (upErr) return res.status(500).json({ error: upErr.message })
    const events = [
      { id: 'evento_lua_sangue', name: 'Lua de Sangue', type: 'world', modifiers: { enemy_damage_multiplier: 1.2, rare_item_chance: 0.2 }, starts_at: now.toISOString(), ends_at: new Date(now.getTime() + 2*60*60*1000).toISOString(), approved: true },
      { id: 'evento_oracao_clero', name: 'Oração do Clero', type: 'world', modifiers: { enemy_damage_multiplier: 0.9 }, starts_at: now.toISOString(), ends_at: new Date(now.getTime() + 60*60*1000).toISOString(), approved: true }
    ]
    for (const ev of events) { await sb.from('global_events').upsert(ev) }
    return res.json({ ok: true, mutator: payload, eventsCount: events.length })
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || 'erro') })
  }
}