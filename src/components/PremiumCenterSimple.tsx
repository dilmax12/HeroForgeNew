import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { trackMetric } from '../utils/metricsSystem'
import { useMonetizationStore } from '../store/monetizationStore'
import { verifyPurchase } from '../services/paymentsService'
import { notificationBus } from './NotificationSystem'

const PremiumCenter: React.FC = () => {
  const { markPurchase, removeAdsForever, setActiveTheme, setActiveFrame, seasonPassActive, adsRemoved, ownedThemes, ownedFrames, activeThemeId, activeFrameId } = useMonetizationStore()
  const priceRemoveAds = import.meta.env.VITE_PRICE_REMOVE_ADS || ''
  const priceSeasonPass = import.meta.env.VITE_PRICE_SEASON_PASS || ''
  const priceThemeMedieval = import.meta.env.VITE_PRICE_THEME_MEDIEVAL || ''
  const priceFrameOrnate = import.meta.env.VITE_PRICE_FRAME_ORNATE || ''
  const fmt = (() => {
    try {
      const loc = (import.meta.env.VITE_LOCALE || 'pt-BR') as string
      const cur = (import.meta.env.VITE_CURRENCY || 'BRL') as string
      return new Intl.NumberFormat(loc, { style: 'currency', currency: cur })
    } catch { return null }
  })()
  const valRemoveAds = Number(import.meta.env.VITE_PRICE_REMOVE_ADS_VALUE || '0')
  const valSeasonPass = Number(import.meta.env.VITE_PRICE_SEASON_PASS_VALUE || '0')
  const valThemeMedieval = Number(import.meta.env.VITE_PRICE_THEME_MEDIEVAL_VALUE || '0')
  const valFrameOrnate = Number(import.meta.env.VITE_PRICE_FRAME_ORNATE_VALUE || '0')
  const displayPrice = (txt: string, val: number) => fmt && val > 0 ? fmt.format(val) : (txt || '')
  const [statusMsg, setStatusMsg] = useState<string>('')
  useEffect(() => {
    trackMetric.pageVisited('system', '/premium')
    trackMetric.featureUsed('system', 'premium-center-open')
  }, [])
  useEffect(() => {
    (async () => {
      try {
        const p = new URLSearchParams(window.location.search)
        const checkout = p.get('checkout')
        const sid = p.get('sid')
        const prod = p.get('p') || ''
        if (checkout === 'success' && sid) {
          const v = await verifyPurchase(sid)
          if (v.ok) {
            markPurchase(prod || 'premium', { id: sid })
            if (prod === 'remove-ads') {
              removeAdsForever()
            } else if (prod.startsWith('theme-')) {
              setActiveTheme(prod.replace('theme-',''))
            } else if (prod.startsWith('frame-')) {
              setActiveFrame(prod.replace('frame-',''))
            } else if (prod === 'season-pass') {
              // já ativado via store quando comprado; reforço visual
            }
            trackMetric.purchaseCompleted('system', prod || 'premium', sid)
            setStatusMsg('Compra concluída com sucesso. Obrigado pelo apoio!')
          } else {
            setStatusMsg('Falha ao verificar compra. Tente novamente.')
          }
        } else if (checkout === 'cancel') {
          setStatusMsg('Pagamento cancelado.')
        }
      } catch {}
    })()
  }, [])
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-amber-300 mb-2">Centro Premium</h1>
      {statusMsg && <div className="text-sm text-emerald-300 mb-3">{statusMsg}</div>}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/20 bg-white/5 p-3">
          <div className="text-sm text-gray-200">Status</div>
          <div className="text-xs text-gray-300 mt-1">Premium: {seasonPassActive?.active ? 'Ativo' : 'Inativo'}</div>
          <div className="text-xs text-gray-300">Ads: {adsRemoved ? 'Removidos' : 'Ativos'}</div>
          <div className="text-xs text-gray-300">Tema ativo: {activeThemeId || '-'}</div>
          <div className="text-xs text-gray-300">Frame ativo: {activeFrameId || '-'}</div>
        </div>
        <div className="rounded-lg border border-white/20 bg-white/5 p-3">
          <div className="text-sm text-gray-200">Cosméticos</div>
          <div className="text-xs text-gray-300 mt-1">Temas: {(ownedThemes || []).length}</div>
          <div className="text-xs text-gray-300">Frames: {(ownedFrames || []).length}</div>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-indigo-500/40 bg-indigo-900/10 p-3">
          <div className="text-sm text-indigo-200">Ações rápidas (Tema)</div>
          <select
            value={activeThemeId || ''}
            onChange={e => { const v = e.target.value || undefined; setActiveTheme(v); try { trackMetric.featureUsed('system', 'theme-switch'); } catch {}; try { notificationBus.publish({ id: `theme-${Date.now()}`, type: 'info', title: 'Tema aplicado', message: `Tema ${v || ''} ativo`, timeoutMs: 3000 }); } catch {} }}
            className="mt-2 w-full border border-indigo-700 bg-indigo-950 text-indigo-100 text-xs rounded p-2"
          >
            <option value="">Selecionar</option>
            {(ownedThemes || []).map(t => (<option key={t} value={t}>{t}</option>))}
          </select>
        </div>
        <div className="rounded-lg border border-cyan-500/40 bg-cyan-900/10 p-3">
          <div className="text-sm text-cyan-200">Ações rápidas (Frame)</div>
          <select
            value={activeFrameId || ''}
            onChange={e => { const v = e.target.value || undefined; setActiveFrame(v); try { trackMetric.featureUsed('system', 'frame-switch'); } catch {}; try { notificationBus.publish({ id: `frame-${Date.now()}`, type: 'info', title: 'Frame aplicado', message: `Frame ${v || ''} ativo`, timeoutMs: 3000 }); } catch {} }}
            className="mt-2 w-full border border-cyan-700 bg-cyan-950 text-cyan-100 text-xs rounded p-2"
          >
            <option value="">Selecionar</option>
            {(ownedFrames || []).map(f => (<option key={f} value={f}>{f}</option>))}
          </select>
        </div>
      </div>
      <div className="mb-6">
        <Link to="/shop" className="inline-block px-3 py-2 rounded bg-amber-600 text-white text-sm hover:bg-amber-700">Abrir Loja</Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-amber-500/40 bg-amber-900/10 p-4">
          <div className="text-lg font-semibold text-amber-300 mb-1">Remover Anúncios</div>
          <div className="text-xs text-amber-200 mb-3">Experiência sem anúncios em todo o jogo</div>
          <div className="text-xs text-amber-200 mb-2">{displayPrice(priceRemoveAds, valRemoveAds)}</div>
          <button
            onClick={async () => { try { trackMetric.purchaseInitiated('system', 'remove-ads') } catch {}; const resp = await import('../services/paymentsService'); await resp.startCheckout('remove-ads'); }}
            disabled={adsRemoved}
            className={`px-3 py-2 rounded text-sm ${adsRemoved ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
          >{adsRemoved ? 'Comprado' : 'Comprar'}</button>
        </div>
        <div className="rounded-lg border border-pink-500/40 bg-pink-900/10 p-4">
          <div className="text-lg font-semibold text-pink-300 mb-1">Season Pass</div>
          <div className="text-xs text-pink-200 mb-3">Recompensas sazonais, cosméticos e bônus</div>
          <div className="text-xs text-pink-200 mb-2">{displayPrice(priceSeasonPass, valSeasonPass)}</div>
          <button
            onClick={async () => { try { trackMetric.purchaseInitiated('system', 'season-pass') } catch {}; const resp = await import('../services/paymentsService'); await resp.startCheckout('season-pass'); }}
            disabled={!!seasonPassActive?.active}
            className={`px-3 py-2 rounded text-sm ${seasonPassActive?.active ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-pink-600 text-white hover:bg-pink-700'}`}
          >{seasonPassActive?.active ? 'Ativo' : 'Comprar'}</button>
        </div>
        <div className="rounded-lg border border-indigo-500/40 bg-indigo-900/10 p-4">
          <div className="text-lg font-semibold text-indigo-300 mb-1">Tema Medieval</div>
          <div className="text-xs text-indigo-200 mb-3">Paleta e decoração temática</div>
          <div className="text-xs text-indigo-200 mb-2">{displayPrice(priceThemeMedieval, valThemeMedieval)}</div>
          <button
            onClick={async () => { try { trackMetric.purchaseInitiated('system', 'theme-medieval') } catch {}; const resp = await import('../services/paymentsService'); await resp.startCheckout('theme-medieval'); }}
            disabled={(ownedThemes || []).includes('medieval')}
            className={`px-3 py-2 rounded text-sm ${((ownedThemes || []).includes('medieval')) ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >{((ownedThemes || []).includes('medieval')) ? (activeThemeId === 'medieval' ? 'Ativo' : 'Comprado') : 'Comprar'}</button>
        </div>
        <div className="rounded-lg border border-cyan-500/40 bg-cyan-900/10 p-4">
          <div className="text-lg font-semibold text-cyan-300 mb-1">Frame Ornado</div>
          <div className="text-xs text-cyan-200 mb-3">Moldura estilizada para UI</div>
          <div className="text-xs text-cyan-200 mb-2">{displayPrice(priceFrameOrnate, valFrameOrnate)}</div>
          <button
            onClick={async () => { try { trackMetric.purchaseInitiated('system', 'frame-ornate') } catch {}; const resp = await import('../services/paymentsService'); await resp.startCheckout('frame-ornate'); }}
            disabled={(ownedFrames || []).includes('ornate')}
            className={`px-3 py-2 rounded text-sm ${((ownedFrames || []).includes('ornate')) ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
          >{((ownedFrames || []).includes('ornate')) ? (activeFrameId === 'ornate' ? 'Ativo' : 'Comprado') : 'Comprar'}</button>
        </div>
      </div>
    </div>
  )
}

export default PremiumCenter