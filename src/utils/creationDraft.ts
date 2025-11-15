import { HeroCreationData } from '../types/hero'

const KEY = 'hfn_creation_draft'

export function saveDraft(d: Partial<HeroCreationData>) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {}
}

export function loadDraft(): Partial<HeroCreationData> | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}

export function clearDraft() {
  try { localStorage.removeItem(KEY) } catch {}
}