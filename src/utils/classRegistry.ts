import { HeroAttributes, HeroClass } from '../types/hero'

export interface ClassMeta {
  id: HeroClass
  name: string
  icon: string
  description: string
  baseAttributes: HeroAttributes
  advantages: string[]
  disadvantages: string[]
  requirements?: (input: { attributes: HeroAttributes; race: string }) => { ok: boolean; message?: string }
  suggestedRaces?: string[]
}

export const CLASS_METADATA: Record<HeroClass, ClassMeta> = {
  guerreiro: {
    id: 'guerreiro', name: 'Guerreiro', icon: '⚔️',
    description: 'Combatente corpo a corpo versátil com alta durabilidade.',
    baseAttributes: { forca: 4, destreza: 3, constituicao: 4, inteligencia: 2, sabedoria: 2, carisma: 2 },
    advantages: ['Alta sobrevivência', 'Dano consistente'],
    disadvantages: ['Pouca mobilidade', 'Baixo dano mágico'],
    suggestedRaces: ['humano', 'orc', 'anao']
  },
  mago: {
    id: 'mago', name: 'Mago', icon: '🔮',
    description: 'Especialista em magias ofensivas e controle do campo.',
    baseAttributes: { forca: 1, destreza: 2, constituicao: 2, inteligencia: 5, sabedoria: 4, carisma: 2 },
    advantages: ['Alto dano mágico', 'Controle de área'],
    disadvantages: ['Frágil fisicamente', 'Dependente de energia'],
    suggestedRaces: ['elfo', 'humano']
  },
  ladino: {
    id: 'ladino', name: 'Ladino', icon: '🗡️',
    description: 'Ágil e furtivo, focado em golpes críticos e evasão.',
    baseAttributes: { forca: 2, destreza: 5, constituicao: 2, inteligencia: 3, sabedoria: 2, carisma: 2 },
    advantages: ['Alta evasão', 'Críticos frequentes'],
    disadvantages: ['Frágil contra dano em área'],
    suggestedRaces: ['humano', 'halfling']
  },
  clerigo: {
    id: 'clerigo', name: 'Clérigo', icon: '✨',
    description: 'Guardião da luz, forte em cura e suporte.',
    baseAttributes: { forca: 2, destreza: 2, constituicao: 3, inteligencia: 3, sabedoria: 5, carisma: 3 },
    advantages: ['Curas e purificações', 'Suporte poderoso'],
    disadvantages: ['Baixo dano físico'],
    suggestedRaces: ['humano', 'elfo']
  },
  patrulheiro: {
    id: 'patrulheiro', name: 'Patrulheiro', icon: '🏹',
    description: 'Caçador e explorador, equilibrado entre precisão e utilidade.',
    baseAttributes: { forca: 3, destreza: 4, constituicao: 3, inteligencia: 2, sabedoria: 3, carisma: 2 },
    advantages: ['Versátil', 'Bom em ambientes selvagens'],
    disadvantages: ['Menos explosivo que classes especializadas'],
    suggestedRaces: ['elfo', 'humano']
  },
  paladino: {
    id: 'paladino', name: 'Paladino', icon: '🛡️',
    description: 'Cavaleiro sagrado com defesa excepcional e suporte divino.',
    baseAttributes: { forca: 4, destreza: 2, constituicao: 4, inteligencia: 2, sabedoria: 4, carisma: 3 },
    advantages: ['Defesa e controle', 'Suporte luminoso'],
    disadvantages: ['Menos flexível ofensivamente'],
    suggestedRaces: ['humano', 'anao']
  },
  arqueiro: {
    id: 'arqueiro', name: 'Arqueiro', icon: '🏹',
    description: 'Atirador preciso com vantagem à distância.',
    baseAttributes: { forca: 2, destreza: 5, constituicao: 2, inteligencia: 2, sabedoria: 3, carisma: 2 },
    advantages: ['Alto alcance', 'Críticos'],
    disadvantages: ['Frágil em curta distância'],
    suggestedRaces: ['elfo', 'halfling']
  },
  bardo: {
    id: 'bardo', name: 'Bardo', icon: '🎻',
    description: 'Artista do campo de batalha, mistura de suporte e controle.',
    baseAttributes: { forca: 2, destreza: 3, constituicao: 2, inteligencia: 3, sabedoria: 3, carisma: 5 },
    advantages: ['Buffs de grupo', 'Ferramentas de controle'],
    disadvantages: ['Dano direto limitado'],
    suggestedRaces: ['humano', 'elfo']
  },
  monge: {
    id: 'monge', name: 'Monge', icon: '🥋',
    description: 'Marcial disciplinado, defesa e regeneração interna.',
    baseAttributes: { forca: 3, destreza: 3, constituicao: 4, inteligencia: 2, sabedoria: 3, carisma: 2 },
    advantages: ['Resistência e mobilidade'],
    disadvantages: ['Dependente de posicionamento'],
    requirements: ({ attributes }) => {
      if ((attributes.constituicao || 0) < 3) return { ok: false, message: 'Monge requer Constituição ≥ 3.' }
      return { ok: true }
    },
    suggestedRaces: ['humano']
  },
  assassino: {
    id: 'assassino', name: 'Assassino', icon: '🗡️',
    description: 'Eliminador furtivo com foco em explosão e evasão.',
    baseAttributes: { forca: 2, destreza: 5, constituicao: 2, inteligencia: 3, sabedoria: 2, carisma: 2 },
    advantages: ['Explosão e furtividade'],
    disadvantages: ['Frágil se revelado'],
    requirements: ({ attributes }) => {
      if ((attributes.destreza || 0) < 3) return { ok: false, message: 'Assassino requer Destreza ≥ 3.' }
      return { ok: true }
    },
    suggestedRaces: ['humano', 'halfling']
  },
  barbaro: {
    id: 'barbaro', name: 'Bárbaro', icon: '🪓',
    description: 'Bruto indomável com dano físico massivo.',
    baseAttributes: { forca: 5, destreza: 2, constituicao: 4, inteligencia: 1, sabedoria: 2, carisma: 2 },
    advantages: ['Dano físico alto'],
    disadvantages: ['Baixa defesa mágica'],
    suggestedRaces: ['orc', 'humano']
  },
  lanceiro: {
    id: 'lanceiro', name: 'Lanceiro (Dragoon)', icon: '🐉',
    description: 'Especialista em alcance e controle aéreo.',
    baseAttributes: { forca: 4, destreza: 4, constituicao: 3, inteligencia: 2, sabedoria: 2, carisma: 2 },
    advantages: ['Perfuração e salto'],
    disadvantages: ['Custo alto de energia'],
    requirements: ({ attributes }) => {
      if ((attributes.destreza || 0) < 3) return { ok: false, message: 'Lanceiro requer Destreza ≥ 3.' }
      return { ok: true }
    },
    suggestedRaces: ['elfo', 'humano']
  },
  druida: {
    id: 'druida', name: 'Druida', icon: '🌿',
    description: 'Guardião da natureza com curas e transformações.',
    baseAttributes: { forca: 2, destreza: 3, constituicao: 3, inteligencia: 3, sabedoria: 4, carisma: 2 },
    advantages: ['Suporte flexível', 'Controle ambiental'],
    disadvantages: ['Dano direto menor'],
    suggestedRaces: ['elfo', 'humano']
  },
  feiticeiro: {
    id: 'feiticeiro', name: 'Feiticeiro das Trevas', icon: '✨',
    description: 'Manipulador de trevas com debuffs potentes.',
    baseAttributes: { forca: 1, destreza: 2, constituicao: 2, inteligencia: 5, sabedoria: 3, carisma: 3 },
    advantages: ['Debuffs fortes', 'Invocações'],
    disadvantages: ['Frágil, dependente de mana'],
    suggestedRaces: ['humano', 'orc']
  }
}

