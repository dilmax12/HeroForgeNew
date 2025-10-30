import { describe, it, expect } from 'vitest';
import { validateAttributes } from './heroStore';

describe('validateAttributes', () => {
  it('deve ser válido quando soma <= 18 e cada atributo <= 10', () => {
    const attrs = {
      forca: 5,
      destreza: 5,
      constituicao: 4,
      inteligencia: 4,
      sabedoria: 0,
      carisma: 0,
    };
    const res = validateAttributes(attrs);
    expect(res.isValid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it('deve falhar quando soma > 18', () => {
    const attrs = {
      forca: 5,
      destreza: 5,
      constituicao: 4,
      inteligencia: 4,
      sabedoria: 0,
      carisma: 1,
    };
    const res = validateAttributes(attrs);
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.includes('excede o máximo de 18'))).toBe(true);
  });

  it('deve falhar quando algum atributo > 10', () => {
    const attrs = {
      forca: 11,
      destreza: 0,
      constituicao: 0,
      inteligencia: 0,
      sabedoria: 0,
      carisma: 0,
    };
    const res = validateAttributes(attrs);
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.includes('não pode exceder 10 pontos'))).toBe(true);
  });

  it('deve falhar quando algum atributo é negativo', () => {
    const attrs = {
      forca: 0,
      destreza: -1,
      constituicao: 0,
      inteligencia: 0,
      sabedoria: 0,
      carisma: 0,
    };
    const res = validateAttributes(attrs);
    expect(res.isValid).toBe(false);
    expect(res.errors.some(e => e.includes('não pode ser negativo'))).toBe(true);
  });
});