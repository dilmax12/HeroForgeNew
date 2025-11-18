import React, { useEffect, useMemo, useState } from 'react'
import { onboardingManager } from '../utils/onboardingSystem'
import { useNavigate } from 'react-router-dom'
import { getSeasonalButtonGradient, seasonalThemes } from '../styles/medievalTheme'
import { useMonetizationStore } from '../store/monetizationStore'

type Pos = 'top'|'bottom'|'left'|'right'|'center'

const OnboardingOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [position, setPosition] = useState<Pos>('center')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [skippable, setSkippable] = useState(false)
  const navigate = useNavigate()
  const { activeSeasonalTheme } = useMonetizationStore()
  const g = getSeasonalButtonGradient(activeSeasonalTheme as any)
  const accents: string[] = ((seasonalThemes as any)[activeSeasonalTheme || '']?.accents) || []

  const updateFromStep = () => {
    const step = onboardingManager.getCurrentStep()
    if (!step) { setVisible(false); setRect(null); return }
    setTitle(step.title || '')
    setDescription(step.description || '')
    setSkippable(!!step.skippable)
    const pos = (step.position as Pos) || 'center'
    setPosition(pos)
    if (step.targetElement) {
      try {
        const el = document.querySelector(step.targetElement) as HTMLElement | null
        if (el) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }) } catch {}
          const r = el.getBoundingClientRect()
          setRect(r)
          setVisible(true)
        } else {
          setRect(null)
          setVisible(true)
        }
      } catch { setRect(null); setVisible(true) }
    } else {
      setRect(null)
      setVisible(true)
    }
  }

  useEffect(() => {
    updateFromStep()
    const onStep = () => updateFromStep()
    onboardingManager.on('step-changed', onStep)
    onboardingManager.on('step-completed', onStep)
    onboardingManager.on('flow-completed', () => setVisible(false))
    const onResize = () => updateFromStep()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      onboardingManager.off('step-changed', onStep)
      onboardingManager.off('step-completed', onStep)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [])

  const boxStyle = useMemo(() => {
    if (!rect) return { left: '50%', top: '20%', width: 0, height: 0 }
    return { left: `${rect.left + window.scrollX}px`, top: `${rect.top + window.scrollY}px`, width: `${rect.width}px`, height: `${rect.height}px` }
  }, [rect])

  const glowStyle = useMemo(() => {
    if (!rect) return { left: 0, top: 0, width: 0, height: 0 }
    const pad = 12
    return { left: `${rect.left + window.scrollX - pad}px`, top: `${rect.top + window.scrollY - pad}px`, width: `${rect.width + pad * 2}px`, height: `${rect.height + pad * 2}px` }
  }, [rect])

  const arrowStyle = useMemo(() => {
    if (!rect) return { left: '50%', top: '50%' }
    const cx = rect.left + window.scrollX + rect.width / 2
    const cy = rect.top + window.scrollY + rect.height / 2
    if (position === 'top') return { left: `${cx}px`, top: `${rect.top + window.scrollY - 12}px` }
    if (position === 'bottom') return { left: `${cx}px`, top: `${rect.bottom + window.scrollY + 4}px` }
    if (position === 'left') return { left: `${rect.left + window.scrollX - 12}px`, top: `${cy}px` }
    if (position === 'right') return { left: `${rect.right + window.scrollX + 4}px`, top: `${cy}px` }
    return { left: `${cx}px`, top: `${rect.bottom + window.scrollY + 4}px` }
  }, [rect, position])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      <div className="absolute inset-0 bg-black/50" />
      {rect && (
        <>
          <div className="absolute rounded-xl bg-amber-400/10 blur-sm animate-pulse" style={glowStyle} />
          <div className="absolute border-2 border-amber-400 rounded-lg shadow-lg animate-pulse" style={boxStyle} />
        </>
      )}
      {rect && (
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={arrowStyle}>
          {position === 'top' && (<div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-amber-400" />)}
          {position === 'bottom' && (<div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-amber-400" />)}
          {position === 'left' && (<div className="w-0 h-0 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-amber-400" />)}
          {position === 'right' && (<div className="w-0 h-0 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-amber-400" />)}
        </div>
      )}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: position==='top' ? (rect ? rect.top + window.scrollY - 80 : 80) : position==='bottom' ? (rect ? rect.bottom + window.scrollY + 20 : 140) : position==='left' ? (rect ? rect.top + window.scrollY : 160) : position==='right' ? (rect ? rect.top + window.scrollY : 160) : 140 }}>
        <div className="pointer-events-auto max-w-[90vw] sm:max-w-lg px-4 py-3 rounded-xl bg-slate-800 border border-white/20 shadow-xl">
          <div className="text-white font-semibold text-sm mb-1">{title}</div>
          <div className="text-xs text-gray-300 mb-3">{description}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => { const s = onboardingManager.getCurrentStep(); if (s?.action?.type==='navigate' && s.action.target) navigate(s.action.target) }} className={`px-3 py-1 rounded bg-gradient-to-r ${g} text-white text-xs`}>{accents[0] || ''} Ir</button>
            <button onClick={() => { onboardingManager.nextStep() }} className="px-3 py-1 rounded bg-gray-800 text-white text-xs">Avançar</button>
            {skippable && (
              <button onClick={() => { onboardingManager.skipStep() }} className="px-3 py-1 rounded bg-gray-700 text-white text-xs">Pular</button>
            )}
            <button onClick={() => { onboardingManager.reset() }} className="ml-auto px-3 py-1 rounded bg-gray-700 text-white text-xs">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingOverlay