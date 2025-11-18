import { generateMixed, generateDialogue } from './dialogueEngine';

const mk = (id: string) => ({
  id,
  name: 'NPC',
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

test('generateMixed returns lines fast', () => {
  const npc = mk('n1');
  const player = mk('p1');
  const t0 = performance.now();
  const lines = generateMixed(npc, player, 3);
  const dt = performance.now() - t0;
  expect(lines.length).toBeGreaterThan(0);
  expect(dt).toBeLessThan(200);
});

test('generateDialogue tags', () => {
  const npc = mk('n2');
  const player = mk('p2');
  const lines = generateDialogue(npc, player, ['gossip'], 1);
  expect(lines.length).toBeGreaterThan(0);
});