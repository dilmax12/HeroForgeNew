import { HeroCreationData, HeroAttributes } from '../types/hero';

const classVariations: Record<string, string[]> = {
  guerreiro: [
    '${name} treinou entre aço e fogo, moldando sua coragem nas batalhas de ${place}.',
    'Chamado de "Escudo de ${place}", ${name} ergueu sua lâmina para proteger os fracos.',
    'Em ${place}, ${name} aprendeu que disciplina vale mais que força bruta.',
    'Quando os tambores ecoaram em ${place}, ${name} avançou sem hesitar.',
    'Cada cicatriz de ${name} conta uma história de honra e dever em ${place}.'
  ],
  mago: [
    '${name} estudou grimórios antigos em ${place}, dominando segredos arcanos.',
    'Chamado de "Sábio de ${place}", ${name} manipula o véu entre mundos.',
    'Em ${place}, ${name} aprendeu que conhecimento é a maior arma.',
    'Quando as estrelas alinharam-se sobre ${place}, ${name} recitou um antigo encantamento.',
    'As runas de ${place} sussurraram o destino de ${name} nas noites longas.'
  ],
  ladino: [
    'Nas sombras de ${place}, ${name} move-se como o vento.',
    'Chamado de "Eco de ${place}", ${name} nunca está onde o inimigo espera.',
    'Em ${place}, ${name} aprendeu que silêncio pode ser mais poderoso que aço.',
    'Quando a lua caiu sobre ${place}, ${name} roubou o segredo que virou a guerra.',
    'Cada passo de ${name} em ${place} deixa apenas perguntas e nenhum rastro.'
  ],
  clerigo: [
    'Sob as bênçãos em ${place}, ${name} cura feridas e expulsa trevas.',
    'Chamado de "Luz de ${place}", ${name} mantém a fé firme sob qualquer tormenta.',
    'Em ${place}, ${name} aprendeu que compaixão é coragem de outro tipo.',
    'Quando as campanas tocaram em ${place}, ${name} respondeu com oração e ação.',
    'Cada milagre de ${name} em ${place} acende esperança onde antes havia medo.'
  ],
  patrulheiro: [
    'Entre florestas de ${place}, ${name} conhece cada trilha e rastro.',
    'Chamado de "Guia de ${place}", ${name} anda onde poucos sobrevivem.',
    'Em ${place}, ${name} aprendeu que paciência supera pressa.',
    'Quando o vento mudou em ${place}, ${name} já sabia o caminho seguro.',
    'Os animais de ${place} reconhecem ${name} como parte da própria natureza.'
  ],
  paladino: [
    'Jurando votos em ${place}, ${name} combate o mal com retidão.',
    'Chamado de "Voto de ${place}", ${name} não recua diante da injustiça.',
    'Em ${place}, ${name} aprendeu que a verdade é lâmina afiada.',
    'Quando a escuridão caiu sobre ${place}, ${name} ergueu o estandarte da luz.',
    'Cada ato de ${name} em ${place} grava um exemplo de virtude.'
  ]
};

const places = ['Alto Vale', 'Muralha de Pedra', 'Costa Âmbar', 'Planícies de Ébano', 'Bosque das Runas'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dominantAttribute(attrs: HeroAttributes): { key: keyof HeroAttributes; label: string } {
  const labels: Record<keyof HeroAttributes, string> = {
    forca: 'força',
    destreza: 'destreza',
    constituicao: 'constituição',
    inteligencia: 'inteligência',
    sabedoria: 'sabedoria',
    carisma: 'carisma'
  };
  const entries = Object.entries(attrs) as [keyof HeroAttributes, number][];
  const [key] = entries.reduce((max, cur) => (cur[1] > max[1] ? cur : max), entries[0]);
  return { key, label: labels[key] };
}

export function generateStory(hero: HeroCreationData): string {
  const base = pick(classVariations[hero.class] || classVariations['guerreiro']);
  const place = pick(places);
  const dom = dominantAttribute(hero.attributes);
  const template = base
    .replaceAll('${name}', hero.name || 'Sem Nome')
    .replaceAll('${place}', place);
  // Garante menção a pelo menos um atributo
  const attributeLine = `Sua maior virtude é a ${dom.label}.`;
  return `${template} ${attributeLine}`;
}