/**
 * Sistema de Skills por Classe
 * Versão 3.0 - Forjador de Heróis
 */

import { Skill, HeroClass, Element } from '../types/hero';

export const CLASS_SKILLS: Record<HeroClass, Skill[]> = {
  guerreiro: [
    {
      id: 'golpe-poderoso',
      name: 'Golpe Poderoso',
      description: 'Um ataque devastador que causa alto dano físico',
      type: 'attack',
      cost: 5,
      basePower: 18,
      element: 'earth',
      target: 'single',
      cooldown: 2
    },
    {
      id: 'postura-defensiva',
      name: 'Postura Defensiva',
      description: 'Aumenta a defesa por alguns turnos',
      type: 'buff',
      cost: 3,
      duration: 2,
      target: 'self',
      effects: {
        buff: {
          attribute: 'constituicao',
          percentage: 30
        }
      }
    },
    {
      id: 'grito-guerra',
      name: 'Grito de Guerra',
      description: 'Inspira aliados próximos, aumentando seu ataque',
      type: 'support',
      cost: 4,
      duration: 2,
      target: 'ally',
      effects: {
        buff: {
          attribute: 'forca',
          percentage: 15
        }
      }
    }
  ],
  mago: [
    {
      id: 'bola-fogo',
      name: 'Bola de Fogo',
      description: 'Lança uma esfera flamejante que atinge múltiplos inimigos',
      type: 'attack',
      cost: 6,
      basePower: 20,
      element: 'fire',
      target: 'aoe',
      cooldown: 3
    },
    {
      id: 'escudo-arcano',
      name: 'Escudo Arcano',
      description: 'Cria uma barreira mágica que reduz dano mágico',
      type: 'buff',
      cost: 4,
      duration: 2,
      target: 'self',
      effects: {
        special: 'magic_resistance_40'
      }
    },
    {
      id: 'sussurros-mente',
      name: 'Sussurros da Mente',
      description: 'Reduz o cooldown das habilidades dos aliados',
      type: 'support',
      cost: 5,
      target: 'ally',
      effects: {
        special: 'reduce_cooldown_1'
      }
    }
  ],
  arqueiro: [
    {
      id: 'tiro-preciso',
      name: 'Tiro Preciso',
      description: 'Um tiro certeiro com alta chance de crítico',
      type: 'attack',
      cost: 4,
      basePower: 15,
      element: 'physical',
      target: 'single',
      effects: {
        special: 'high_crit_chance'
      }
    },
    {
      id: 'passo-silencioso',
      name: 'Passo Silencioso',
      description: 'Aumenta a chance de esquiva por alguns turnos',
      type: 'buff',
      cost: 3,
      duration: 2,
      target: 'self',
      effects: {
        buff: {
          attribute: 'destreza',
          percentage: 25
        }
      }
    },
    {
      id: 'chuva-flechas',
      name: 'Chuva de Flechas',
      description: 'Dispara múltiplas flechas atingindo vários inimigos',
      type: 'attack',
      cost: 6,
      basePower: 12,
      element: 'physical',
      target: 'aoe',
      cooldown: 4
    }
  ],
  clerigo: [
    {
      id: 'luz-curativa',
      name: 'Luz Curativa',
      description: 'Canaliza energia divina para curar ferimentos',
      type: 'support',
      cost: 5,
      target: 'ally',
      effects: {
        heal: 20
      }
    },
    {
      id: 'bencao',
      name: 'Bênção',
      description: 'Abençoa um aliado, aumentando a cura recebida',
      type: 'buff',
      cost: 4,
      duration: 3,
      target: 'ally',
      effects: {
        special: 'healing_bonus_10'
      }
    },
    {
      id: 'exorcismo',
      name: 'Exorcismo',
      description: 'Ataque sagrado especialmente efetivo contra mortos-vivos',
      type: 'attack',
      cost: 6,
      basePower: 14,
      element: 'light',
      target: 'single',
      effects: {
        special: 'extra_vs_undead'
      }
    }
  ],
  ladino: [
    {
      id: 'estocada',
      name: 'Estocada',
      description: 'Ataque furtivo que causa dano extra em alvos desprevenidos',
      type: 'attack',
      cost: 4,
      basePower: 16,
      element: 'physical',
      target: 'single',
      effects: {
        special: 'sneak_attack_bonus'
      }
    },
    {
      id: 'fuga-sombria',
      name: 'Fuga Sombria',
      description: 'Teleporta para as sombras, ganhando invulnerabilidade temporária',
      type: 'support',
      cost: 3,
      target: 'self',
      effects: {
        special: 'teleport_invulnerable_1_turn'
      }
    },
    {
      id: 'manobra-enganosa',
      name: 'Manobra Enganosa',
      description: 'Confunde inimigos, fazendo-os errar seus ataques',
      type: 'buff',
      cost: 4,
      duration: 2,
      target: 'single',
      effects: {
        debuff: {
          special: 'confusion_miss_chance'
        }
      }
    }
  ],
  patrulheiro: [
    {
      id: 'tiro-rastreador',
      name: 'Tiro Rastreador',
      description: 'Marca o alvo e causa dano contínuo',
      type: 'attack',
      cost: 4,
      basePower: 14,
      element: 'physical',
      target: 'single',
      effects: {
        special: 'mark_target_dot'
      }
    },
    {
      id: 'camuflagem',
      name: 'Camuflagem',
      description: 'Torna-se invisível por alguns turnos',
      type: 'buff',
      cost: 5,
      duration: 2,
      target: 'self',
      effects: {
        special: 'invisibility'
      }
    },
    {
      id: 'chamado-natureza',
      name: 'Chamado da Natureza',
      description: 'Invoca a ajuda de animais selvagens',
      type: 'support',
      cost: 6,
      target: 'ally',
      effects: {
        special: 'summon_animal_companion'
      }
    }
  ],
  paladino: [
    {
      id: 'golpe-sagrado',
      name: 'Golpe Sagrado',
      description: 'Ataque imbuído com poder divino',
      type: 'attack',
      cost: 5,
      basePower: 16,
      element: 'light',
      target: 'single',
      cooldown: 2
    },
    {
      id: 'aura-protecao',
      name: 'Aura de Proteção',
      description: 'Protege aliados próximos com energia sagrada',
      type: 'buff',
      cost: 6,
      duration: 3,
      target: 'ally',
      effects: {
        buff: {
          attribute: 'constituicao',
          percentage: 20
        }
      }
    },
    {
      id: 'cura-divina',
      name: 'Cura Divina',
      description: 'Canaliza poder divino para curar ferimentos graves',
      type: 'support',
      cost: 7,
      target: 'ally',
      effects: {
        heal: 25
      }
    }
  ]
};

/**
 * Obtém as skills iniciais de uma classe
 */
export function getClassSkills(heroClass: HeroClass): Skill[] {
  return CLASS_SKILLS[heroClass] || [];
}

/**
 * Verifica se um herói pode usar uma skill
 */
export function canUseSkill(heroLevel: number, heroMana: number, skill: Skill): boolean {
  return heroMana >= skill.cost;
}

/**
 * Calcula o dano de uma skill
 */
export function calculateSkillDamage(
  userAttributes: any,
  skill: Skill,
  elementMultiplier: number = 1
): number {
  if (!skill.basePower) return 0;
  
  const attributeBonus = userAttributes.forca * 0.5; // Força influencia dano físico
  const magicBonus = userAttributes.inteligencia * 0.4; // Inteligência influencia dano mágico
  
  const baseBonus = skill.element === 'physical' ? attributeBonus : magicBonus;
  const totalPower = skill.basePower + baseBonus;
  
  return Math.max(1, Math.floor(totalPower * elementMultiplier));
}