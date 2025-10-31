import { HeroCreationData, HeroAttributes, Hero } from '../types/hero';
import { storyAIService } from '../services/storyAIService';
import { aiService } from '../services/aiService';

// Fallback templates for when AI is not available
const classVariations: Record<string, string[]> = {
  Warrior: [
    '${name} treinou entre aço e fogo, moldando sua coragem nas batalhas de ${place}.',
    'Chamado de "Escudo de ${place}", ${name} ergueu sua lâmina para proteger os fracos.',
    'Em ${place}, ${name} aprendeu que disciplina vale mais que força bruta.',
    'Quando os tambores ecoaram em ${place}, ${name} avançou sem hesitar.',
    'Cada cicatriz de ${name} conta uma história de honra e dever em ${place}.'
  ],
  Mage: [
    '${name} estudou grimórios antigos em ${place}, dominando segredos arcanos.',
    'Chamado de "Sábio de ${place}", ${name} manipula o véu entre mundos.',
    'Em ${place}, ${name} aprendeu que conhecimento é a maior arma.',
    'Quando as estrelas alinharam-se sobre ${place}, ${name} recitou um antigo encantamento.',
    'As runas de ${place} sussurraram o destino de ${name} nas noites longas.'
  ],
  Rogue: [
    'Nas sombras de ${place}, ${name} move-se como o vento.',
    'Chamado de "Eco de ${place}", ${name} nunca está onde o inimigo espera.',
    'Em ${place}, ${name} aprendeu que silêncio pode ser mais poderoso que aço.',
    'Quando a lua caiu sobre ${place}, ${name} roubou o segredo que virou a guerra.',
    'Cada passo de ${name} em ${place} deixa apenas perguntas e nenhum rastro.'
  ],
  Cleric: [
    'Sob as bênçãos em ${place}, ${name} cura feridas e expulsa trevas.',
    'Chamado de "Luz de ${place}", ${name} mantém a fé firme sob qualquer tormenta.',
    'Em ${place}, ${name} aprendeu que compaixão é coragem de outro tipo.',
    'Quando as campanas tocaram em ${place}, ${name} respondeu com oração e ação.',
    'Cada milagre de ${name} em ${place} acende esperança onde antes havia medo.'
  ],
  Ranger: [
    'Entre florestas de ${place}, ${name} conhece cada trilha e rastro.',
    'Chamado de "Guia de ${place}", ${name} anda onde poucos sobrevivem.',
    'Em ${place}, ${name} aprendeu que paciência supera pressa.',
    'Quando o vento mudou em ${place}, ${name} já sabia o caminho seguro.',
    'Os animais de ${place} reconhecem ${name} como parte da própria natureza.'
  ],
  Paladin: [
    'Jurando votos em ${place}, ${name} combate o mal com retidão.',
    'Chamado de "Voto de ${place}", ${name} não recua diante da injustiça.',
    'Em ${place}, ${name} aprendeu que a verdade é lâmina afiada.',
    'Quando a escuridão caiu sobre ${place}, ${name} ergueu o estandarte da luz.',
    'Cada ato de ${name} em ${place} grava um exemplo de virtude.'
  ]
};

const places = ['Alto Vale', 'Muralha de Pedra', 'Costa Âmbar', 'Planícies de Ébano', 'Bosque das Runas'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dominantAttribute(attrs: HeroAttributes): { key: keyof HeroAttributes; label: string } {
  const labels: Record<keyof HeroAttributes, string> = {
    strength: 'força',
    agility: 'destreza',
    constitution: 'constituição',
    intelligence: 'inteligência',
    wisdom: 'sabedoria',
    charisma: 'carisma'
  };
  const entries = Object.entries(attrs) as [keyof HeroAttributes, number][];
  const [key] = entries.reduce((max, cur) => (cur[1] > max[1] ? cur : max), entries[0]);
  return { key, label: labels[key] };
}

// Legacy function for backward compatibility
export function generateStory(hero: HeroCreationData): string {
  return generateFallbackStory(hero);
}

// AI-powered story generation
export async function generateAIStory(hero: Hero, storyType: 'origin' | 'adventure' | 'legendary' | 'achievement' = 'origin', context?: string): Promise<string> {
  // Check if AI is configured and available
  if (!aiService.isConfigured()) {
    console.warn('AI service not configured, using fallback story generation');
    return generateFallbackStory(hero);
  }

  try {
    return await storyAIService.generateStory({
      hero,
      storyType,
      context
    });
  } catch (error) {
    console.error('Failed to generate AI story, falling back to template:', error);
    return generateFallbackStory(hero);
  }
}

// Enhanced story generation with multiple types
export async function generateHeroStory(hero: Hero, options: {
  type?: 'origin' | 'adventure' | 'legendary' | 'achievement';
  context?: string;
  useAI?: boolean;
} = {}): Promise<string> {
  const { type = 'origin', context, useAI = true } = options;

  if (useAI && aiService.isConfigured()) {
    try {
      return await storyAIService.generateStory({
        hero,
        storyType: type,
        context
      });
    } catch (error) {
      console.error('AI story generation failed:', error);
    }
  }

  return generateFallbackStory(hero);
}

// Generate hero description using AI
export async function generateHeroDescription(hero: Hero): Promise<string> {
  if (!aiService.isConfigured()) {
    return generateFallbackDescription(hero);
  }

  try {
    return await storyAIService.generateHeroDescription(hero);
  } catch (error) {
    console.error('Failed to generate AI description:', error);
    return generateFallbackDescription(hero);
  }
}

// Fallback story generation using templates
function generateFallbackStory(hero: HeroCreationData | Hero): string {
  const base = pick(classVariations[hero.class] || classVariations['Warrior']);
  const place = pick(places);
  const dom = dominantAttribute(hero.attributes);
  const template = base
    .replaceAll('${name}', hero.name || 'Sem Nome')
    .replaceAll('${place}', place);
  // Garante menção a pelo menos um atributo
  const attributeLine = `Sua maior virtude é a ${dom.label}.`;
  return `${template} ${attributeLine}`;
}

// Fallback description generation
function generateFallbackDescription(hero: Hero): string {
  const classDescriptions = {
    Warrior: 'Um guerreiro imponente com porte atlético e presença marcante.',
    Mage: 'Uma figura sábia envolta em vestes místicas, com olhos que brilham com conhecimento.',
    Rogue: 'Ágil e silencioso, move-se com graça e precisão calculada.',
    Paladin: 'Nobre e radiante, sua presença inspira confiança e respeito.',
    Ranger: 'Conectado com a natureza, possui olhos alertas e movimentos precisos.',
    Cleric: 'Sereno e compassivo, irradia uma aura de paz e sabedoria.'
  };

  return classDescriptions[hero.class as keyof typeof classDescriptions] || 
         `${hero.name} possui a presença marcante de um verdadeiro ${hero.class}.`;
}