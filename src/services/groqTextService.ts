import { aiService } from './aiService';

export type TextoTipo = 'missao' | 'historia' | 'frase' | 'nome' | 'translate';

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
          'Gere NOME COMPLETO de herói medieval em PT-BR. Responda SOMENTE com duas palavras: primeiro nome e sobrenome, sem aspas, sem pontuação.',
        prompt:
          `Forneça apenas "Nome Sobrenome" épico medieval/fantasia, exatamente duas palavras. Sem epítetos, sem vírgulas, sem explicações. Contexto: ${contexto || 'herói desconhecido'}.`,
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
          `Escreva uma história épica medieval sobre o herói. Contexto: ${contexto || 'herói desconhecido'}. Use o sexo quando fornecido para ajustar pronomes e detalhes. Foque em emoção, imagens vívidas e progresso do herói.`,
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
    case 'translate':
      return {
        systemMessage: 'Translate the provided Portuguese text to natural English suitable for an AI image prompt. Return only the translated text.',
        prompt: String(contexto || ''),
        maxTokens: 300,
        temperature: 0.3
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
    let texto = (resp.text || '').trim();
    if (tipo === 'nome') {
      texto = texto.replace(/["'“”`\.\,;:]/g, '').trim();
      const parts = texto.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) texto = `${parts[0]} ${parts[1]}`;
      else if (parts.length === 1) {
        const surnames = ['da Rocha','do Vale','Silvar','Montclair','Valencius','Stormblade','Noctis','Dawnhart','Ironwood','Winterborn'];
        const s = surnames[Math.floor(Math.random() * surnames.length)];
        texto = `${parts[0]} ${s}`;
      }
    }
    if (texto.length > 0) return texto;
  } catch (e) {
    // ignorado, usamos fallback abaixo
  }
  // Fallback por tipo
  switch (tipo) {
    case 'nome':
      return 'Valen Ironwood';
    case 'frase':
      return 'Por honra e aço, avanço sem medo!';
    case 'historia':
      return 'Sob o céu cinzento, um herói ergueu-se contra a maré de sombras, encontrando coragem nas cicatrizes do passado e esperança no brilho da lâmina. A jornada recomeça, e o destino chama.';
    case 'missao':
    default:
      return 'Missão: Patrulhar os arredores e investigar pegadas suspeitas. Recompensa: 50 ouro e experiência. Dificuldade: normal.';
  }
}

export async function translateToEnglish(text: string): Promise<string> {
  try {
    const { systemMessage, prompt, maxTokens, temperature } = buildParams('translate', text);
    const resp = await aiService.generateTextSafe({ systemMessage, prompt, maxTokens, temperature });
    return (resp.text || '').trim();
  } catch { return ''; }
}
