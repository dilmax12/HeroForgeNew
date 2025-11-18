import React from 'react'
import { Link } from 'react-router-dom'
import { useHeroStore } from '../store/heroStore'
import { useProgressionStore } from '../store/progressionStore'

export const BlockedView: React.FC<{ feature: 'hunting_basic' | 'shop_basic' | 'crafting_simple' | 'stable_basic' }> = ({ feature }) => {
  const { getSelectedHero } = useHeroStore()
  const hero = getSelectedHero()
  const status = useProgressionStore(s => s.getGateStatus)(feature, hero)
  return (
    <div className="max-w-3xl mx-auto p-6 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Recurso bloqueado</h2>
      <p className="text-gray-600 mb-1">{status.reason || 'Progresso insuficiente'}</p>
      <div className="text-xs text-gray-500 mb-6">{status.nextHint}</div>
      {status.nextHint && <p className="text-gray-500 mb-6">{status.nextHint}</p>}
      <div className="flex gap-3 justify-center">
        <Link to="/training" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors">Ir treinar</Link>
        <Link to="/evolution" className="bg-amber-600 text-black px-6 py-2 rounded hover:bg-amber-700 transition-colors">Ver evolução</Link>
      </div>
    </div>
  )
}

export const FeatureGate: React.FC<{ feature: 'hunting_basic' | 'shop_basic' | 'crafting_simple' | 'stable_basic'; children: React.ReactNode }> = ({ feature, children }) => {
  const { getSelectedHero } = useHeroStore()
  const hero = getSelectedHero()
  const enabled = useProgressionStore(s => s.isFeatureEnabled)(feature, hero)
  if (!enabled) return <BlockedView feature={feature} />
  return <>{children}</>
}