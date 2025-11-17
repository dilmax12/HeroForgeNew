import { Hero } from '../types/hero';

type DuelType = 'treino' | 'honra' | 'recompensas';

export interface DuelFrame { attacker: 'a' | 'b'; damage: number; crit: boolean; magic: boolean; aHp: number; bHp: number; aMp: number; bMp: number; }
export interface DuelResult {
  winnerId: string;
  loserId: string;
  turns: number;
  log: string[];
  rewards: { xp: number; gold: number };
  frames: DuelFrame[];
  initial: { aHp: number; bHp: number; aMp: number; bMp: number };
}

function roll(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export function simulateDuel(a: Hero, b: Hero, type: DuelType): DuelResult {
  const log: string[] = [];
  let aHp = (a.derivedAttributes.currentHp || a.derivedAttributes.hp);
  let bHp = (b.derivedAttributes.currentHp || b.derivedAttributes.hp);
  let aMp = (a.derivedAttributes.currentMp || a.derivedAttributes.mp);
  let bMp = (b.derivedAttributes.currentMp || b.derivedAttributes.mp);
  const frames: DuelFrame[] = [];
  const aAtk = Math.max(1, Math.floor((a.attributes.forca + a.attributes.destreza) * 1.2));
  const bAtk = Math.max(1, Math.floor((b.attributes.forca + b.attributes.destreza) * 1.2));
  const aDef = Math.max(0, Math.floor(a.derivedAttributes.armorClass / 2));
  const bDef = Math.max(0, Math.floor(b.derivedAttributes.armorClass / 2));
  const aIni = Math.max(0, a.derivedAttributes.initiative);
  const bIni = Math.max(0, b.derivedAttributes.initiative);
  const aMag = Math.max(0, Math.floor((a.attributes.inteligencia + a.attributes.sabedoria) * 0.8));
  const bMag = Math.max(0, Math.floor((b.attributes.inteligencia + b.attributes.sabedoria) * 0.8));
  const aLuck = Math.max(0, a.derivedAttributes.luck || 0);
  const bLuck = Math.max(0, b.derivedAttributes.luck || 0);

  let attacker = aIni >= bIni ? 'a' : 'b';
  let turns = 0;
  while (aHp > 0 && bHp > 0 && turns < 20) {
    turns++;
    const isA = attacker === 'a';
    const atk = isA ? aAtk : bAtk;
    const mag = isA ? aMag : bMag;
    const def = isA ? bDef : aDef;
    const luck = isA ? aLuck : bLuck;
    const crit = Math.random() < Math.min(0.25, luck / 100);
    let useMagic = Math.random() < 0.35;
    if (useMagic) {
      if (isA && aMp < 5) useMagic = false;
      if (!isA && bMp < 5) useMagic = false;
    }
    const raw = useMagic ? atk + mag + roll(0, 6) : atk + roll(0, 10);
    let dmg = Math.max(1, raw - def);
    if (crit) dmg = Math.floor(dmg * 1.5);
    if (isA) {
      bHp = Math.max(0, bHp - dmg);
      if (useMagic) aMp = Math.max(0, aMp - 5);
      log.push(`${a.name} ${useMagic ? 'lançou magia' : 'atacou'} e causou ${dmg} dano${crit ? ' (crítico)' : ''}.`);
    } else {
      aHp = Math.max(0, aHp - dmg);
      if (useMagic) bMp = Math.max(0, bMp - 5);
      log.push(`${b.name} ${useMagic ? 'lançou magia' : 'atacou'} e causou ${dmg} dano${crit ? ' (crítico)' : ''}.`);
    }
    frames.push({ attacker: isA ? 'a' : 'b', damage: dmg, crit, magic: useMagic, aHp, bHp, aMp, bMp });
    attacker = attacker === 'a' ? 'b' : 'a';
  }

  const aWins = bHp <= 0 || (aHp > bHp);
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;
  const baseXp = 30 + Math.max(0, (loser.progression.level || 1) - (winner.progression.level || 1)) * 2;
  const baseGold = 20 + Math.max(0, loser.derivedAttributes.power - winner.derivedAttributes.power) * 0.05;
  let xp = Math.floor(baseXp);
  let gold = Math.floor(baseGold);
  if (type === 'honra') xp = Math.floor(xp * 1.2);
  if (type === 'recompensas') gold = Math.floor(gold * 1.5);
  log.push(`${winner.name} venceu o duelo após ${turns} turnos.`);
  return { winnerId: winner.id, loserId: loser.id, turns, log, rewards: { xp, gold }, frames, initial: { aHp: (a.derivedAttributes.currentHp || a.derivedAttributes.hp), bHp: (b.derivedAttributes.currentHp || b.derivedAttributes.hp), aMp: (a.derivedAttributes.currentMp || a.derivedAttributes.mp), bMp: (b.derivedAttributes.currentMp || b.derivedAttributes.mp) } };
}