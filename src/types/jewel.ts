export type JewelType = 'vermelha' | 'azul' | 'verde' | 'amarela' | 'roxa';

export interface JewelBonus {
  forca?: number;
  inteligencia?: number;
  destreza?: number;
  constituicao?: number;
  armorClass?: number;
}

export class Jewel {
  id: string;
  tipo: JewelType;
  cor: string;
  nivel: number;
  baseBonus: JewelBonus;

  constructor(id: string, tipo: JewelType, nivel: number) {
    this.id = id;
    this.tipo = tipo;
    this.nivel = Math.max(1, Math.min(10, nivel));
    this.cor = Jewel.getColorForType(tipo);
    this.baseBonus = Jewel.getBaseBonusForType(tipo);
  }

  static getColorForType(tipo: JewelType): string {
    if (tipo === 'vermelha') return '#EF4444';
    if (tipo === 'azul') return '#3B82F6';
    if (tipo === 'verde') return '#10B981';
    if (tipo === 'amarela') return '#F59E0B';
    return '#8B5CF6';
  }

  static getBaseBonusForType(tipo: JewelType): JewelBonus {
    if (tipo === 'vermelha') return { forca: 2 };
    if (tipo === 'azul') return { inteligencia: 2 };
    if (tipo === 'verde') return { destreza: 2 };
    if (tipo === 'amarela') return { armorClass: 1 };
    return { constituicao: 2 };
  }

  getBonus(): JewelBonus {
    const mult = 1 + (this.nivel - 1) * 0.2;
    const out: JewelBonus = {};
    if (this.baseBonus.forca) out.forca = Math.round(this.baseBonus.forca * mult);
    if (this.baseBonus.inteligencia) out.inteligencia = Math.round(this.baseBonus.inteligencia * mult);
    if (this.baseBonus.destreza) out.destreza = Math.round(this.baseBonus.destreza * mult);
    if (this.baseBonus.constituicao) out.constituicao = Math.round(this.baseBonus.constituicao * mult);
    if (this.baseBonus.armorClass) out.armorClass = Math.round(this.baseBonus.armorClass * mult);
    return out;
  }

  static canFuse(a: Jewel, b: Jewel): boolean {
    return a.tipo === b.tipo && a.nivel === b.nivel && a.nivel < 10;
  }

  static fuse(a: Jewel, b: Jewel): Jewel | null {
    if (!Jewel.canFuse(a, b)) return null;
    return new Jewel(crypto.randomUUID(), a.tipo, a.nivel + 1);
  }

  static minHeroLevelToEquip(nivel: number): number {
    return Math.max(1, Math.min(99, nivel * 3));
  }
}