import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Configuração dinâmica do basename para diferentes ambientes
const getBasename = () => {
  // Para GitHub Pages - verificar múltiplas condições
  if (import.meta.env.VITE_GITHUB_PAGES === 'true' || 
      window.location.hostname === 'dilmax12.github.io') {
    return '/HeroForgeNew'
  }
  // Para ambiente de desenvolvimento ou outros ambientes
  return '/'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={getBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
