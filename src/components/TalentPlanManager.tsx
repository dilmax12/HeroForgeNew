import React from 'react'
import { useHeroStore } from '../store/heroStore'
import { PROGRESSION_SKILLS } from '../utils/skillSystem'
import { getRecommendedTalentPlan } from '../utils/talentRecommendations'

export default function TalentPlanManager() {
  const hero = useHeroStore(s => s.getSelectedHero())
  const updateHero = useHeroStore(s => s.updateHero)
  if (!hero) return null
  const defs = PROGRESSION_SKILLS[hero.class as any] || []
  const planned = hero.plannedTalents || []
  const toggle = (id: string) => {
    const next = planned.includes(id) ? planned.filter(x => x !== id) : [...planned, id]
    updateHero(hero.id, { plannedTalents: next })
  }
  const unlockedPlanned = planned.filter(id => (hero.skills || []).find(s => (s as any).id === id)).length
  return (
    <div className="mt-6 p-4 rounded bg-gray-700">
      <div className="text-white font-semibold">Planejamento de Talentos</div>
      <div className="text-xs text-gray-300">Planejados: {planned.length} • Desbloqueados: {unlockedPlanned}</div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => updateHero(hero.id, { plannedTalents: getRecommendedTalentPlan(hero.class as any) })} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700">Aplicar plano sugerido</button>
        <button
          type="button"
          onClick={() => updateHero(hero.id, { plannedTalents: [] })}
          className="px-2 py-1 rounded bg-gray-600 text-white text-xs hover:bg-gray-700"
        >
          Limpar plano
        </button>
      </div>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
        {defs.map(d => (
          <div key={`tpl-${d.level}`} className="p-3 rounded bg-gray-800 border border-gray-700">
            <div className="text-amber-300 text-sm">Nível {d.level}</div>
            <ul className="mt-1 text-xs text-gray-300">
              {d.skills.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={`px-2 py-1 rounded ${planned.includes(s.id) ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                  >
                    {planned.includes(s.id) ? '✓' : '+'} {s.name}
                  </button>
                  <span className="ml-2 text-gray-400">{(hero.skills || []).find(sk => (sk as any).id === s.id) ? 'Desbloqueada' : 'Pendente'}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}