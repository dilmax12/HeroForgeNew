import { Hero } from '../types/hero'

const KEY = 'hero_slots_state'

type SlotsState = {
  baseSlots: number
  purchasedSlots: number
  purchases: Array<{ ts: number; price: number }>
  basePrice: number
  incrementPercent: number
}

function load(): SlotsState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { baseSlots: 3, purchasedSlots: 0, purchases: [], basePrice: 100, incrementPercent: 0.25 }
}

function save(s: SlotsState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

export function getBaseSlots() { return load().baseSlots }

export function setPricing(basePrice: number, incrementPercent: number) {
  const s = load()
  s.basePrice = Math.max(1, Math.floor(basePrice))
  s.incrementPercent = Math.max(0, incrementPercent)
  save(s)
}

export function getPurchasedSlots() { return Math.min(5, load().purchasedSlots) }

export function getProgressionSlots(heroes: Hero[]): number {
  const ranks = (heroes || []).map(h => (h as any)?.rankData?.currentRank || 'F')
  const hasB = ranks.some(r => r >= 'B')
  const hasS = ranks.some(r => r >= 'S')
  let slots = 0
  if (hasB) slots += 1
  if (hasS) slots += 1
  return slots
}

export function getCapacity(heroes: Hero[]): number {
  const s = load()
  const cap = s.baseSlots + getProgressionSlots(heroes) + Math.min(5, s.purchasedSlots)
  return Math.min(10, cap)
}

export function getUsed(heroes: Hero[]): number {
  return (heroes || []).filter(h => h.origin !== 'npc').length
}

export function canCreateHero(heroes: Hero[]): boolean {
  return getUsed(heroes) < getCapacity(heroes)
}

export function getNextSlotPrice(): number {
  const s = load()
  const n = Math.min(5, s.purchasedSlots)
  const price = Math.round(s.basePrice * Math.pow(1 + s.incrementPercent, n))
  return price
}

export function purchaseSlot(spendGold: (amount: number) => boolean): boolean {
  const s = load()
  if (s.purchasedSlots >= 5) return false
  const price = getNextSlotPrice()
  const ok = spendGold(price)
  if (!ok) return false
  s.purchasedSlots += 1
  s.purchases.push({ ts: Date.now(), price })
  save(s)
  return true
}