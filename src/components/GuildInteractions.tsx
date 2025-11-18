import React, { useMemo, useEffect, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { generateDialogue } from '../utils/dialogueEngine';
import { tokens } from '../styles/designTokens';
import { aiService } from '../services/aiService';

const GuildInteractions: React.FC = () => {
  const { heroes, getSelectedHero, inviteHeroToParty, getHeroParty, createParty, setPartyInviteTerms } = useHeroStore() as any;
  const player = getSelectedHero();
  const npcs = useMemo(() => heroes.filter((h: any) => h.origin === 'npc'), [heroes]);
  if (!player || npcs.length === 0) return null;
  const party = getHeroParty(player.id);
  const warnings = generateDialogue(npcs[0], player, ['guild_mission','warning'], 2);
  const discuss = generateDialogue(npcs[0], player, ['guild_mission'], 2);
  const [aiLines, setAiLines] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const npc = npcs[0];
        const routine = (npc.npcRoutine || []).find(r => {
          const [sh] = (r.start || '00:00').split(':').map(Number);
          const [eh] = (r.end || '23:59').split(':').map(Number);
          const h = new Date().getHours();
          return h >= sh && h < eh;
        });
        const activity = routine?.activity || 'social';
        const mood = npc.npcMood || 'neutro';
        const rel = (npc.socialRelations || {})[player.id] || 0;
        const context = `Guilda. Atividade: ${activity}. Humor: ${mood}. Relação com ${player.name}: ${rel}. Últimas interações: ${(npc.npcMemory?.interactions || []).slice(-3).map(i => i.summary).join(', ')}`;
        const systemMessage = 'Você é um NPC da guilda. Gere comentários curtos, originais e contextuais (máx. 2 linhas) em PT-BR sobre a guilda, planos e avisos, sem clichês.';
        const prompt = `Crie duas falas distintas relacionadas à guilda (recrutamento, conselhos, avisos), refletindo ${mood} e a rotina ${activity}, para o herói ${player.name}.`;
        const res = await aiService.generateTextSafe({ systemMessage, prompt, context, maxTokens: 120, temperature: 0.8 });
        const raw = (res.text || '').split('\n').map(s => s.trim()).filter(Boolean);
        const cleaned = raw.map(t => t.replace(/^NPC:\s*/i, '')).filter(t => t.length > 0);
        const picked = cleaned.slice(0, 2);
        if (!cancelled && picked.length) setAiLines(picked);
      } catch { if (!cancelled) setAiLines(null); }
    })();
    return () => { cancelled = true; };
  }, [npcs[0]?.id, player.id, npcs[0]?.npcMood]);
  const [duration, setDuration] = React.useState<'one_mission'|'days'>('one_mission');
  const [days, setDays] = React.useState<number>(1);
  const [rewardShare, setRewardShare] = React.useState<number>(10);
  const [leaderPref, setLeaderPref] = React.useState<'inviter'|'invitee'|'none'>('none');

  const recruit = () => {
    const npc = npcs.find(n => !party || !party.members.includes(n.id));
    if (!npc) return;
    if (!party) {
      const p = createParty(player.id, `Companhia de ${player.name}`);
      inviteHeroToParty(p.id, player.id, npc.id);
      setPartyInviteTerms(p.id, npc.id, { duration, days: duration==='days'?days:undefined, rewardShare, leaderPref });
    } else {
      inviteHeroToParty(party.id, player.id, npc.id);
      setPartyInviteTerms(party.id, npc.id, { duration, days: duration==='days'?days:undefined, rewardShare, leaderPref });
    }
  };
  return (
    <div className={`${tokens.cardBase} border border-gray-700`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">🏰 Interações na Guilda</h2>
      </div>
      <div className="space-y-2">
        {((aiLines && aiLines.length) ? aiLines : Array.from(new Set([...discuss, ...warnings])).slice(0,2)).map((t,i) => (
          <div key={`g-${i}`} className="p-2 rounded border bg-gray-900 border-gray-700">{t}</div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={recruit} className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">Recrutar para Party</button>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select value={duration} onChange={(e) => setDuration(e.target.value as any)} className="border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700 w-28">
            <option value="one_mission">1 Missão</option>
            <option value="days">Dias</option>
          </select>
          {duration==='days' && (
            <input type="number" min={1} max={14} value={days} onChange={(e) => setDays(Number(e.target.value))} className="border rounded px-2 py-1 w-20 bg-gray-900 text-gray-200 border-gray-700" />
          )}
          <span>Recompensa</span>
          <input type="number" min={5} max={50} value={rewardShare} onChange={(e) => setRewardShare(Number(e.target.value))} className="border rounded px-2 py-1 w-20 bg-gray-900 text-gray-200 border-gray-700" />%
          <span>Liderança</span>
          <select value={leaderPref} onChange={(e) => setLeaderPref(e.target.value as any)} className="border rounded px-2 py-1 bg-gray-900 text-gray-200 border-gray-700 w-28">
            <option value="none">Indiferente</option>
            <option value="inviter">Você</option>
            <option value="invitee">NPC</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default GuildInteractions;