/**
 * Sistema de Validação de Atributos
 * Versão 3.0 - Forjador de Heróis
 */

import { HeroAttributes } from '../types/hero';

export const ATTRIBUTE_CONSTRAINTS = {
  MIN_ATTRIBUTE: 1,
  MAX_ATTRIBUTE: 10,
  TOTAL_POINTS: 18,
  STARTING_POINTS_PER_ATTRIBUTE: 1
};

export const ATTRIBUTE_INFO = {
  forca: {
    name: 'Força',
    icon: '💪',
    description: 'Determina o dano físico e capacidade de carregar equipamentos pesados'
  },
  destreza: {
    name: 'Destreza',
    icon: '🏃',
    description: 'Afeta precisão, esquiva e velocidade de movimento'
  },
  constituicao: {
    name: 'Constituição',
    icon: '❤️',
    description: 'Determina pontos de vida e resistência a doenças'
  },
  inteligencia: {
    name: 'Inteligência',
    icon: '🧠',
    description: 'Afeta dano mágico, mana e habilidades de conhecimento'
  },
  sabedoria: {
    name: 'Sabedoria',
    icon: '🦉',
    description: 'Influencia percepção, intuição e resistência mental'
  },
  carisma: {
    name: 'Carisma',
    icon: '✨',
    description: 'Determina habilidades sociais e liderança'
  }
};

/**
 * Cria atributos iniciais com valores mínimos
 */
export function createInitialAttributes(): HeroAttributes {
  return {
    forca: ATTRIBUTE_CONSTRAINTS.STARTING_POINTS_PER_ATTRIBUTE,
    destreza: ATTRIBUTE_CONSTRAINTS.STARTING_POINTS_PER_ATTRIBUTE,
    constituicao: ATTRIBUTE_CONSTRAINTS.STARTING_POINTS_PER_ATTRIBUTE,
    inteligencia: ATTRIBUTE_CONSTRAINTS.STARTING_POINTS_PER_ATTRIBUTE,
    sabedoria: ATTRIBUTE_CONSTRAINTS.STARTING_POINTS_PER_ATTRIBUTE,
    carisma: ATTRIBUTE_CONSTRAINTS.STARTING_POINTS_PER_ATTRIBUTE
  };
}

/**
 * Calcula pontos restantes para distribuir
 */
export function calculateRemainingPoints(attributes: HeroAttributes): number {
  const totalUsed = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  return ATTRIBUTE_CONSTRAINTS.TOTAL_POINTS - totalUsed;
}

/**
 * Valida se os atributos estão dentro dos limites
 */
export function validateAttributes(attributes: HeroAttributes): {
  valid: boolean;
  errors: string[];
  totalPoints: number;
  remainingPoints: number;
} {
  const errors: string[] = [];
  const totalPoints = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  const remainingPoints = ATTRIBUTE_CONSTRAINTS.TOTAL_POINTS - totalPoints;

  // Verifica valores mínimos
  Object.entries(attributes).forEach(([attr, value]) => {
    if (value < ATTRIBUTE_CONSTRAINTS.MIN_ATTRIBUTE) {
      errors.push(`${ATTRIBUTE_INFO[attr as keyof HeroAttributes].name} deve ter pelo menos ${ATTRIBUTE_CONSTRAINTS.MIN_ATTRIBUTE} ponto`);
    }
    if (value > ATTRIBUTE_CONSTRAINTS.MAX_ATTRIBUTE) {
      errors.push(`${ATTRIBUTE_INFO[attr as keyof HeroAttributes].name} não pode ter mais que ${ATTRIBUTE_CONSTRAINTS.MAX_ATTRIBUTE} pontos`);
    }
  });

  // Verifica total de pontos
  if (totalPoints > ATTRIBUTE_CONSTRAINTS.TOTAL_POINTS) {
    errors.push(`Total de pontos (${totalPoints}) excede o limite de ${ATTRIBUTE_CONSTRAINTS.TOTAL_POINTS}`);
  }

  if (totalPoints < ATTRIBUTE_CONSTRAINTS.TOTAL_POINTS) {
    errors.push(`Você ainda tem ${remainingPoints} pontos para distribuir`);
  }

  return {
    valid: errors.length === 0,
    errors,
    totalPoints,
    remainingPoints
  };
}

/**
 * Verifica se é possível aumentar um atributo
 */
export function canIncreaseAttribute(
  attributes: HeroAttributes,
  attribute: keyof HeroAttributes
): boolean {
  const currentValue = attributes[attribute];
  const remainingPoints = calculateRemainingPoints(attributes);
  
  return currentValue < ATTRIBUTE_CONSTRAINTS.MAX_ATTRIBUTE && remainingPoints > 0;
}

/**
 * Verifica se é possível diminuir um atributo
 */
export function canDecreaseAttribute(
  attributes: HeroAttributes,
  attribute: keyof HeroAttributes
): boolean {
  const currentValue = attributes[attribute];
  return currentValue > ATTRIBUTE_CONSTRAINTS.MIN_ATTRIBUTE;
}

/**
 * Aumenta um atributo se possível
 */
export function increaseAttribute(
  attributes: HeroAttributes,
  attribute: keyof HeroAttributes
): HeroAttributes {
  if (!canIncreaseAttribute(attributes, attribute)) {
    return attributes;
  }
  
  return {
    ...attributes,
    [attribute]: attributes[attribute] + 1
  };
}

/**
 * Diminui um atributo se possível
 */
export function decreaseAttribute(
  attributes: HeroAttributes,
  attribute: keyof HeroAttributes
): HeroAttributes {
  if (!canDecreaseAttribute(attributes, attribute)) {
    return attributes;
  }
  
  return {
    ...attributes,
    [attribute]: attributes[attribute] - 1
  };
}

/**
 * Distribui pontos automaticamente de forma balanceada
 */
export function autoDistributePoints(baseAttributes?: Partial<HeroAttributes>): HeroAttributes {
  const attributes = createInitialAttributes();
  let remainingPoints = calculateRemainingPoints(attributes);
  
  // Se há atributos base preferidos, prioriza eles
  if (baseAttributes) {
    Object.entries(baseAttributes).forEach(([attr, bonus]) => {
      const key = attr as keyof HeroAttributes;
      const maxIncrease = Math.min(
        bonus || 0,
        ATTRIBUTE_CONSTRAINTS.MAX_ATTRIBUTE - attributes[key],
        remainingPoints
      );
      attributes[key] += maxIncrease;
      remainingPoints -= maxIncrease;
    });
  }
  
  // Distribui pontos restantes aleatoriamente
  while (remainingPoints > 0) {
    const attributeKeys = Object.keys(attributes) as (keyof HeroAttributes)[];
    const randomAttr = attributeKeys[Math.floor(Math.random() * attributeKeys.length)];
    
    if (canIncreaseAttribute(attributes, randomAttr)) {
      attributes[randomAttr]++;
      remainingPoints--;
    }
  }
  
  return attributes;
}