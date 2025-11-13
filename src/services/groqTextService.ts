import { aiService } from './aiService';

export type TextoTipo = 'missao' | 'historia' | 'frase' | 'nome';

function buildParams(tipo: TextoTipo, contexto = ''): {
  systemMessage: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
} {
  switch (tipo) {
    case 'nome':
      return {
        systemMessage:
          'Você gera NOME curto de herói medieval em PT-BR. Responda SOMENTE com o nome, 1–2 palavras, sem aspas, sem pontuação.',
        prompt:
          'Gere um nome de herói medieval/fantasia épico e memorável (1–2 palavras). Não inclua explicações.',
        maxTokens: 12,
        temperature: 0.9
      };
    case 'frase':
      return {
        systemMessage:
          'Você cria uma frase de batalha épica em PT-BR, curta, forte e memorável. Responda apenas com a frase.',
        prompt:
          `Crie uma única frase de batalha épica para um herói. Contexto opcional: ${contexto || 'herói classe desconhecida'}. Evite aspas.`,
        maxTokens: 40,
        temperature: 0.8
      };
    case 'historia':
      return {
        systemMessage:
          'Você é um narrador mestre e gera uma história épica medieval em PT-BR (100–200 palavras).',
        prompt:
          `Escreva uma história épica medieval sobre o herói. Contexto: ${contexto || 'herói desconhecido'}. Foque em emoção, imagens vívidas e progresso do herói.`,
        maxTokens: 350,
        temperature: 0.8
      };
    case 'missao':
    default:
      return {
        systemMessage:
          'Você é um mestre de RPG e cria uma missão breve em PT-BR, com objetivo claro e recompensa.',
        prompt:
          `Gere uma missão medieval fantasiosa de dificuldade moderada. Contexto: ${contexto || 'nenhum'}. Inclua título, objetivo principal e recompensa curta.`,
        maxTokens: 200,
        temperature: 0.7
      };
  }
}

export async function gerarTexto(tipo: TextoTipo, contexto = ''): Promise<string> {
  const { systemMessage, prompt, maxTokens, temperature } = buildParams(tipo, contexto);
  try {
    const resp = await aiService.generateTextSafe({
      systemMessage,
      prompt,
      maxTokens,
      temperature
    });
    const texto = (resp.text || '').trim();
    if (texto.length > 0) return texto;
  } catch (e) {
    // ignorado, usamos fallback abaixo
  }
  // Fallback por tipo
  switch (tipo) {
    case 'nome':
      return 'Valen';
    case 'frase':
      return 'Por honra e aço, avanço sem medo!';
    case 'historia':
      return 'Sob o céu cinzento, um herói ergueu-se contra a maré de sombras, encontrando coragem nas cicatrizes do passado e esperança no brilho da lâmina. A jornada recomeça, e o destino chama.';
    case 'missao':
    default:
      return 'Missão: Patrulhar os arredores e investigar pegadas suspeitas. Recompensa: 50 ouro e experiência. Dificuldade: normal.';
  }
}
