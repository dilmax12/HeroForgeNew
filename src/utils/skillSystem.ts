/**
 * Sistema de Skills por Classe
 * Versão 3.0 - Forjador de Heróis
 */

import { Skill, HeroClass } from '../types/hero';

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
    ,
    {
      id: 'investida-feroz',
      name: 'Investida Feroz',
      description: 'Avança rapidamente causando dano e empurrando o alvo',
      type: 'attack',
      cost: 4,
      basePower: 14,
      element: 'physical',
      target: 'single',
      effects: { special: 'knockback_small' }
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
    ,
    {
      id: 'rajada-gelo',
      name: 'Rajada de Gelo',
      description: 'Ataque de gelo com chance de reduzir velocidade',
      type: 'attack',
      cost: 5,
      basePower: 16,
      element: 'ice',
      target: 'single',
      effects: { debuff: { special: 'slow' } }
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
    ,
    {
      id: 'disparo-penetrante',
      name: 'Disparo Penetrante',
      description: 'Ataque que ignora parte da armadura',
      type: 'attack',
      cost: 5,
      basePower: 13,
      element: 'physical',
      target: 'single',
      effects: { special: 'ignore_armor_small' }
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
  ,
  bardo: [
    { id: 'melodia-inspiradora', name: 'Melodia Inspiradora', description: 'Inspira o grupo, aumentando atributos por alguns turnos', type: 'buff', cost: 3, duration: 2, target: 'ally', effects: { buff: { attribute: 'carisma', percentage: 15 } } },
    { id: 'nota-cortante', name: 'Nota Cortante', description: 'Ataque sonoro rápido contra um alvo', type: 'attack', cost: 4, basePower: 12, element: 'physical', target: 'single' },
    { id: 'bencao-alaude', name: 'Bênção do Alaúde', description: 'Suporte leve que melhora recuperação', type: 'support', cost: 5, target: 'ally', effects: { special: 'recovery_bonus_10' } }
  ],
  monge: [
    { id: 'golpe-chi', name: 'Golpe Chi', description: 'Ataque concentrado de energia física', type: 'attack', cost: 4, basePower: 14, element: 'physical', target: 'single' },
    { id: 'respiracao-interna', name: 'Respiração Interna', description: 'Aumenta defesa e regenera levemente', type: 'buff', cost: 3, duration: 2, target: 'self', effects: { special: 'minor_regen', buff: { attribute: 'constituicao', percentage: 15 } } },
    { id: 'chute-giratorio', name: 'Chute Giratório', description: 'Controla o inimigo e reduz sua ação', type: 'buff', cost: 5, duration: 1, target: 'single', effects: { debuff: { special: 'knockdown' } } }
  ],
  assassino: [
    { id: 'ataque-sombrio', name: 'Ataque Sombrio', description: 'Golpe das sombras com dano de trevas', type: 'attack', cost: 4, basePower: 15, element: 'dark', target: 'single' },
    { id: 'golpe-duplo', name: 'Golpe Duplo', description: 'Dois ataques rápidos em sequência', type: 'attack', cost: 5, basePower: 10, element: 'physical', target: 'single', effects: { special: 'double_strike' } },
    { id: 'fumaca-oculta', name: 'Fumaça Oculta', description: 'Evade e escapa de perigo por um turno', type: 'support', cost: 3, target: 'self', effects: { special: 'escape' } }
  ],
  barbaro: [
    { id: 'corte-brutal', name: 'Corte Brutal', description: 'Ataque físico poderoso', type: 'attack', cost: 5, basePower: 18, element: 'physical', target: 'single' },
    { id: 'frenesi', name: 'Frenesi', description: 'Aumenta ataque por alguns turnos', type: 'buff', cost: 4, duration: 2, target: 'self', effects: { buff: { attribute: 'forca', percentage: 20 } } },
    { id: 'rugido-selvagem', name: 'Rugido Selvagem', description: 'Debuff que reduz a defesa do inimigo', type: 'buff', cost: 3, duration: 2, target: 'single', effects: { debuff: { attribute: 'constituicao', percentage: 15 } } }
  ],
  lanceiro: [
    { id: 'investida-perfurante', name: 'Investida Perfurante', description: 'Ataque físico com perfuração', type: 'attack', cost: 5, basePower: 16, element: 'physical', target: 'single' },
    { id: 'postura-longa', name: 'Postura Longa', description: 'Aumenta alcance e defesa', type: 'buff', cost: 3, duration: 2, target: 'self', effects: { buff: { attribute: 'constituicao', percentage: 15 } } },
    { id: 'salto-dragao', name: 'Salto do Dragão', description: 'Controle com salto que atrapalha o inimigo', type: 'buff', cost: 5, duration: 1, target: 'single', effects: { debuff: { special: 'airborne_control' } } }
  ],
  druida: [
    { id: 'raiz-aprisionadora', name: 'Raiz Aprisionadora', description: 'Controla o inimigo com raízes', type: 'buff', cost: 4, duration: 1, target: 'single', effects: { debuff: { special: 'root' } } },
    { id: 'cura-natural', name: 'Cura Natural', description: 'Cura leve de energia da natureza', type: 'support', cost: 4, target: 'ally', effects: { heal: 15 } },
    { id: 'chamado-fauna', name: 'Chamado da Fauna', description: 'Invoca um pet temporário', type: 'support', cost: 5, target: 'ally', effects: { special: 'summon_pet' } }
  ],
  feiticeiro: [
    { id: 'seta-sombria', name: 'Seta Sombria', description: 'Ataque de trevas contra um alvo', type: 'attack', cost: 5, basePower: 16, element: 'dark', target: 'single' },
    { id: 'corrente-maldita', name: 'Corrente Maldita', description: 'Debuff que reduz atributos do inimigo', type: 'buff', cost: 4, duration: 2, target: 'single', effects: { debuff: { attribute: 'forca', percentage: 15 } } },
    { id: 'drenar-vida', name: 'Drenar Vida', description: 'Rouba vida do inimigo e recupera o usuário', type: 'support', cost: 6, target: 'single', effects: { special: 'lifesteal_small' } }
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

// Skills de progressão por classe
export const PROGRESSION_SKILLS: Record<HeroClass, Array<{ level: number; skills: Skill[] }>> = {
  mago: [
    { level: 3, skills: [{ id: 'tempestade-arcana', name: 'Tempestade Arcana', description: 'Dano em área arcano', type: 'attack', cost: 6, basePower: 18, element: 'light', target: 'aoe', cooldown: 3 }] },
    { level: 5, skills: [{ id: 'congelar', name: 'Congelar', description: 'Stun de gelo por 1 turno', type: 'buff', cost: 5, duration: 1, target: 'single', effects: { debuff: { special: 'freeze_stun' } } }] },
    { level: 7, skills: [{ id: 'amplificar-magia', name: 'Amplificar Magia', description: 'Buff mágico avançado', type: 'buff', cost: 5, duration: 2, target: 'ally', effects: { buff: { attribute: 'inteligencia', percentage: 20 } } }] },
    { level: 10, skills: [{ id: 'cometa-arcano', name: 'Cometa Arcano', description: 'Ultimate de alto dano arcano em área', type: 'attack', cost: 8, basePower: 30, element: 'light', target: 'aoe', cooldown: 4 }] }
  ],
  bardo: [
    { level: 3, skills: [{ id: 'cancao-coragem', name: 'Canção da Coragem', description: 'Aumenta ataque do grupo', type: 'buff', cost: 4, duration: 2, target: 'ally', effects: { buff: { attribute: 'forca', percentage: 15 } } }] },
    { level: 5, skills: [{ id: 'balada-cura', name: 'Balada da Cura', description: 'Cura leve por 3 turnos', type: 'support', cost: 5, duration: 3, target: 'ally', effects: { heal: 10 } }] },
    { level: 7, skills: [{ id: 'grito-multidao', name: 'Grito da Multidão', description: 'Debuff inimigos em área', type: 'buff', cost: 5, duration: 2, target: 'aoe', effects: { debuff: { attribute: 'destreza', percentage: 10 } } }] },
    { level: 10, skills: [{ id: 'sinfonia-final', name: 'Sinfonia Final', description: 'Ultimate: buff + dano em área', type: 'attack', cost: 7, basePower: 20, element: 'physical', target: 'aoe', cooldown: 4 }] }
  ],
  monge: [
    { level: 3, skills: [{ id: 'punhos-elementais', name: 'Punhos Elementais', description: 'Ataques com fogo/terra', type: 'attack', cost: 5, basePower: 16, element: 'earth', target: 'single' }] },
    { level: 5, skills: [{ id: 'passo-vento', name: 'Passo do Vento', description: 'Velocidade + esquiva', type: 'buff', cost: 4, duration: 2, target: 'self', effects: { special: 'evasion_up' } }] },
    { level: 7, skills: [{ id: 'palma-sagrada', name: 'Palma Sagrada', description: 'Dano de luz', type: 'attack', cost: 5, basePower: 18, element: 'light', target: 'single' }] },
    { level: 10, skills: [{ id: 'punho-dragao', name: 'Punho do Dragão', description: 'Ultimate físico poderoso', type: 'attack', cost: 8, basePower: 28, element: 'physical', target: 'single', cooldown: 4 }] }
  ],
  assassino: [
    { level: 3, skills: [{ id: 'veneno-mortal', name: 'Veneno Mortal', description: 'Dano contínuo', type: 'buff', cost: 4, duration: 3, target: 'single', effects: { debuff: { special: 'poison_dot' } } }] },
    { level: 5, skills: [{ id: 'surpresa-fatal', name: 'Surpresa Fatal', description: 'Crítico garantido próximo ataque', type: 'buff', cost: 4, duration: 1, target: 'self', effects: { special: 'guaranteed_crit' } }] },
    { level: 7, skills: [{ id: 'sombra-replicante', name: 'Sombra Replicante', description: 'Cria clone que distrai', type: 'support', cost: 5, target: 'ally', effects: { special: 'decoy_clone' } }] },
    { level: 10, skills: [{ id: 'execucao-perfeita', name: 'Execução Perfeita', description: 'Ultimate: alto dano single', type: 'attack', cost: 8, basePower: 30, element: 'dark', target: 'single', cooldown: 4 }] }
  ],
  paladino: [
    { level: 3, skills: [{ id: 'martelo-divino', name: 'Martelo Divino', description: 'Dano + stun', type: 'attack', cost: 6, basePower: 18, element: 'light', target: 'single', effects: { special: 'stun_1' } }] },
    { level: 5, skills: [{ id: 'lagrima-luz', name: 'Lágrima da Luz', description: 'Cura média', type: 'support', cost: 5, target: 'ally', effects: { heal: 20 } }] },
    { level: 7, skills: [{ id: 'protecao-guardiao', name: 'Proteção do Guardião', description: 'Escudo forte', type: 'buff', cost: 5, duration: 2, target: 'ally', effects: { special: 'strong_shield' } }] },
    { level: 10, skills: [{ id: 'ascensao-divina', name: 'Ascensão Divina', description: 'Ultimate sagrado', type: 'attack', cost: 8, basePower: 28, element: 'light', target: 'aoe', cooldown: 4 }] }
  ],
  clerigo: [
    { level: 3, skills: [{ id: 'aura-fe', name: 'Aura de Fé', description: 'Buff de grupo', type: 'buff', cost: 4, duration: 2, target: 'ally', effects: { special: 'group_buff' } }] },
    { level: 5, skills: [{ id: 'bencao-ancestrais', name: 'Benção dos Ancestrais', description: 'Aumenta XP ganho', type: 'support', cost: 4, target: 'ally', effects: { special: 'xp_bonus_10' } }] },
    { level: 7, skills: [{ id: 'escudo-purificador', name: 'Escudo Purificador', description: 'Remove debuffs', type: 'support', cost: 4, target: 'ally', effects: { special: 'cleanse' } }] },
    { level: 10, skills: [{ id: 'milagre-supremo', name: 'Milagre Supremo', description: 'Ultimate: grande cura', type: 'support', cost: 8, target: 'ally', effects: { heal: 40 } }] }
  ],
  barbaro: [
    { level: 3, skills: [{ id: 'furia-totemica', name: 'Fúria Totêmica', description: 'Aumenta dano em área', type: 'buff', cost: 5, duration: 2, target: 'self', effects: { special: 'aoe_damage_up' } }] },
    { level: 5, skills: [{ id: 'sangue-berserker', name: 'Sangue do Berserker', description: 'Aumenta crit + dodge', type: 'buff', cost: 4, duration: 2, target: 'self', effects: { special: 'crit_dodge_up' } }] },
    { level: 7, skills: [{ id: 'cortar-esmagar', name: 'Cortar e Esmagar', description: 'Ataque em área', type: 'attack', cost: 6, basePower: 20, element: 'physical', target: 'aoe' }] },
    { level: 10, skills: [{ id: 'ira-tita', name: 'Ira do Titã', description: 'Ultimate físico', type: 'attack', cost: 8, basePower: 30, element: 'physical', target: 'aoe', cooldown: 4 }] }
  ],
  lanceiro: [
    { level: 3, skills: [{ id: 'lanca-elemental', name: 'Lança Elemental', description: 'Ataque elemental', type: 'attack', cost: 5, basePower: 18, element: 'thunder', target: 'single' }] },
    { level: 5, skills: [{ id: 'perfuracao-tripla', name: 'Perfuração Tripla', description: 'Três golpes rápidos', type: 'attack', cost: 6, basePower: 8, element: 'physical', target: 'single', effects: { special: 'triple_strike' } }] },
    { level: 7, skills: [{ id: 'posicionamento-perfeito', name: 'Posicionamento Perfeito', description: 'Buff de precisão', type: 'buff', cost: 4, duration: 2, target: 'self', effects: { special: 'precision_up' } }] },
    { level: 10, skills: [{ id: 'impacto-celeste', name: 'Impacto Celeste', description: 'Ultimate de salto', type: 'attack', cost: 8, basePower: 28, element: 'physical', target: 'aoe', cooldown: 4 }] }
  ],
  druida: [
    { level: 3, skills: [{ id: 'transformacao-parcial', name: 'Transformação Parcial', description: 'Buff de força', type: 'buff', cost: 4, duration: 2, target: 'self', effects: { buff: { attribute: 'forca', percentage: 20 } } }] },
    { level: 5, skills: [{ id: 'erupcao-espinhos', name: 'Erupção de Espinhos', description: 'Ataque em área de terra', type: 'attack', cost: 5, basePower: 18, element: 'earth', target: 'aoe' }] },
    { level: 7, skills: [{ id: 'semente-vida', name: 'Semente de Vida', description: 'Cura contínua', type: 'support', cost: 5, duration: 3, target: 'ally', effects: { special: 'heal_over_time' } }] },
    { level: 10, skills: [{ id: 'forma-primordial', name: 'Forma Primordial', description: 'Ultimate de transformação', type: 'buff', cost: 8, duration: 3, target: 'self', effects: { special: 'primal_form' } }] }
  ],
  feiticeiro: [
    { level: 3, skills: [{ id: 'explosao-abissal', name: 'Explosão Abissal', description: 'Ataque de trevas em área', type: 'attack', cost: 6, basePower: 18, element: 'dark', target: 'aoe' }] },
    { level: 5, skills: [{ id: 'servos-escuridao', name: 'Servos da Escuridão', description: 'Invoca servos', type: 'support', cost: 6, target: 'ally', effects: { special: 'summon_servants' } }] },
    { level: 7, skills: [{ id: 'marca-negra', name: 'Marca Negra', description: 'Debuff forte', type: 'buff', cost: 5, duration: 2, target: 'single', effects: { debuff: { special: 'strong_debuff' } } }] },
    { level: 10, skills: [{ id: 'circulo-profano', name: 'Círculo Profano', description: 'Ultimate de trevas', type: 'attack', cost: 8, basePower: 30, element: 'dark', target: 'aoe', cooldown: 4 }] }
  ]
};

export function getNewSkillsForLevel(heroClass: HeroClass, prevLevel: number, newLevel: number): Skill[] {
  const defs = PROGRESSION_SKILLS[heroClass] || [];
  const toUnlock = defs.filter(d => d.level > prevLevel && d.level <= newLevel).flatMap(d => d.skills);
  return toUnlock;
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
