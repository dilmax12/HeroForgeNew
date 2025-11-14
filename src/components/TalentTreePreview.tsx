import React, { useState } from 'react'
import { HeroClass, Skill } from '../types/hero'
import { PROGRESSION_SKILLS } from '../utils/skillSystem'

export default function TalentTreePreview({ heroClass, plannedTalents = [], onToggle, currentLevel = 1 }: { heroClass: HeroClass; plannedTalents?: string[]; onToggle?: (skillId: string) => void; currentLevel?: number }) {
  const defs = PROGRESSION_SKILLS[heroClass] || []
  const [selected, setSelected] = useState<{ level: number; skill: Skill } | null>(null)
  return (
    <div className="p-4 rounded bg-gray-700">
      <div className="text-white font-semibold">Próximas Habilidades</div>
      {defs.length === 0 && (
        <div className="text-xs text-gray-300 mt-1">Nenhuma habilidade definida para esta classe.</div>
      )}
      {defs.length > 0 && (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          {defs.map(d => (
            <div key={`${heroClass}-${d.level}`} className="p-3 rounded bg-gray-800 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="text-amber-300 text-sm">Nível {d.level}</div>
              <div className={`text-xs ${currentLevel >= d.level ? 'text-emerald-300' : 'text-gray-400'}`}>{currentLevel >= d.level ? 'Disponível' : `Disponível no Nível ${d.level}`}</div>
              </div>
              <div className="mt-1 h-2 bg-gray-700 rounded">
                <div
                  className="h-2 bg-amber-500 rounded"
                  style={{ width: `${Math.min(100, Math.floor((currentLevel / d.level) * 100))}%` }}
                />
              </div>
              <ul className="mt-1 text-xs text-gray-300">
                {d.skills.map((s: Skill) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelected({ level: d.level, skill: s })}
                      className={`w-full text-left px-2 py-1 rounded ${selected?.skill.id === s.id ? 'bg-gray-700 text-white' : 'hover:bg-gray-700'}`}
                      aria-pressed={selected?.skill.id === s.id}
                    >
                      {s.name} — {s.type}{s.element ? ` • ${s.element}` : ''}{s.cooldown ? ` • CD ${s.cooldown}` : ''}
                    </button>
                  </li>
                ))}
              </ul>
              {selected && selected.level === d.level && (
                <div className="mt-2 p-2 rounded bg-gray-700 text-xs text-gray-200">
                  <div className="text-white font-semibold">{selected.skill.name}</div>
                  <div>Tipo: {selected.skill.type}{selected.skill.element ? ` • ${selected.skill.element}` : ''}</div>
                  {selected.skill.description && <div className="mt-1">{selected.skill.description}</div>}
                  {typeof selected.skill.cost === 'number' && <div>Custo: {selected.skill.cost}</div>}
                  {typeof selected.skill.cooldown === 'number' && <div>Cooldown: {selected.skill.cooldown} turnos</div>}
                  <div className="mt-1">Pré-requisito: atingir nível {d.level}</div>
                  {onToggle && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onToggle(selected.skill.id)}
                        className={`px-2 py-1 rounded ${plannedTalents.includes(selected.skill.id) ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                      >
                        {plannedTalents.includes(selected.skill.id) ? '✓ Planejada' : 'Planejar talento'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
