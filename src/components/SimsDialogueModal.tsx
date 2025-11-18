import React, { useEffect, useState } from 'react';
import { useHeroStore } from '../store/heroStore';

const SimsDialogueModal: React.FC = () => {
  const { npcInteractionOverlay, setNPCInteractionOverlay, respondToNPCInteraction } = useHeroStore() as any;
  const open = !!npcInteractionOverlay;
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [open]);
  if (!open) return null;
  const ov = npcInteractionOverlay;
  const lines: string[] = ov.lines || [];
  const line = lines[idx] || '';
  const player = useHeroStore.getState().getSelectedHero();
  const npc = useHeroStore.getState().heroes.find(h => h.id === ov.npcId);
  const relVal = npc ? ((npc.socialRelations || {})[player?.id || ''] || 0) : 0;
  const mood = relVal >= 40 ? 'friendly' : relVal <= -30 ? 'hostile' : 'neutral';
  const face = mood === 'friendly' ? '🙂' : mood === 'hostile' ? '😠' : '😐';
  const gesture = mood === 'friendly' ? '🤝' : mood === 'hostile' ? '✋' : '🖐️';
  const anim = mood === 'friendly' ? 'translate-y-0' : mood === 'hostile' ? 'scale-110' : 'opacity-90';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => setNPCInteractionOverlay(undefined)} />
      <div className="relative bg-white rounded-lg border border-gray-300 p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">💬 Interação</h2>
          <button onClick={() => setNPCInteractionOverlay(undefined)} className="text-gray-600">✖</button>
        </div>
        <div className="p-3 bg-gray-50 rounded border text-gray-800">
          <div className={`text-2xl transition-all ${anim}`}>{face} {gesture}</div>
          <div className="text-sm mt-1">{ov.npcName}: {line}</div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} className="px-3 py-1 rounded bg-gray-600 text-white">Anterior</button>
          <div className="text-xs text-gray-500">{idx + 1}/{lines.length}</div>
          <button onClick={() => setIdx(i => Math.min(lines.length - 1, i + 1))} className="px-3 py-1 rounded bg-indigo-600 text-white">Próximo</button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button onClick={() => respondToNPCInteraction('accept')} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">Aceitar</button>
          <button onClick={() => respondToNPCInteraction('decline')} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Recusar</button>
          <button onClick={() => respondToNPCInteraction('later')} className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Depois</button>
        </div>
      </div>
    </div>
  );
};

export default SimsDialogueModal;