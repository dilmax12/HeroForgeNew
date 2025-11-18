import React, { useEffect, useState } from 'react'
import { useHeroStore } from '../store/heroStore'
import { tokens } from '../styles/designTokens'
import { recommendationAI } from '../services/recommendationAI'
import RankProgress from './RankProgress'

type BuildAdvice = {
  attributePriorities: string[]
  skillRecommendations: string[]
  equipmentSuggestions: string[]
  playstyleAdvice: string
}

export default function GuildAdvicePanel() {
  const { getSelectedHero, getHeroRankProgress } = useHeroStore() as any
  const hero = getSelectedHero()
  const [weaknesses, setWeaknesses] = useState<string[]>([])
  const [build, setBuild] = useState<BuildAdvice | null>(null)
  const rankProgress = hero ? getHeroRankProgress(hero.id) : null

  useEffect(() => {
    let cancelled = false
    if (!hero) return
    ;(async () => {
      try {
        const [w, b] = await Promise.all([
          recommendationAI.analyzeHeroWeaknesses(hero),
          recommendationAI.suggestOptimalBuild(hero)
        ])
        if (cancelled) return
        setWeaknesses(w || [])
        setBuild(b || null)
      } catch {
        if (!cancelled) {
          setWeaknesses([])
          setBuild(null)
        }
      }
    })()
    return () => { cancelled = true }
  }, [hero?.id, hero?.progression?.level])

  if (!hero) {
    return (
      <div className={`${tokens.cardBase} border border-gray-700`}>
        <div className="text-center py-8 text-gray-400">
          <div className="text-5xl mb-2">🦸</div>
          <p>Selecione um herói para receber conselhos personalizados.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${tokens.cardBase} border border-gray-700`}>
      <h2 className="text-2xl font-bold mb-4">🧙 Conselhos do Mestre da Guilda</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Progresso de Rank</h3>
          {hero && rankProgress ? (
            <RankProgress hero={hero} progress={rankProgress.progress} showEstimate compact={false} />
          ) : (
            <div className="text-sm text-gray-400">Selecione um herói para ver o progresso de rank.</div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Sugestão de Build</h3>
          {build ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-300"><span className="font-semibold">Prioridades:</span> {build.attributePriorities.join(', ')}</div>
              <div className="text-sm text-gray-300"><span className="font-semibold">Habilidades:</span> {build.skillRecommendations.join(', ')}</div>
              <div className="text-sm text-gray-300"><span className="font-semibold">Equipamentos:</span> {build.equipmentSuggestions.join(', ')}</div>
              <div className="text-sm text-gray-300"><span className="font-semibold">Estilo de jogo:</span> {build.playstyleAdvice}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Construindo recomendações…</div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Pontos Fracos</h3>
          {weaknesses.length ? (
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li key={`weak-${i}`} className="p-2 rounded border bg-gray-900 border-gray-700">{w}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-400">Analisando atributos…</div>
          )}
        </div>
      </div>
    </div>
  )
}