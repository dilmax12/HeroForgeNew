import React, { useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { tokens } from '../styles/designTokens';

const NPCPresenceLayer: React.FC = () => {
  const { heroes, getSelectedHero } = useHeroStore();
  const player = getSelectedHero();
  const npcs = useMemo(() => heroes.filter(h => h.origin === 'npc'), [heroes]);
  const visibleCap = 6;
  const rotationSeconds = 60;
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  React.useEffect(() => {
    function sample(ids: string[], k: number) {
      const arr = [...ids];
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr.slice(0, Math.max(0, Math.min(k, arr.length)));
    }
    const ids = npcs.map(n => n.id);
    setVisibleIds(sample(ids, visibleCap));
    const iv = setInterval(() => setVisibleIds(sample(npcs.map(n => n.id), visibleCap)), Math.max(10, rotationSeconds) * 1000);
    return () => clearInterval(iv);
  }, [npcs, visibleCap, rotationSeconds]);
  if (npcs.length === 0) return null;
  return (
    <div className={`${tokens.cardBase} border border-gray-700`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Atividades de Aventureiros NPC</h3>
        <div className="text-xs text-gray-400">Simulação ativa</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {npcs.filter(n => visibleIds.includes(n.id)).map(n => {
          const last = (n.npcMemory?.interactions || []).slice(-1)[0];
          const rel = (n.socialRelations || {})[player?.id || ''] || 0;
          const mood = n.npcMood;
          const moodEmoji = mood === 'feliz' ? '😄' : mood === 'tranquilo' ? '🙂' : mood === 'neutro' ? '😐' : mood === 'estressado' ? '😣' : mood === 'irritado' ? '😡' : mood === 'triste' ? '😢' : mood === 'cansado' ? '😴' : '—';
          return (
            <div key={n.id} className="bg-gray-900 border border-gray-700 p-3 rounded">
              <div className="flex items-center justify-between">
                <div className="font-semibold flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {n.name}
                </div>
                <div className="text-xs text-gray-400">Rel {rel} • {moodEmoji}</div>
              </div>
              <div className="text-sm text-gray-300 mt-1">{last ? `${new Date(last.ts).toLocaleTimeString()} • ${last.summary}` : 'Sem atividades recentes'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NPCPresenceLayer;