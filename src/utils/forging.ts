import { Hero } from '../types/hero'

export interface ForgeRecipe {
  id: string
  name: string
  inputs: Array<{ id: string; qty: number }>
  output: { id: string; qty: number }
  rankRequired?: 'F'|'E'|'D'|'C'|'B'|'A'|'S'
}

export const RECIPES: ForgeRecipe[] = [
  {
    id: 'peitoral-cacador',
    name: 'Peitoral do Caçador',
    inputs: [
      { id: 'pele-lobo-sombrio', qty: 3 },
      { id: 'colmilho-vampirico', qty: 1 }
    ],
    output: { id: 'armadura-cacador', qty: 1 },
    rankRequired: 'D'
  },
  {
    id: 'lamina-ritual',
    name: 'Lâmina Ritual do Alpha',
    inputs: [
      { id: 'osso-antigo', qty: 2 },
      { id: 'cristal-runico', qty: 1 }
    ],
    output: { id: 'lamina-alpha', qty: 1 },
    rankRequired: 'B'
  },
  {
    id: 'tunica-umbral',
    name: 'Túnica Umbral',
    inputs: [
      { id: 'essencia-lunar', qty: 2 },
      { id: 'erva-sangue', qty: 3 }
    ],
    output: { id: 'manto-arcano', qty: 1 },
    rankRequired: 'C'
  }
]

export function getAvailableRecipes(hero: Hero): ForgeRecipe[] {
  const rankOrder = ['F','E','D','C','B','A','S'] as const
  const heroRank = (hero.rankData?.currentRank || 'F') as typeof rankOrder[number]
  const heroRankIdx = rankOrder.indexOf(heroRank)
  return RECIPES.filter(r => {
    const reqIdx = rankOrder.indexOf((r.rankRequired || 'F') as any)
    if (heroRankIdx < reqIdx) return false
    return r.inputs.every(inp => (hero.inventory.items[inp.id] || 0) >= inp.qty)
  })
}

