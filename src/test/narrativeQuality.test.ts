import { describe, it, expect } from 'vitest';
import { uniquenessBetween, pairwiseUniqueness, coherenceScore, adequacyScore, qualityScore, enforceThresholds } from '../services/narrativeQuality';

describe('narrativeQuality', () => {
  it('calcula unicidade baixa para textos similares', () => {
    const a = 'A sombra avança sobre Altharion. A Guilda observa.';
    const b = 'A sombra avança sobre Altharion. A Guilda observa e silencia.';
    const u = uniquenessBetween(a, b);
    expect(u).toBeLessThan(0.6);
  });

  it('calcula unicidade alta para textos diferentes', () => {
    const a = 'Runas tremulam nas paredes da forja, o ar pesa.';
    const b = 'A estrada abre-se entre bosques e brumas, o estandarte ergue-se.';
    const u = uniquenessBetween(a, b);
    expect(u).toBeGreaterThan(0.7);
  });

  it('coerência e adequação sobem com termos do universo', () => {
    const t = 'Em Altharion, a Guilda dos Aventureiros convoca o Forjador de Heróis nas masmorras vivas.';
    expect(coherenceScore(t)).toBeGreaterThan(0.5);
    expect(adequacyScore(t)).toBeGreaterThan(0.6);
  });

  it('qualidade penaliza textos muito curtos e repetições', () => {
    const short = 'Texto breve sem estrutura.';
    const rep = 'eco eco eco eco eco eco eco eco';
    expect(qualityScore(short)).toBeLessThan(0.5);
    expect(qualityScore(rep)).toBeLessThan(0.5);
  });

  it('enforceThresholds valida conjunto com unicidade e qualidade', () => {
    const texts = [
      'Sombras e brumas cercam a forja de Altharion, a Guilda observa.',
      'Luz de tochas em Altharion revela inscrições antigas, a Guilda pesa juramentos.',
      'Cantos da Guilda ecoam nos salões, o ritual do Forjador pede um preço.'
    ];
    const u = pairwiseUniqueness(texts);
    expect(u.avg).toBeGreaterThan(0.55);
    const ok = enforceThresholds(texts, 0.4);
    expect(ok).toBe(true);
    const nearDup = [...texts, texts[0]];
    const ok2 = enforceThresholds(nearDup, 0.8);
    expect(ok2).toBe(false);
    const u2 = pairwiseUniqueness(texts);
    expect(u2.min).toBeGreaterThan(0.6);
  });
});