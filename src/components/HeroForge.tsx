import React from 'react'
import { Link } from 'react-router-dom'
import { useHeroStore } from '../store/heroStore'
import { BlacksmithNPC } from './BlacksmithNPC'

const HeroForge: React.FC = () => {
  const { getSelectedHero } = useHeroStore()
  const hero = getSelectedHero()
  if (!hero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">⚒️</div>
        <h2 className="text-2xl font-bold text-gray-200 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-400 mb-6">Selecione um herói para acessar a Forja.</p>
        <Link to="/gallery" className="bg-amber-600 text-white px-6 py-2 rounded hover:bg-amber-700 transition-colors">Ver Galeria</Link>
      </div>
    )
  }
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold text-amber-400">Forja do Herói</h2>
        <div className="flex items-center gap-2">
          <Link to={`/shop`} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700">Visitar Loja</Link>
          <Link to={`/inventory`} className="px-3 py-2 rounded bg-amber-600 text-white text-sm hover:bg-amber-700">Ver Inventário</Link>
          <Link to={`/hero/${hero.id}`} className="px-3 py-2 rounded bg-slate-700 text-white text-sm hover:bg-slate-600">Voltar ao Herói</Link>
        </div>
      </div>
      <BlacksmithNPC />
    </div>
  )
}

export default HeroForge