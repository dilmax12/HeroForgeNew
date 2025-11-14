import { Egg, EggIdentifiedInfo, EggRarity, Pet, PetClass, PetElementType, PetMutationInfo, PetStage, HeroAttributes } from '../types/hero';
import { v4 as uuidv4 } from 'uuid';

export const EGG_IDENTIFY_COST: Record<EggRarity, { min: number; max: number }> = {
  comum: { min: 50, max: 80 },
  incomum: { min: 80, max: 150 },
  raro: { min: 150, max: 300 },
  epico: { min: 300, max: 500 },
  lendario: { min: 400, max: 800 },
  mistico: { min: 600, max: 1200 }
};

export const INCUBATION_MS: Record<EggRarity, number> = {
  comum: 5 * 60 * 1000,
  incomum: 15 * 60 * 1000,
  raro: 60 * 60 * 1000,
  epico: 3 * 60 * 60 * 1000,
  lendario: 6 * 60 * 60 * 1000,
  mistico: 12 * 60 * 60 * 1000
};

export function generateMysteryEgg(rarity?: EggRarity): Egg {
  const baseRarities: EggRarity[] = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
  const roll = Math.random();
  const chosen: EggRarity = rarity || (roll > 0.98 ? 'lendario' : roll > 0.9 ? 'epico' : roll > 0.7 ? 'raro' : roll > 0.4 ? 'incomum' : 'comum');
  const templates: Array<{ name: string; type: PetElementType; rarity: EggRarity }> = [
    { name: 'Ovo Feral Lacrado', type: 'feral', rarity: 'raro' },
    { name: 'Ovo Arcano Reluzente', type: 'arcano', rarity: 'epico' },
    { name: 'Ovo Sagrado Ancestral', type: 'sagrado', rarity: 'lendario' },
    { name: 'Ovo Sombrio Profano', type: 'sombrio', rarity: 'epico' },
    { name: 'Ovo Místico do Véu', type: 'arcano', rarity: 'mistico' }
  ];
  let name = 'Ovo Misterioso';
  const candidatesForName: Record<string, string[]> = {
    'Ovo Feral Lacrado': ['Lobinho Cinzento', 'Javali Espinhoso', 'Raposa de Cinzas'],
    'Ovo Arcano Reluzente': ['Espectro de Mana', 'Fada Celeste', 'Arcanídeo'],
    'Ovo Sagrado Ancestral': ['Espírito Guardião', 'Grifo Jovem', 'Fenrir Branco'],
    'Ovo Sombrio Profano': ['Corvo Sombrio', 'Shade Menor', 'Hiena Macabra'],
    'Ovo Místico do Véu': ['Silfo do Véu', 'Serafim Menor', 'Arconte Luminal']
  };
  if (chosen === 'raro' || chosen === 'epico' || chosen === 'lendario') {
    const pool = templates.filter(t => t.rarity === chosen);
    if (pool.length && Math.random() < 0.6) {
      name = pool[Math.floor(Math.random() * pool.length)].name;
    }
  }
  return {
    id: uuidv4(),
    name,
    status: 'misterioso',
    baseRarity: chosen,
    description: 'Um ovo encontrado em locais perigosos. Só a Guilda pode dizer o que há dentro.',
    createdAt: new Date().toISOString()
  };
}

const TYPES: PetElementType[] = ['feral', 'arcano', 'sagrado', 'sombrio'];
const CLASSES: PetClass[] = ['coleta', 'combate', 'suporte'];

export function identifyEgg(egg: Egg): EggIdentifiedInfo {
  let type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const petClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
  const rarity = egg.baseRarity;
  const skillChancePercent = rarity === 'comum' ? 5 : rarity === 'incomum' ? 8 : rarity === 'raro' ? 12 : rarity === 'epico' ? 16 : rarity === 'lendario' ? 22 : 28;
  const bonus: Partial<HeroAttributes> = petClass === 'combate'
    ? { forca: 2 }
    : petClass === 'suporte'
      ? { sabedoria: 2 }
      : { destreza: 2 };
  let candidates: string[] | undefined;
  if (egg.name === 'Ovo Feral Lacrado') { type = 'feral'; candidates = ['Lobinho Cinzento', 'Javali Espinhoso', 'Raposa de Cinzas']; }
  if (egg.name === 'Ovo Arcano Reluzente') { type = 'arcano'; candidates = ['Espectro de Mana', 'Fada Celeste', 'Arcanídeo']; }
  if (egg.name === 'Ovo Sagrado Ancestral') { type = 'sagrado'; candidates = ['Espírito Guardião', 'Grifo Jovem', 'Fenrir Branco']; }
  if (egg.name === 'Ovo Sombrio Profano') { type = 'sombrio'; candidates = ['Corvo Sombrio', 'Shade Menor', 'Hiena Macabra']; }
  if (egg.name === 'Ovo Místico do Véu') { type = 'arcano'; candidates = ['Silfo do Véu', 'Serafim Menor', 'Arconte Luminal']; }
  const revealedName = egg.name.startsWith('Ovo ') ? egg.name : `Ovo ${capitalize(type)} ${capitalize(rarity)}`;
  return { type, petClass, rarity, initialBonus: bonus, skillChancePercent, revealedName, candidates };
}

