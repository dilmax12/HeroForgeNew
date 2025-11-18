import React from 'react'
import { tokens } from '../../styles/designTokens'

type TabItem = { id: string; label: string; icon?: React.ReactNode }

export default function Tabs({ items, activeId, onChange, size = 'md', className = '' }: { items: TabItem[]; activeId: string; onChange: (id: string) => void; size?: 'sm'|'md'; className?: string }) {
  const pad = size === 'sm' ? 'px-3 py-1' : 'px-3 py-2'
  return (
    <div className={`flex gap-2 ${className} xs:flex-nowrap xs:overflow-x-auto xs:-mx-3 xs:px-3 md:flex-wrap`}>
      {items.map(it => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`${pad} rounded border text-sm ${activeId === it.id ? tokens.tabActive : tokens.tabInactive}`}
        >
          {it.icon ? <span className="mr-2">{it.icon}</span> : null}
          {it.label}
        </button>
      ))}
    </div>
  )
}