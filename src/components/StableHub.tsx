import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const StableHub: React.FC = () => {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  const tabClass = (path: string) => (
    isActive(path)
      ? 'px-3 py-1 rounded bg-amber-700 text-white font-semibold shadow'
      : 'px-3 py-1 rounded hover:bg-amber-800/40 text-amber-200 transition-colors'
  )

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-serif text-amber-300">🐴 Estábulo</h1>
      </div>
      <div className="mb-6 bg-slate-800 border border-slate-600 rounded p-2">
        <div className="flex gap-2">
          <Link to="/stable/pets" className={tabClass('/stable/pets')}>🐾 Mascotes</Link>
          <Link to="/stable/mounts" className={tabClass('/stable/mounts')}>🏇 Montarias</Link>
        </div>
      </div>
      <Outlet />
    </div>
  )
}

export default StableHub