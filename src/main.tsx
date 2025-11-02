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
    <BrowserRouter basename={getBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
