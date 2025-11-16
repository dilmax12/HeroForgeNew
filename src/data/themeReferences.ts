export type ThemeReferences = {
  universe: string;
  coreKeywords: string[];
  motifs: string[];
  toneLexicon: Record<string, string[]>;
  styleRules: string[];
  forbidden: string[];
};

export const THEME_REFERENCES: ThemeReferences = {
  universe: 'Forjador de Heróis em Altharion',
  coreKeywords: [
    'Altharion',
    'Guilda dos Aventureiros',
    'Forjador de Heróis',
    'masmorras',
    'runas',
    'forja',
    'facções',
    'ritual',
    'lore',
    'treinamento'
  ],
  motifs: [
    'sombras antigas',
    'eco do passado',
    'pedras e runas',
    'memórias ancoradas',
    'voz do narrador',
    'perigo iminente',
    'escolhas com consequência',
    'masmorras vivas',
    'forja simbólica',
    'heróis moldados'
  ],
  toneLexicon: {
    sombrio: ['sombras', 'sussurros', 'brumas', 'frio', 'eco', 'fenda', 'mirra', 'ferrugem'],
    épico: ['glória', 'estandarte', 'juramento', 'lenda', 'retidão', 'virtude', 'destino'],
    misterioso: ['enigmas', 'segredos', 'símbolos', 'labirinto', 'runa', 'portal', 'suspiro']
  },
  styleRules: [
    'português brasileiro',
    'descrições vívidas',
    'sensações físicas e auditivas',
    'tom consistente com medieval fantástico',
    'variação lexical sem repetir frases'
  ],
  forbidden: ['sci-fi moderno', 'terminologia tecnológica contemporânea', 'gírias digitais']
};

export function getThemeKeywords(): string[] {
  return [...THEME_REFERENCES.coreKeywords, ...THEME_REFERENCES.motifs];
}

export function getToneWords(tone: keyof ThemeReferences['toneLexicon']): string[] {
  return THEME_REFERENCES.toneLexicon[tone] || [];
}