import { aiService } from './aiService';

type GenerateTextParams = {
  systemMessage: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
};

async function generate(params: GenerateTextParams): Promise<string> {
  const resp = await aiService.generateText({
    systemMessage: params.systemMessage,
    prompt: params.prompt,
    maxTokens: params.maxTokens ?? 220,
    temperature: params.temperature ?? 0.8,
  });
  return (resp.text || '').trim();
}

function narratorSystem(): string {
  return (
    'Você é o MESTRE DO JOGO em um RPG medieval de fantasia. ' +
    'Fale como um narrador envolvente, em PT-BR, com tom épico e emocional. ' +
    'Use 1–3 frases no máximo, sem listas, sem aspas.'
  );
}

export async function generateDMLine(opts: {
  route: string;
  heroName?: string;
  heroClass?: string;
}): Promise<string> {
  const { route, heroName = 'herói', heroClass = 'classe desconhecida' } = opts;
  const prompt = `Contexto de rota: ${route}. O herói é ${heroName} (${heroClass}). ` +
    'Produza UMA fala curta do mestre do jogo, comentando a cena atual e motivando o herói a avançar.';
  return generate({ systemMessage: narratorSystem(), prompt, maxTokens: 120, temperature: 0.7 });
}

export async function generateOutcomeNarrative(opts: {
  heroName?: string;
  questTitle?: string;
  success: boolean;
  consequence?: string;
  rewardSummary?: string;
}): Promise<string> {
  const { heroName = 'herói', questTitle = 'missão', success, consequence = '', rewardSummary = '' } = opts;
  const outcome = success ? 'vitória' : 'revés';
  const prompt = 
    `Gere uma narração breve (2–3 frases) sobre o resultado da missão "${questTitle}" ` +
    `do herói ${heroName}. Resultado: ${outcome}. ` +
    (rewardSummary ? `Recompensas: ${rewardSummary}. ` : '') +
    (consequence ? `Consequências: ${consequence}. ` : '') +
    'Realce emoção, tensão e aprendizado, sem usar aspas.';
  return generate({ systemMessage: narratorSystem(), prompt, maxTokens: 160, temperature: 0.8 });
}

export async function generateChapterOutline(opts: {
  heroName?: string;
  heroClass?: string;
  worldHint?: string;
  priorThreads?: string[];
  chapters?: number;
}): Promise<string[]> {
  const { heroName = 'herói', heroClass = 'classe desconhecida', worldHint = 'mundo medieval fantástico', priorThreads = [], chapters = 4 } = opts;
  const prior = priorThreads.length ? `Fios narrativos prévios: ${priorThreads.join('; ')}.` : 'Sem fios narrativos prévios.';
  const prompt =
    `Crie ${chapters} títulos de capítulos com uma linha de resumo cada, ` +
    `para a jornada de ${heroName} (${heroClass}) em ${worldHint}. ${prior} ` +
    'Cada capítulo deve ter NOME curto (3–5 palavras) e um resumo de 1 frase, mantendo continuidade simples. ' +
    'Responda em linhas separadas no formato: Título — resumo.';
  const text = await generate({ systemMessage: narratorSystem(), prompt, maxTokens: 300, temperature: 0.85 });
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length);
}

