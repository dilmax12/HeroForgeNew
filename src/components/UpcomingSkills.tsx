import React from 'react'
import { useHeroStore } from '../store/heroStore'
import { PROGRESSION_SKILLS } from '../utils/skillSystem'

export default function UpcomingSkills() {
  const hero = useHeroStore(s => s.getSelectedHero())
  if (!hero) return null
  const defs = PROGRESSION_SKILLS[hero.class as any] || []
  const level = hero.progression.level
  const upcoming = defs.filter(d => d.level > level)
  if (upcoming.length === 0) return null
  return (
    <div className="mt-6 p-4 rounded bg-gray-700">
      <div className="text-white font-semibold">Próximas Habilidades</div>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
        {upcoming.map(d => (
          <div key={`up-${d.level}`} className="p-3 rounded bg-gray-800 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-amber-300 text-sm">Nível {d.level}</div>
              <div className="text-xs text-gray-300">Faltam {Math.max(0, d.level - level)} níveis</div>
            </div>
            <ul className="mt-1 text-xs text-gray-300">
              {d.skills.map(s => (<li key={s.id}>{s.name} — {s.type}{s.element ? ` • ${s.element}` : ''}</li>))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