export function incubateEgg(egg: Egg): Egg {
  const ms = INCUBATION_MS[egg.identified?.rarity || egg.baseRarity];
  return { ...egg, status: 'incubando', incubationEndsAt: new Date(Date.now() + ms).toISOString() };
}

export function canHatch(egg: Egg): boolean {
  if (!egg.incubationEndsAt) return false;
  return Date.now() >= new Date(egg.incubationEndsAt).getTime();
}

export function markReadyToHatch(egg: Egg): Egg {
  if (!egg.incubationEndsAt) return egg;
  if (canHatch(egg)) return { ...egg, status: 'pronto_para_chocar' };
  return egg;
}

export function rollMutation(rarity: EggRarity): PetMutationInfo | undefined {
  const chance = rarity === 'raro' ? 0.02 : rarity === 'epico' ? 0.04 : rarity === 'lendario' ? 0.07 : rarity === 'mistico' ? 0.10 : 0;
  if (Math.random() > chance) return undefined;
  const variants: PetMutationInfo['variant'][] = ['albino', 'sombrio_corrupto', 'arcano_puro', 'feral_brutal', 'sagrado'];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  const badge = variant === 'albino' ? '🌟' : variant === 'sombrio_corrupto' ? '🌑' : variant === 'arcano_puro' ? '🔮' : variant === 'feral_brutal' ? '🐾' : '✨';
  return { variant, visualBadge: badge };
}

const PET_CANDIDATES: Record<PetElementType, string[]> = {
  feral: ['Lobinho Cinzento', 'Javali Espinhoso', 'Raposa de Cinzas'],
  arcano: ['Espectro de Mana', 'Fada Celeste', 'Fada Silvestre', 'Golem Pequeno', 'Arcanídeo'],
  sagrado: ['Espírito Guardião', 'Grifo Jovem', 'Fenrir Branco'],
  sombrio: ['Corvo Sombrio', 'Shade Menor', 'Hiena Macabra']
};

export function hatchPet(egg: Egg): Pet {
  const info = egg.identified!;
  const namePool = (info.candidates && info.candidates.length ? info.candidates : PET_CANDIDATES[info.type]) || ['Companheiro Misterioso'];
  const name = namePool[Math.floor(Math.random() * namePool.length)];
  const qualityRoll = Math.floor(Math.random() * 100);
  const mutation = rollMutation(info.rarity);
  let exclusiveSkill = undefined;
  const attributes = { ...(info.initialBonus || {}) } as Partial<HeroAttributes>;
  // Skill inicial pela chance
  const skillMap: Record<PetElementType, string> = {
    feral: 'Instinto Feral',
    arcano: 'Pulso Arcano',
    sagrado: 'Aura Sagrada',
    sombrio: 'Sussurro Sombrio'
  };
  if (Math.random() * 100 < (info.skillChancePercent || 0)) {
    exclusiveSkill = skillMap[info.type];
  }
  // Ajustes por mutação
  if (mutation?.variant === 'albino') attributes.carisma = (attributes.carisma || 0) + 1;
  if (mutation?.variant === 'sombrio_corrupto') attributes.inteligencia = (attributes.inteligencia || 0) + 1;
  if (mutation?.variant === 'arcano_puro') {
    attributes.inteligencia = (attributes.inteligencia || 0) + 1;
    attributes.sabedoria = (attributes.sabedoria || 0) + 1;
  }
  if (mutation?.variant === 'feral_brutal') attributes.forca = (attributes.forca || 0) + 1;
  if (mutation?.variant === 'sagrado') attributes.sabedoria = (attributes.sabedoria || 0) + 1;
  return {
    id: uuidv4(),
    name,
    type: info.type,
    petClass: info.petClass,
    rarity: info.rarity,
    qualityRoll,
    level: 1,
    stage: 'bebe',
    mutation,
    attributes,
    exclusiveSkill,
    energy: 100,
    createdAt: new Date().toISOString()
  };
}

export function getStageFromLevel(level: number): PetStage {
  if (level >= 30) return 'forma_final';
  if (level >= 20) return 'adulto';
  if (level >= 10) return 'jovem';
  return 'bebe';
}

export function addPetXP(pet: Pet, xp: number): Pet {
  const levelsGained = Math.max(0, Math.floor(xp / 100));
  const newLevel = Math.min(30, pet.level + levelsGained);
  const newStage = getStageFromLevel(newLevel);
  let exclusiveSkill = pet.exclusiveSkill;
  if (!exclusiveSkill && newStage === 'forma_final') {
    const skillByName: Record<string, string> = {
      'Lobinho Cinzento': 'Instinto Feral',
      'Fada Silvestre': 'Aura Sagrada',
      'Fada Celeste': 'Aura Sagrada',
      'Golem Pequeno': 'Sussurro Sombrio',
      'Espectro de Mana': 'Pulso Arcano'
    };
    exclusiveSkill = skillByName[pet.name] || `${capitalize(pet.type)} Ascendente`;
  }
  return { ...pet, level: newLevel, stage: newStage, exclusiveSkill };
}

export function accelerateIncubation(egg: Egg, msReduction: number): Egg {
  if (!egg.incubationEndsAt) return egg;
  const endMs = new Date(egg.incubationEndsAt).getTime();
  const newEnd = Math.max(Date.now(), endMs - msReduction);
  const updated = { ...egg, incubationEndsAt: new Date(newEnd).toISOString() };
  return markReadyToHatch(updated);
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
