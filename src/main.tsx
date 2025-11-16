import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Configuração dinâmica do basename para diferentes ambientes
const getBasename = () => {
  // Detectar se estamos no GitHub Pages
  if (window.location.hostname === 'dilmax12.github.io') {
    return '/HeroForgeNew'
  }
  // Para Vercel e outros ambientes (incluindo localhost)
  return '/'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter
      basename={getBasename()}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

const initAnalytics = () => {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (!id) return
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(script)
  const inline = document.createElement('script')
  inline.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js', new Date());gtag('config','${id}');`
  document.head.appendChild(inline)
}

if (import.meta.env.PROD) {
  initAnalytics()
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  }
}
