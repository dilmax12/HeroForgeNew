import { HeroClass } from '../types/hero'

const TIPS: Record<HeroClass, string[]> = {
  guerreiro: ['Priorize força e constituição', 'Elementos físicos ou terra são estáveis'],
  mago: ['Inteligência e sabedoria elevadas', 'Luz, gelo ou trevas trazem controle'],
  ladino: ['Destreza alta para críticos', 'Evite elementos lentos'],
  clerigo: ['Sabedoria e suporte', 'Luz favorece cura'],
  patrulheiro: ['Destreza e visão tática', 'Trovão e vento ajudam mobilidade'],
  paladino: ['Constituição e força', 'Luz para defesa e cura'],
  arqueiro: ['Destreza e precisão', 'Trovão ou gelo para controle'],
  bardo: ['Carisma e sabedoria', 'Suporte de grupo é essencial'],
  monge: ['Constituição e destreza', 'Terra e vento aumentam sobrevivência'],
  assassino: ['Destreza e burst', 'Trevas para sinergia com crítico'],
  barbaro: ['Força e constituição', 'Fogo aumenta dano'],
  lanceiro: ['Destreza e força', 'Trovão aumenta alcance'],
  druida: ['Sabedoria e inteligência', 'Terra e vento combinam com controle'],
  feiticeiro: ['Inteligência e carisma', 'Trevas favorecem debuffs']
}

export function getClassTips(heroClass: HeroClass): string[] { return TIPS[heroClass] || [] }