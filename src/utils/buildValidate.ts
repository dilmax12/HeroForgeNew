import { HeroCreationData } from '../types/hero'
import { CLASS_METADATA } from './classRegistry'
import { calculateRemainingPoints } from './attributeSystem'

export function validateBuild(data: HeroCreationData): { ok: boolean; issues: string[] } {
  const issues: string[] = []
  const meta = CLASS_METADATA[data.class]
  if (meta?.requirements) {
    const check = meta.requirements({ alignment: data.alignment as any, attributes: data.attributes, race: data.race })
    if (!check.ok) issues.push(check.message || 'Requisitos da classe não atendidos')
  }
  const remaining = calculateRemainingPoints(data.attributes)
  if (remaining !== 0) issues.push(`Pontos de atributo restantes devem ser 0, atual: ${remaining}`)
  if (!data.name || String(data.name).trim().length < 2) issues.push('Nome do herói não definido')
  if (!data.race) issues.push('Raça não selecionada')
  if (!data.class) issues.push('Classe não selecionada')
  return { ok: issues.length === 0, issues }
}