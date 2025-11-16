import { describe, it, expect } from 'vitest';
import { analyzeContext, generateVariants, applyFeedback } from '../services/narrativeGenerator';

describe('narrativeGenerator', () => {
  it('analisa contexto e define tom', () => {
    const ctx = analyzeContext('O corredor escurece e sombras respiram sobre a forja.');
    expect(ctx.tone).toBe('sombrio');
    expect(ctx.mode).toBe('ambientacao');
  });

  it('gera múltiplas opções únicas com fallback local', async () => {
    const ctx = { baseText: 'Eco do passado em Altharion', tone: 'sombrio', mode: 'ambientacao', world: 'Forjador de Heróis em Altharion' } as const;
    const list = await generateVariants(ctx, 5, { useAI: false, minUniqueness: 0.6 });
    expect(list.length).toBe(5);
    const texts = list.map(x => x.text);
    const set = new Set(texts);
    expect(set.size).toBe(5);
    for (const item of list) {
      expect(item.scores.coherence).toBeGreaterThan(0.5);
      expect(item.scores.adequacy).toBeGreaterThan(0.5);
      expect(item.scores.quality).toBeGreaterThan(0.5);
    }
  });

  it('aplica feedback e recalcula pontuações', async () => {
    const ctx = { baseText: 'Brumas e runas em Altharion', tone: 'misterioso', mode: 'ambientacao', world: 'Forjador de Heróis em Altharion' } as const;
    const list = await generateVariants(ctx, 3, { useAI: false });
    const adjusted = applyFeedback(list, { strengthen: ['lenda'], weaken: ['brumas'] });
    expect(adjusted.length).toBe(3);
    for (const x of adjusted) expect(x.text.toLowerCase()).toContain('lenda');
  });
});