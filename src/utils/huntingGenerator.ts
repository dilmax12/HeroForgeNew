import { Hero } from '../types/hero'
import { RankLevel } from '../types/ranks'

export type HuntingCategory = 'controle' | 'coleta' | 'escolta' | 'especial'
export type Biome = 'Colinas de Boravon' | 'Rio Marfim' | 'Floresta Nebulosa' | 'Ruínas Antigas' | 'Floresta Umbral' | 'Caverna Antiga'

export interface HuntingMission {
  id: string
  title: string
  category: HuntingCategory
  biome: Biome
  objective: string
  target: string
  amount: number
  phases: number
  difficulty: 'facil' | 'medio' | 'dificil' | 'epica'
  rankRequired: RankLevel
  baseRewards: { xp: number; gold: number }
  narrative: string
  staminaPerPhase: number
  classHint?: string
  timeHint?: 'dia' | 'noite'
}

const BIOME_TARGETS: Record<Biome, Array<{ target: string; objectivePrefix: string }>> = {
  'Colinas de Boravon': [
    { target: 'Lobo Sombrio', objectivePrefix: 'Abater' },
    { target: 'Bandido Errante', objectivePrefix: 'Neutralizar' }
  ],
  'Rio Marfim': [
    { target: 'Slime Ácido', objectivePrefix: 'Reduzir' },
    { target: 'Serpente do Rio', objectivePrefix: 'Afastar' }
  ],
  'Floresta Nebulosa': [
    { target: 'Morcego Vampiro', objectivePrefix: 'Eliminar' },
    { target: 'Bruxa da Névoa', objectivePrefix: 'Derrubar' }
  ],
  'Ruínas Antigas': [
    { target: 'Golem Rachado', objectivePrefix: 'Destruir' }
  ],
  'Floresta Umbral': [
    { target: 'Bruxa da Névoa', objectivePrefix: 'Derrubar' }
  ],
  'Caverna Antiga': [
    { target: 'Troll de Pedra', objectivePrefix: 'Caçar' }
  ]
}

function chooseBiome(hero: Hero): Biome {
  const biomes: Biome[] = ['Colinas de Boravon','Rio Marfim','Floresta Nebulosa','Ruínas Antigas','Floresta Umbral','Caverna Antiga']
  return biomes[Math.floor(Math.random() * biomes.length)]
}

function gatingByRank(rank?: RankLevel): Array<HuntingCategory> {
  const r = rank || 'F'
  if (r === 'F') return ['controle','coleta']
  if (r === 'E') return ['controle','coleta','escolta']
  if (r === 'D') return ['controle','coleta','escolta']
  if (r === 'C') return ['controle','coleta','escolta']
  if (r === 'B') return ['controle','coleta','escolta','especial']
  return ['controle','coleta','escolta','especial']
}

function phasesByCategory(cat: HuntingCategory): number {
  if (cat === 'controle') return 3
  if (cat === 'coleta') return 3
  if (cat === 'escolta') return 4
  return 3
}

function rankRequirement(cat: HuntingCategory): RankLevel {
  if (cat === 'especial') return 'A'
  if (cat === 'escolta') return 'C'
  if (cat === 'controle') return 'D'
  return 'D'
}

export function generateHuntingMission(hero: Hero, preferredBiome?: Biome): HuntingMission {
  const rank = hero.rankData?.currentRank as RankLevel | undefined
  const allowed = gatingByRank(rank)
  // Viés por classe
  const cls = (hero.class || '').toLowerCase()
  const classBias: Record<string, HuntingCategory[]> = {
    arqueiro: ['controle','especial','escolta'],
    guerreiro: ['controle','especial'],
    mago: ['coleta','especial'],
    clerigo: ['escolta','controle'],
    paladino: ['escolta','controle'],
    assassino: ['controle','especial']
  }
  const bias = Object.entries(classBias).find(([k]) => cls.includes(k))?.[1] || []
  const pickPool = bias.length ? [...bias, ...allowed] : allowed
  const category = pickPool[Math.floor(Math.random() * pickPool.length)]
  const biome = preferredBiome || chooseBiome(hero)
  const pool = BIOME_TARGETS[biome]
  const chosen = pool[Math.floor(Math.random() * pool.length)]
  const amount = category === 'controle' ? (6 + Math.floor(Math.random()*5)) : category === 'coleta' ? (4 + Math.floor(Math.random()*4)) : category === 'escolta' ? 1 : 1
  const diff: 'facil'|'medio'|'dificil'|'epica' = category === 'especial' ? 'epica' : hero.progression.level < 5 ? 'facil' : hero.progression.level < 10 ? 'medio' : 'dificil'
  const phases = phasesByCategory(category)
  const rankReq = rankRequirement(category)
  const baseRewards = { xp: diff === 'epica' ? 120 : diff === 'dificil' ? 90 : diff === 'medio' ? 60 : 40, gold: diff === 'epica' ? 70 : diff === 'dificil' ? 50 : diff === 'medio' ? 35 : 20 }
  const title = category === 'controle' ? `Controle da ${chosen.target}` : category === 'coleta' ? `Coleta de Recursos` : category === 'escolta' ? `Escolta Segura` : `Alvo Especial`
  const objective = category === 'coleta' ? `Coletar ${amount} ${chosen.target === 'Bruxa da Névoa' ? 'Essências Umbral' : 'Ervas/Recursos'}` : `${chosen.objectivePrefix} ${category === 'controle' ? amount : chosen.target}`
  const narrative = category === 'controle' ? `A população de ${chosen.target} ameaça caravanas em ${biome}. Reduza sua presença.` : category === 'coleta' ? `Recursos raros foram avistados em ${biome}. Obtenha-os sob risco controlado.` : category === 'escolta' ? `Um NPC precisa alcançar ${biome} em segurança. O caminho é perigoso.` : `Um alvo único foi identificado em ${biome}. Derrube-o para obter recompensas.`
  const staminaPerPhase = diff === 'epica' ? 5 : diff === 'dificil' ? 4 : diff === 'medio' ? 3 : 2
  const timeHint: 'dia'|'noite' | undefined = (() => {
    if (biome === 'Floresta Nebulosa' || biome === 'Floresta Umbral') return Math.random() < 0.7 ? 'noite' : undefined
    if (biome === 'Rio Marfim') return Math.random() < 0.6 ? 'dia' : undefined
    if (category === 'coleta' && Math.random() < 0.5) return Math.random() < 0.5 ? 'noite' : 'dia'
    return undefined
  })()
  const classHint = bias.length ? `Classe favorecida em ${category}` : undefined
  return {
    id: `hunt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    title,
    category,
    biome,
    objective,
    target: chosen.target,
    amount,
    phases,
    difficulty: diff,
    rankRequired: rankReq,
    baseRewards,
    narrative,
    staminaPerPhase,
    classHint,
    timeHint
  }
}
