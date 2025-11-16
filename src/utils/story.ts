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
    forca: 'força',
    destreza: 'destreza',
    constituicao: 'constituição',
    inteligencia: 'inteligência',
    sabedoria: 'sabedoria',
    carisma: 'carisma'
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

export const ALTHARION_LORE_VERSIONS = {
  short: {
    id: 'short',
    title: 'Versão Curta',
    usage: ['menu', 'galeria', 'tela_inicial'],
    lang: 'pt-BR',
    paragraphs: [
      'Há muito tempo, as terras de Altharion foram marcadas por perigos antigos e masmorras mortais.',
      'Para proteger os novos aventureiros, surgiu a Guilda dos Aventureiros, que criou um programa único de treinamento: o Forjador de Heróis.',
      'Agora, cada novo herói é moldado com sabedoria, disciplina e escolhas que definirão o destino do mundo.'
    ]
  },
  cinematic: {
    id: 'cinematic',
    title: 'Versão Cinematográfica',
    usage: ['trailer', 'vídeo_épico'],
    lang: 'pt-BR',
    script: [
      '“Em um mundo onde as sombras renascem…”',
      '“Onde masmorras devoram os despreparados…”',
      'Corta para ruínas antigas e uma chama azul acendendo.',
      '“A Guilda dos Aventureiros de Altharion ergueu-se para trazer ordem ao caos.”',
      'Imagens de aventureiros sendo treinados, batalhando, caindo, levantando.',
      '“Mas tantas vidas foram perdidas nos abismos esquecidos…”',
      '“…que a Guilda criou algo novo.”',
      'Aparece um símbolo brilhante: Forjador de Heróis',
      '“Um programa forjado em suor, sabedoria e magia.”',
      '“Um ritual capaz de moldar não apenas guerreiros…”',
      '“…mas lendas.”',
      'Som de espada sendo desembainhada.',
      '“Agora, é sua vez.”',
      '“Entre nas masmorras, tome decisões que ecoarão para sempre…”',
      '“…e torne-se aquilo que Altharion tanto precisa.”',
      'Fade-out:',
      '“O Forjador de Heróis aguarda.”'
    ]
  },
  game_intro: {
    id: 'game_intro',
    title: 'Narração Inicial do Jogo',
    usage: ['intro'],
    lang: 'pt-BR',
    lines: [
      'Bem-vindo a Altharion.',
      'Estas terras outrora foram prósperas, mas com o despertar das antigas masmorras, o perigo retornou como nunca antes.',
      'Durante anos, aventureiros inexperientes caíram nos labirintos sombrios… e muitos nunca voltaram.',
      'Para conter tantas perdas, surgiu a Guilda dos Aventureiros de Altharion, uma ordem dedicada a treinar, orientar e organizar aqueles que ousam desafiar o desconhecido.',
      'Depois de inúmeras mortes, a Guilda criou sua maior obra:',
      'o Forjador de Heróis, um sistema de formação capaz de preparar qualquer aspirante para enfrentar os horrores das profundezas.',
      'Agora, você está aqui.',
      'Seu nome será registrado.',
      'Suas escolhas moldarão seu destino… e talvez o destino do mundo.',
      'A forja está acesa.',
      'Sua jornada começa agora.'
    ]
  },
  topics: {
    id: 'topics',
    title: 'Versão em Tópicos',
    usage: ['wiki', 'documentacao', 'historia_do_mundo'],
    lang: 'pt-BR',
    sections: [
      {
        id: 'origem_de_altharion',
        title: 'Origem de Altharion',
        bullets: [
          'Mundo antigo com vastos reinos, ruínas esquecidas e masmorras vivas.',
          'Portais arcanos abriram passagens para criaturas do além.',
          'A magia primal permeia tudo, moldando a realidade e corrompendo territórios.'
        ]
      },
      {
        id: 'problema_original',
        title: 'Masmorras devorando aventureiros',
        bullets: [
          'As masmorras não são apenas lugares — são entidades vivas e mutáveis.',
          'A cada geração, a taxa de mortes entre aventureiros crescia.',
          'Jovens guerreiros entravam despreparados, confiando apenas na coragem.'
        ]
      },
      {
        id: 'criacao_da_guilda',
        title: 'A criação da Guilda dos Aventureiros',
        bullets: [
          'Formada por veteranos que sobreviveram aos piores horrores.',
          'Organização responsável por distribuir missões, registrar aventureiros, manter a ordem entre as facções, investigar as masmorras, coordenar times para expedições.'
        ]
      },
      {
        id: 'forjador_de_herois',
        title: 'Nasce o Forjador de Heróis',
        bullets: [
          'Criado após inúmeras mortes desnecessárias.',
          'Objetivo: preparar novatos psicologicamente, fisicamente e espiritualmente.',
          'Sistema que treina atributos, guia decisões, oferece missões graduais, simula combate, registra reputação com facções, molda o caráter do herói desde o começo.',
          'Por isso é chamado de Forjador: seu herói é literalmente moldado.'
        ]
      },
      {
        id: 'foco_do_mundo',
        title: 'O foco do mundo',
        bullets: [
          'As decisões moldam a narrativa.',
          'Facções reagem às escolhas do jogador.',
          'Ranks definem quão longe ele pode ir.',
          'Masmorras profundas exigem preparo.',
          'A Guilda observa e registra tudo.'
        ]
      }
    ]
  },
  full: {
    id: 'full',
    title: 'Lore Definitiva',
    usage: ['lore_completa'],
    lang: 'pt-BR',
    paragraphs: [
      'Antes das grandes cidades, antes dos reinos erguerem seus brasões, Altharion era apenas uma terra selvagem.',
      'A magia primal corria como rios invisíveis, despertando criaturas nas profundezas e moldando florestas inteiras.',
      'Com o passar das eras, homens e mulheres ousaram explorar o desconhecido… e descobriram as Masmorras Vivas: estruturas que se expandiam, consumiam energia e renasciam.',
      'Muitos se voluntariavam para enfrentar tais lugares — jovens sonhadores, guerreiros orgulhosos, curiosos inconsequentes.',
      'Mas as masmorras eram cruéis, adaptativas, imprevisíveis. E assim começou o que ficou conhecido como A Era das Perdas.',
      'Uma geração inteira foi consumida pelos abismos.',
      'Fundada pelos poucos veteranos sobreviventes, a Guilda assumiu para si a responsabilidade de treinar aventureiros, investigar as masmorras, manter a ordem entre as facções, impedir que o caos se espalhe pelas cidades, proteger Altharion de ameaças arcanas.',
      'Mas mesmo com toda sua disciplina, as mortes continuavam. Foi então que surgiu a ideia que mudaria tudo.',
      'A Guilda concluiu que não bastava treinar aventureiros. Era preciso moldá-los desde a base.',
      'Assim nasceu o Forjador de Heróis — um programa único, criado para testar personalidade, coragem e espírito; equilibrar atributos; guiar decisões morais; expor o herói a desafios graduais; desenvolver reputação com facções; simular situações reais de combate; introduzir o herói ao mundo através de histórias interativas.',
      'Cada aventureiro passa por um ritual simbólico: a Forja, onde seu destino começa a ser escrito.',
      'Você é um dos aspirantes. Mas diferente dos outros… suas escolhas realmente mudarão o mundo.',
      'Alianças serão feitas e quebradas. Facções responderão às suas ações. Missões terão consequências. As masmorras reagirão ao seu estilo de jogo.',
      'E, acima de tudo, o Forjador de Heróis testará se você é digno de se tornar uma lenda de Altharion.'
    ]
  }
} as const;

export function getAltharionLore<K extends keyof typeof ALTHARION_LORE_VERSIONS>(version: K) {
  return ALTHARION_LORE_VERSIONS[version];
}
