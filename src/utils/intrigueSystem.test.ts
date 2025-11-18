import { spreadRumor } from './intrigueSystem';

const mk = (id: string, name: string) => ({
  id,
  name,
  class: 'guerreiro',
  race: 'humano',
  level: 1,
  attributes: { forca: 3, destreza: 3, constituicao: 3, inteligencia: 3, sabedoria: 3, carisma: 3 },
  derivedAttributes: { hp: 30, mp: 10, initiative: 10, armorClass: 10, currentHp: 30, currentMp: 10, luck: 0, power: 20 },
  progression: { xp: 0, level: 1, gold: 0, reputation: 0 },
  inventory: { items: {} },
  element: 'physical',
  skills: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  socialRelations: {},
} as any);

test('spreadRumor decreases relation of audience with target', () => {
  const source = mk('s','Fonte');
  const target = mk('t','Alvo');
  const a1 = mk('a1','A1');
  const a2 = mk('a2','A2');
  spreadRumor(source, target, [a1,a2], 5);
  expect((a1.socialRelations[target.id] || 0) <= -5).toBeTruthy();
});