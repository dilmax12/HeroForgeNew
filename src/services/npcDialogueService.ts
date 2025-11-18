import { Hero } from '../types/hero';
import { getGameSettings } from '../store/gameSettingsStore';

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)]; }
function strIncludes(s: string, k: string) { return s.toLowerCase().includes(k.toLowerCase()); }
function cap(s: string) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function humanizeMemory(summary: string): string {
  const t = summary.toLowerCase();
  if (t.includes('social_hostil')) return 'a confusão na taverna';
  if (t.includes('social_amigavel')) return 'aquele banquete na guilda';
  if (t.includes('social_neutro')) return 'aquele encontro casual na praça';
  if (t.includes('missao')) return 'a missão passada';
  if (t.includes('treino')) return 'o treino no pátio';
  return 'o incidente anterior';
}

export function getNPCDialogue(npc: Hero, player: Hero, context: string): string {
  const arch = npc.npcPersonality?.archetype || 'explorador';
  const style = npc.npcPersonality?.chatStyle || 'amigavel';
  const rel = (npc.socialRelations || {})[player.id] || 0;
  const mood = rel > 20 ? 'friendly' : rel < -20 ? 'hostile' : 'neutral';
  const exclamations = ['Pelos deuses!', 'Pela barba de Merlim!', 'Por todos os dracos!', 'Céus e aço!', 'Que sorte!', 'Por Taranis!'];
  const colloquials = ['essas passagens', 'esses corredores antigos', 'essa caverna', 'essas minas', 'essas ruínas', 'essa mata fechada'];
  const survival = ['verifique água e tochas', 'mantenha o abrigo ao alcance', 'olhe marcas no chão', 'escute o eco antes de avançar', 'prenda a corda na cintura', 'mantenha a lâmina afiada'];
  const whispers = ['espere... ouço passos', 'silêncio, algo se move', 'luzes ao longe', 'cheiro de mofo recente', 'corrente de ar vindo da esquerda'];
  const thoughts = ['melhor não subestimar isso', 'isso me lembra um velho contratempo', 'o mapa pode estar errado', 'não gosto desse silêncio', 'preciso ver pegadas'];
  const biomeColloquials = {
    caverna: ['caverna', 'gruta escura', 'fendas rochosas'],
    ruina: ['ruínas', 'pátio antigo', 'salões quebrados'],
    floresta: ['mata fechada', 'clareira oculta', 'troncos retorcidos'],
    cidade: ['becos', 'colunas da praça', 'arcadas do mercado'],
    montanha: ['desfiladeiro', 'encosta íngreme', 'penhascos ventosos']
  } as Record<string, string[]>;
  const archCatch: Record<string, string[]> = {
    competitivo: ['Nada como provar valor', 'Ninguém vai nos superar hoje', 'Hora de subir no ranking'],
    colaborativo: ['Juntos vamos mais longe', 'Compartilhe o loot, compartilhe a glória', 'Cobertura de flanco e avanço'],
    mercador: ['Negócio bom é metade da batalha', 'Veja preços, veja risco', 'Investir hoje, lucrar amanhã'],
    explorador: ['Mapeie, marque e avance', 'Sinta o vento, leia o terreno', 'Curiosidade abre portas'],
    sabio: ['Observe padrões', 'A mente vence a lâmina', 'Conhecimento é proteção'],
    caotico: ['Improviso vence tática', 'Se der errado, corra', 'Vamos mexer nesse ninho']
  };
  const archPrefix: Record<string, string> = {
    mercador: 'Oferta:', competitivo: 'Desafio:', colaborativo: 'Proposta:', sabio: 'Conselho:', caotico: 'Ideia:', explorador: 'Plano:'
  };
  const envCue = strIncludes(context,'caverna') || strIncludes(context,'corredor') || strIncludes(context,'coluna') || strIncludes(context,'mina') || strIncludes(context,'ruína');
  const excitement = mood === 'friendly' ? pick(exclamations) : mood === 'hostile' ? 'Tsc.' : 'Hmm.';
  const settings = getGameSettings();
  const place = (() => {
    if (!settings.npcBiomeLexiconEnabled) return envCue ? pick(colloquials) : 'este trecho';
    const ctx = context.toLowerCase();
    if (strIncludes(ctx, 'caverna') || strIncludes(ctx, 'gruta')) return pick(biomeColloquials.caverna);
    if (strIncludes(ctx, 'ruína') || strIncludes(ctx, 'ruinas')) return pick(biomeColloquials.ruina);
    if (strIncludes(ctx, 'floresta') || strIncludes(ctx, 'mata')) return pick(biomeColloquials.floresta);
    if (strIncludes(ctx, 'cidade') || strIncludes(ctx, 'praça') || strIncludes(ctx, 'mercado')) return pick(biomeColloquials.cidade);
    if (strIncludes(ctx, 'montanha') || strIncludes(ctx, 'penhasco')) return pick(biomeColloquials.montanha);
    return envCue ? pick(colloquials) : 'este trecho';
  })();
  const tip = pick(survival);
  const aside = Math.random() < (settings.npcDialogueWhisperProb ?? 0.25) ? pick(whispers) : '';
  const think = Math.random() < (settings.npcDialogueThoughtProb ?? 0.35) ? pick(thoughts) : '';
  const archLine = pick(archCatch[arch] || archCatch.explorador);
  const prefix = archPrefix[arch] || 'Plano:';
  const last = (npc.npcMemory?.interactions || []).slice(-1)[0]?.summary || '';
  const bg = last ? `E não quero repetir ${humanizeMemory(last)}.` : '';
  const tone = style === 'sarcastico' ? 'digo com um meio sorriso' : style === 'formal' ? 'digo com postura firme' : style === 'quieto' ? 'digo em voz baixa' : 'digo com brilho nos olhos';
  const lead = `${excitement} ${prefix} ${archLine}.`;
  const core = `${cap(player.name)}, pegue seu equipamento e ${tip}. ${tone}: ${context ? cap(context) : 'vamos avançar'} por ${place}.`;
  const color = `${cap(player.name)}, ${envCue ? 'cautela' : 'força'}!${aside ? ' [sussurrando] ' + aside + '.' : ''}${think ? ' (pensando) ' + think + '.' : ''} ${bg}`.trim();
  const friendlyWrap = mood === 'friendly' ? `${lead} ${core} ${color}` : mood === 'hostile' ? `${lead} Não confie nas aparências. ${core} ${color}` : `${lead} ${core} ${color}`;
  const provider = (import.meta as any)?.env?.VITE_AI_PROVIDER as string | undefined;
  const model = (import.meta as any)?.env?.VITE_AI_MODEL as string | undefined;
  if (provider && model) {
    try {
      return friendlyWrap;
    } catch {
      return friendlyWrap;
    }
  }
  return friendlyWrap;
}

