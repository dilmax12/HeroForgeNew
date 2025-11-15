import React from 'react'

type State = { hasError: boolean; error?: any }

export default class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode }, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any): State { return { hasError: true, error } }
  componentDidCatch(error: any, info: any) { console.warn('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 rounded bg-red-900/40 border border-red-700 text-red-200">
          <div className="font-semibold">Ocorreu um erro ao renderizar.</div>
          <div className="text-sm">Tente voltar e abrir a criação novamente.</div>
        </div>
      )
    }
    return this.props.children as any
  }
}