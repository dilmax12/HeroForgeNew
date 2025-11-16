import React, { useMemo, useState } from 'react'
import { analyzeContext, generateVariants, applyFeedback } from '../services/narrativeGenerator'
import { useHeroStore } from '../store/heroStore'

const tones = ['sombrio', 'épico', 'misterioso'] as const
const modes = ['ambientacao', 'dialogo', 'missao'] as const

export const NarrativeGeneratorPanel: React.FC = () => {
  const { setDMOverrideLine, appendJourneyNarrativeForSelected } = useHeroStore()
  const [base, setBase] = useState('Eco do passado: o corredor escurece e as runas respiram.')
  const [tone, setTone] = useState<typeof tones[number]>('sombrio')
  const [mode, setMode] = useState<typeof modes[number]>('ambientacao')
  const [count, setCount] = useState(4)
  const [minU, setMinU] = useState(0.6)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [variants, setVariants] = useState<Array<{ text: string; scores: { uniqueness: number; coherence: number; adequacy: number; quality: number } }>>([])
  const [feedbackStrength, setFeedbackStrength] = useState('Altharion, lenda, Guilda')
  const [feedbackWeaken, setFeedbackWeaken] = useState('brumas')

  const ctx = useMemo(() => {
    const analyzed = analyzeContext(base)
    return { ...analyzed, tone, mode }
  }, [base, tone, mode])

  async function onGenerate(useAI = true) {
    setLoading(true)
    setError(null)
    try {
      const res = await generateVariants(ctx, Math.max(1, Math.min(8, count)), { useAI, minUniqueness: minU })
      setVariants(res)
    } catch (e: any) {
      setError(e?.message || 'Falha ao gerar narrativas')
    } finally {
      setLoading(false)
    }
  }

  function onApplyFeedback() {
    const strengthen = feedbackStrength.split(',').map(s => s.trim()).filter(Boolean)
    const weaken = feedbackWeaken.split(',').map(s => s.trim()).filter(Boolean)
    const adjusted = applyFeedback(variants, { strengthen, weaken })
    setVariants(adjusted)
  }

  return (
    <div className="mt-6 p-4 rounded bg-slate-800 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-amber-300">Gerador Narrativo (IA)</h3>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700" onClick={() => onGenerate(true)} disabled={loading}>Gerar com IA</button>
          <button className="px-3 py-1 rounded bg-slate-600 text-white text-sm hover:bg-slate-500" onClick={() => onGenerate(false)} disabled={loading}>Gerar local</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Contexto</label>
          <textarea className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200" rows={3} value={base} onChange={e => setBase(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Tom</label>
            <select className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200" value={tone} onChange={e => setTone(e.target.value as any)}>
              {tones.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Modo</label>
            <select className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200" value={mode} onChange={e => setMode(e.target.value as any)}>
              {modes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Variações</label>
            <input type="number" min={1} max={8} className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200" value={count} onChange={e => setCount(parseInt(e.target.value || '4'))} />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Unicidade mínima</label>
            <input type="number" step={0.05} min={0.3} max={0.9} className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200" value={minU} onChange={e => setMinU(parseFloat(e.target.value || '0.6'))} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Reforçar termos</label>
          <input className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200" value={feedbackStrength} onChange={e => setFeedbackStrength(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Atenuar termos</label>
          <input className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-slate-200" value={feedbackWeaken} onChange={e => setFeedbackWeaken(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <button className="px-3 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700" onClick={onApplyFeedback} disabled={variants.length === 0}>Aplicar feedback</button>
        {loading && <span className="text-slate-300 text-sm">Gerando...</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {variants.map((v, idx) => (
          <div key={idx} className="p-3 rounded bg-slate-900 border border-slate-700">
            <div className="text-sm text-slate-400 mb-2">Variante {idx + 1}</div>
            <p className="text-slate-100 whitespace-pre-line">{v.text}</p>
            <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-slate-300">
              <div>U: {(v.scores.uniqueness).toFixed(2)}</div>
              <div>C: {(v.scores.coherence).toFixed(2)}</div>
              <div>A: {(v.scores.adequacy).toFixed(2)}</div>
              <div>Q: {(v.scores.quality).toFixed(2)}</div>
            </div>
            <div className="mt-2 flex gap-2">
              <button className="px-2 py-1 rounded bg-amber-600 text-white text-xs hover:bg-amber-700" onClick={() => setDMOverrideLine(v.text)}>Usar como fala</button>
              <button className="px-2 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700" onClick={() => appendJourneyNarrativeForSelected(v.text, 'Crônica Gerada')}>Guardar capítulo</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NarrativeGeneratorPanel