export function getSimsDialogueTriplet(npc: Hero, player: Hero): string[] {
  const base = npc.npcPersonality?.archetype || 'explorador';
  const pool: string[] = [
    'Como vai? Precisa de ajuda com essas ruínas?',
    'Você tem poções sobrando? Posso trocar por mapas.',
    'Quer companhia numa missão rápida?',
    'Ouvi falar de bandidos perto do mercado. Vamos investigar?',
    'Tem uma corda extra? A minha arrebentou.',
    'Você viu pegadas estranhas perto da taverna?',
    'Posso te emprestar um pergaminho, se precisar.',
    'Treino mais tarde? Preciso melhorar minha guarda.',
    'Tem essência bestial para troca?',
    'Quer identificar um ovo raro comigo?',
    'Precisamos de tochas. Tem algumas?',
    'Topa explorar a gruta nordeste?',
    'Você conseguiu montar? Posso te passar um item.',
    'Tem notícias do conselho da guilda?',
    'Rastreie comigo — ouvi metal batendo.',
    'Vamos vender loot no mercado agora?',
    'Quer comparar mapas? O meu está incompleto.',
    'Topa escoltar um mercador?',
    'Tem flechas de sobra? Estou sem.',
    'Precisamos de água. O poço secou hoje.',
    'Por que não reunimos uma party para a dungeon?',
    'Você prefere caminho pela mata ou pelas ruínas?',
    'Pode me ensinar uma técnica de defesa?',
    'Tem runas antigas para estudo?',
  ];
  const q = pool[Math.floor(Math.random()*pool.length)];
  const offer = 'Posso te dar cobertura se aceitar.';
  const req = 'Se tiver um item extra, podemos trocar.';
  return [q, offer, req];
}