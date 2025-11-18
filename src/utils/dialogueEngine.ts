import { Hero } from '../types/hero';
import { getGameSettings } from '../store/gameSettingsStore';

export type DialogueTag = 'gossip' | 'event' | 'humor' | 'time_morning' | 'time_evening' | 'seasonal' | 'guild_mission' | 'warning';
export type DialoguePriority = 'urgent' | 'plot' | 'social' | 'ambient';

export interface DialogueLine {
  text: string;
  tags: DialogueTag[];
  priority: DialoguePriority;
  npcId?: string;
  weight?: number;
  requiredRelation?: number;
  requiredReputation?: number;
}

const bank: DialogueLine[] = [
  { text: 'Ouvi que {npc} anda perto da taverna com segredos.', tags: ['gossip'], priority: 'social', weight: 3 },
  { text: 'Dizem que um herói venceu um golem rachado ontem.', tags: ['event'], priority: 'plot', weight: 4 },
  { text: 'Se precisar de mapas, tenho uns rabiscos confiáveis.', tags: ['humor','event'], priority: 'social', weight: 2 },
  { text: 'Manhã cheia: planejo patrulhar as ruínas.', tags: ['time_morning'], priority: 'ambient', weight: 2 },
  { text: 'Noite longa: hoje quase virei comida de troll.', tags: ['time_evening'], priority: 'ambient', weight: 2 },
  { text: 'Festival do sol chegando, precisaremos de tochas.', tags: ['seasonal'], priority: 'ambient', weight: 1 },
  { text: 'Missão em andamento? Posso te cobrir no flanco.', tags: ['guild_mission'], priority: 'plot', weight: 3, requiredRelation: 20 },
  { text: 'Cuidado com emboscadas no mercado subterrâneo.', tags: ['warning'], priority: 'urgent', weight: 4 },
  { text: 'Pela barba de Merlim, seu nome ecoou pela cidade.', tags: ['humor','event'], priority: 'social', weight: 3, requiredReputation: 200 },
  { text: 'Ouvi rumores de rivalidades na guilda hoje.', tags: ['gossip','guild_mission'], priority: 'social', weight: 2 },
  { text: 'Há um mapa antigo apontando para um acesso secreto.', tags: ['event'], priority: 'plot', weight: 3 },
  { text: 'Planejando missão? Dividir o loot antes evita briga.', tags: ['guild_mission'], priority: 'plot', weight: 3 },
  { text: 'Se me pagar com poções, conto um atalho seguro.', tags: ['humor','event'], priority: 'social', weight: 2 },
  { text: 'A chuva traz bruxas; vá armado à Floresta Umbral.', tags: ['seasonal','warning'], priority: 'plot', weight: 3 },
  { text: 'Seu arco canta; ouvi dizer que acertou três bandidos.', tags: ['humor','event'], priority: 'social', weight: 2 },
  { text: 'De manhã o conselho decide missões difíceis.', tags: ['time_morning','guild_mission'], priority: 'plot', weight: 2 },
  { text: 'À noite a verdade aparece: quem falhou e quem brilhou.', tags: ['time_evening','guild_mission'], priority: 'plot', weight: 2 },
  { text: 'Quer espalhar um rumor útil? Sei a pessoa certa.', tags: ['gossip'], priority: 'social', weight: 2 },
  { text: 'Tenho uma pista de caverna com cristais rúnicos.', tags: ['event'], priority: 'plot', weight: 3 },
  { text: 'Se for com rivais, tenha um plano de fuga.', tags: ['warning','guild_mission'], priority: 'plot', weight: 3 }
];

function score(line: DialogueLine, npc: Hero, player: Hero, now: Date): number {
  const s = getGameSettings();
  const hour = now.getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isEvening = hour >= 18 || hour < 2;
  if (line.requiredRelation && ((npc.socialRelations || {})[player.id] || 0) < line.requiredRelation) return -1;
  if (line.requiredReputation && (player.progression.reputation || 0) < line.requiredReputation) return -1;
  let base = line.weight || 1;
  if (line.priority === 'urgent') base += 3;
  if (line.tags.includes('time_morning') && isMorning) base += 2;
  if (line.tags.includes('time_evening') && isEvening) base += 2;
  return base;
}

export function generateDialogue(npc: Hero, player: Hero, tags: DialogueTag[], limit = 3): string[] {
  const now = new Date();
  const filtered = bank.filter(b => tags.every(t => b.tags.includes(t)));
  const scored = filtered
    .map(l => ({ l, s: score(l, npc, player, now) }))
    .filter(x => x.s >= 0)
    .sort((a,b) => b.s - a.s)
    .slice(0, Math.max(1, limit))
    .map(x => x.l.text.replace('{npc}', npc.name));
  return scored;
}

export function generateMixed(npc: Hero, player: Hero, limit = 3): string[] {
  const now = new Date();
  const pool = bank
    .map(l => ({ l, s: score(l, npc, player, now) }))
    .filter(x => x.s >= 0)
    .sort((a,b) => b.s - a.s)
    .slice(0, 8)
    .map(x => x.l.text.replace('{npc}', npc.name));
  return pool.slice(0, limit);
}