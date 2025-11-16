import { THEME_REFERENCES } from '../data/themeReferences';

export type QualityScores = {
  uniqueness: number;
  coherence: number;
  adequacy: number;
  quality: number;
};

export function normalize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-zà-ú0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.split(' ');
}

function trigrams(tokens: string[]): string[] {
  const grams: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) grams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  return grams;
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function uniquenessBetween(a: string, b: string): number {
  const ta = normalize(a);
  const tb = normalize(b);
  const sim = jaccard(ta, tb);
  return 1 - sim;
}

export function pairwiseUniqueness(texts: string[]): { min: number; avg: number } {
  if (texts.length < 2) return { min: 1, avg: 1 };
  let min = 1;
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const u = uniquenessBetween(texts[i], texts[j]);
      min = Math.min(min, u);
      sum += u;
      cnt++;
    }
  }
  return { min, avg: cnt ? sum / cnt : 1 };
}

export function coherenceScore(text: string): number {
  const t = text.toLowerCase();
  const keys = [...THEME_REFERENCES.coreKeywords, ...THEME_REFERENCES.motifs].map(k => k.toLowerCase());
  let hit = 0;
  for (const k of keys) if (t.includes(k)) hit++;
  const score = Math.min(1, 0.3 + hit * 0.2);
  return score;
}

export function adequacyScore(text: string): number {
  const required = ['altharion', 'forjador', 'guilda'];
  const t = normalize(text);
  let score = 0;
  for (const r of required) if (t.includes(r)) score += 0.34;
  const motifBonus = coherenceScore(text) * 0.3;
  return Math.min(1, score + motifBonus);
}

export function qualityScore(text: string): number {
  const len = text.trim().length;
  const sentences = text.split(/[.!?…]/).filter(s => s.trim().length > 0).length;
  const punctuationVar = /[,;:—–\-]/.test(text) ? 0.1 : 0;
  const repetitionPenalty = /(\b\w+\b)(?:\s+\1){2,}/i.test(text) ? -0.3 : 0;
  const ptTokens = normalize(text);
  const ptStop = ['de', 'que', 'e', 'em', 'para', 'como'];
  const stopPresence = ptStop.filter(s => ptTokens.includes(s)).length >= 3 ? 0.2 : 0.05;
  const sentenceFactor = Math.min(0.5, sentences * 0.05);
  const lengthAdj = len < 120 ? -0.15 : 0.1;
  let score = 0.45 + sentenceFactor + punctuationVar + stopPresence + repetitionPenalty + lengthAdj;
  return Math.max(0, Math.min(1, score));
}

export function evaluateText(text: string): QualityScores {
  return {
    uniqueness: 1,
    coherence: coherenceScore(text),
    adequacy: adequacyScore(text),
    quality: qualityScore(text)
  };
}

export function enforceThresholds(texts: string[], minUniqueness = 0.6): boolean {
  const u = pairwiseUniqueness(texts);
  if (u.avg < minUniqueness) return false;
  for (const t of texts) {
    const c = coherenceScore(t);
    const a = adequacyScore(t);
    const q = qualityScore(t);
    if (c < 0.5 || a < 0.5 || q < 0.45) return false;
  }
  return true;
}