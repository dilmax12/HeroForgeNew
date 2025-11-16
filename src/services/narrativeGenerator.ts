import { aiService } from './aiService';
import { THEME_REFERENCES, getToneWords } from '../data/themeReferences';
import { pairwiseUniqueness, evaluateText, enforceThresholds } from './narrativeQuality';

export type GenerateContext = {
  baseText?: string;
  mode?: 'ambientacao' | 'dialogo' | 'missao';
  tone?: 'sombrio' | 'épico' | 'misterioso';
  world?: string;
};

export type GeneratedNarrative = {
  text: string;
  scores: {
    uniqueness: number;
    coherence: number;
    adequacy: number;
    quality: number;
  };
};

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-zà-ú0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim().split(' ');
}

function hashText(s: string): string {
  const str = s || '';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return `h${Math.abs(h).toString(36)}`;
}

function buildSystemPrompt(tone: GenerateContext['tone']): string {
  const toneWords = tone ? getToneWords(tone) : [];
  const toneLine = toneWords.length ? `Use léxico ${tone}: ${toneWords.join(', ')}` : 'Mantenha tom sombrio e misterioso.';
  return [
    'Você é um gerador narrativo do universo Forjador de Heróis em Altharion.',
    'Produza textos únicos, coerentes, com descrições vívidas e em português brasileiro.',
    'Evite elementos fora do medieval fantástico e preserve consistência com a Guilda dos Aventureiros e as Masmorras Vivas.',
    toneLine
  ].join('\n');
}

function buildPrompt(ctx: GenerateContext): string {
  const base = ctx.baseText || '';
  const mode = ctx.mode || 'ambientacao';
  const tone = ctx.tone || 'sombrio';
  const world = ctx.world || THEME_REFERENCES.universe;
  const lore = 'Altharion, Guilda dos Aventureiros, Forjador de Heróis, masmorras vivas, runas antigas';
  const directive = mode === 'dialogo'
    ? 'Crie diálogo curto entre narrador e herói, mantendo mistério e perigo iminente.'
    : mode === 'missao'
    ? 'Crie proposta de missão com objetivo, local, ameaça e recompensa, entre 80-120 palavras.'
    : 'Crie ambientação sensorial entre 120-220 palavras com foco em sombras, ecos e decisões.';
  return [
    `Tema: ${world}`,
    `Tom: ${tone}`,
    `Referências: ${lore}`,
    `Diretriz: ${directive}`,
    base ? `Contexto: ${base}` : ''
  ].filter(Boolean).join('\n');
}

function localVariant(ctx: GenerateContext, seed: number): string {
  const tone = ctx.tone || 'sombrio';
  const words = getToneWords(tone);
  const motifs = THEME_REFERENCES.motifs;
  const cores = THEME_REFERENCES.coreKeywords;
  const pick = (arr: string[]) => arr[(seed + arr.length) % arr.length];
  const a = pick(motifs);
  const b = pick(words.length ? words : ['eco']);
  const c = pick(cores);
  const d = pick(motifs.slice().reverse());
  const e = pick(cores.slice().reverse());
  const open = `O ${a} se adensa enquanto ${b} ronda o corredor. Em ${c}, decisões gravam cicatrizes.`;
  const body = `A pedra responde ao passo e o ar pesa com memórias. Runas tremulam, a forja sussurra um ritual. A Guilda observa em silêncio. Facções medem lealdades. Em Altharion, cada escolha exige preço.`;
  const close = `O ${d} revela sinais e ${e} cobra lembranças. Perigo anuncia cortesia. Mistério não.`;
  const extra = ctx.mode === 'missao'
    ? 'Missão: investigar vestígios nas masmorras vivas, recuperar um nó de vidro, evitar colapso de portais. Recompensa: reputação e relíquia.'
    : ctx.mode === 'dialogo'
    ? 'Narrador: Escolha sem olhar atrás. Herói: O mapa dobra onde o nome não cabe.'
    : '';
  return [open, body, close, extra].filter(Boolean).join(' ');
}

export async function generateVariants(ctx: GenerateContext, count = 4, opts?: { useAI?: boolean; minUniqueness?: number }): Promise<GeneratedNarrative[]> {
  const useAI = opts?.useAI ?? true;
  const minU = opts?.minUniqueness ?? 0.6;
  const results: GeneratedNarrative[] = [];
  const seen = new Set<string>();
  let attempt = 0;
  while (results.length < count && attempt < count * 3) {
    let text = '';
    if (useAI && aiService.isConfigured()) {
      const res = await aiService.generateTextSafe({
        prompt: buildPrompt(ctx),
        systemMessage: buildSystemPrompt(ctx.tone),
        maxTokens: 300,
        temperature: 0.8
      });
      text = res.text.trim();
    } else {
      text = localVariant(ctx, results.length + attempt);
    }
    const h = hashText(text);
    if (seen.has(h)) {
      attempt++;
      continue;
    }
    const scores = evaluateText(text);
    results.push({ text, scores });
    seen.add(h);
    attempt++;
  }
  const texts = results.map(r => r.text);
  const ok = enforceThresholds(texts, minU);
  if (!ok && useAI) {
    return generateVariants({ ...ctx, tone: ctx.tone || 'sombrio' }, count, { useAI: false, minUniqueness: minU });
  }
  return results;
}

export function analyzeContext(base: string): GenerateContext {
  const tokens = tokenize(base);
  const tone: GenerateContext['tone'] = tokens.includes('sombras') || tokens.includes('trevas') ? 'sombrio' : tokens.includes('lenda') ? 'épico' : 'misterioso';
  return { baseText: base, tone, mode: 'ambientacao', world: THEME_REFERENCES.universe };
}

export function applyFeedback(texts: GeneratedNarrative[], feedback: { strengthen?: string[]; weaken?: string[] }): GeneratedNarrative[] {
  const strong = new Set((feedback.strengthen || []).map(s => s.toLowerCase()));
  const weak = new Set((feedback.weaken || []).map(s => s.toLowerCase()));
  return texts.map(t => {
    let x = t.text;
    for (const s of strong) if (!x.toLowerCase().includes(s)) x = `${x} ${s}`;
    for (const w of weak) x = x.replace(new RegExp(w, 'gi'), '');
    const scores = evaluateText(x);
    return { text: x.trim(), scores };
  });
}