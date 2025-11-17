import React, { useMemo, useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { getNPCDialogue } from '../services/npcDialogueService';
import { useGameSettingsStore } from '../store/gameSettingsStore';

const NPCPresenceLayer: React.FC = () => {
  const { heroes, getSelectedHero } = useHeroStore();
  const player = getSelectedHero();
  const npcs = useMemo(() => heroes.filter(h => h.origin === 'npc'), [heroes]);
  const immersive = useGameSettingsStore(s => s.npcImmersiveModeEnabled || false);
  const updateSettings = useGameSettingsStore(s => s.updateSettings);
  const visibleCap = useGameSettingsStore(s => s.npcVisibleCap || 6);
  const rotationSeconds = useGameSettingsStore(s => s.npcRotationSeconds || 60);
  const [dialogById, setDialogById] = useState<Record<string, string>>({});
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
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Atividades de Aventureiros NPC</h3>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-600 flex items-center gap-1">
            <input type="checkbox" checked={immersive} onChange={(e) => updateSettings({ npcImmersiveModeEnabled: e.target.checked })} />
            Modo Imersivo
          </label>
          <div className="text-xs text-gray-500">Simulação ativa</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {npcs.filter(n => visibleIds.includes(n.id)).map(n => {
          const last = (n.npcMemory?.interactions || []).slice(-1)[0];
          const rel = (n.socialRelations || {})[player?.id || ''] || 0;
          return (
            <div key={n.id} className="bg-gray-50 p-3 rounded border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {n.name}
                </div>
                <div className="text-xs text-gray-500">Rel {rel}</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">{last ? `${new Date(last.ts).toLocaleTimeString()} • ${last.summary}` : 'Sem atividades recentes'}</div>
              <div className="mt-2 flex items-center gap-2">
                {player && immersive && (
                  <button
                    onClick={() => {
                      const text = getNPCDialogue(n, player, 'Situação atual');
                      setDialogById(prev => ({ ...prev, [n.id]: text }));
                    }}
                    className="px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-xs"
                  >Falar</button>
                )}
              </div>
              {dialogById[n.id] && (
                <div className="mt-2 p-2 bg-white/90 border border-amber-400/40 rounded text-sm text-gray-800 shadow-lg ring-1 ring-amber-400/30 transition-all duration-300 animate-pulse">{dialogById[n.id]}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NPCPresenceLayer;