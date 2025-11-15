import { HeroCreationData } from '../types/hero'
import { CLASS_METADATA } from './classRegistry'
import { calculateRemainingPoints } from './attributeSystem'
import { getRecommendedElements } from './elementSystem'

export type ChecklistItem = { label: string; status: 'ok'|'warn'|'error'; detail?: string }

export function buildChecklist(data: HeroCreationData): ChecklistItem[] {
  const items: ChecklistItem[] = []
  const rem = calculateRemainingPoints(data.attributes)
  items.push({ label: 'Atributos', status: rem === 0 ? 'ok' : rem > 0 ? 'warn' : 'error', detail: rem === 0 ? 'Distribuição completa' : `Restantes: ${rem}` })
  const meta = CLASS_METADATA[data.class]
  if (meta?.requirements) {
    const check = meta.requirements({ alignment: data.alignment as any, attributes: data.attributes, race: data.race })
    items.push({ label: 'Requisitos de Classe', status: check.ok ? 'ok' : 'error', detail: check.ok ? 'OK' : (check.message || 'Pendentes') })
  } else {
    items.push({ label: 'Requisitos de Classe', status: 'ok', detail: 'OK' })
  }
  const recEls = getRecommendedElements(data.class, data.race)
  const hasElem = recEls.includes(data.element)
  items.push({ label: 'Sinergia de Elemento', status: hasElem ? 'ok' : 'warn', detail: hasElem ? 'Ideal' : `Recomendados: ${recEls.join(', ')}` })
  const basicsOk = !!data.name && !!data.race && !!data.class
  items.push({ label: 'Campos Básicos', status: basicsOk ? 'ok' : 'error', detail: basicsOk ? 'Nome/Raça/Classe OK' : 'Preencha todos os campos' })
  return items
}

export function buildReadiness(data: HeroCreationData): { status: 'ok'|'warn'|'error'; message: string } {
  const items = buildChecklist(data)
  if (items.some(i => i.status === 'error')) return { status: 'error', message: 'Pendências críticas' }
  if (items.some(i => i.status === 'warn')) return { status: 'warn', message: 'Ajustes recomendados' }
  return { status: 'ok', message: 'Pronto para criar' }
}