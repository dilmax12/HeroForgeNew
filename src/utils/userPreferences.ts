type Prefs = { autoSuggestDisabled?: boolean }

export function getPrefs(): Prefs {
  try {
    const raw = localStorage.getItem('hfn_prefs')
    if (!raw) return {}
    const obj = JSON.parse(raw)
    return obj || {}
  } catch { return {} }
}

export function setPrefs(p: Prefs) {
  try {
    const existing = getPrefs()
    const next = { ...existing, ...p }
    localStorage.setItem('hfn_prefs', JSON.stringify(next))
  } catch {}
}