import React, { useEffect, useState } from 'react';
import { resolveCombat } from '../utils/combat';
import { Hero, CombatResult, QuestEnemy } from '../types/hero';

interface BattleModalProps {
  hero: Hero;
  enemies: QuestEnemy[];
  onClose: () => void;
  onResult: (result: CombatResult) => void;
  floor?: number;
  partyRarityBonusPercent?: number;
}

export default function BattleModal({ hero, enemies, onClose, onResult, floor, partyRarityBonusPercent }: BattleModalProps) {
  const [result, setResult] = useState<CombatResult | null>(null);

  useEffect(() => {
    // Executa combate completo por turnos e apresenta o log
    const res = resolveCombat(hero, enemies, { floor, partyBonusPercent: partyRarityBonusPercent });
    setResult(res);
  }, [hero, enemies, floor, partyRarityBonusPercent]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">⚔️ Batalha</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✖</button>
        </div>

        <div className="mt-3 text-sm text-gray-300">
          Inimigos: {enemies.map(e => `${e.count} ${e.type}${e.count > 1 ? 's' : ''}`).join(', ')}
        </div>

        <div className="mt-4 max-h-64 overflow-y-auto rounded bg-gray-700 p-3 text-sm text-gray-200">
          {result?.log?.map((line, idx) => (
            <div key={idx} className="leading-relaxed">{line}</div>
          )) || <div>Resolvendo combate...</div>}
        </div>

        {result && (
          <div className="mt-4">
            <div className={`text-lg font-semibold ${result.victory ? 'text-green-400' : 'text-red-400'}`}>{result.victory ? 'Vitória' : 'Derrota'}</div>
            <div className="mt-1 text-sm text-gray-300">Dano recebido: {result.damage}</div>
            {(result.xpGained || result.goldGained) && (
              <div className="text-sm text-gray-300">Recompensas: {result.xpGained} XP • {result.goldGained} ouro</div>
            )}
            {result.itemsGained && result.itemsGained.length > 0 && (
              <div className="text-sm text-gray-300">Itens: {result.itemsGained.map(i => i.name).join(', ')}</div>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { onResult(result); onClose(); }}
                className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >Concluir</button>
              <button
                onClick={onClose}
                className="px-3 py-2 rounded bg-gray-600 text-white hover:bg-gray-700"
              >Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
