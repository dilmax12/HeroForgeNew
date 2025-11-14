import React, { useEffect, useState } from 'react';
import { resolveCombat } from '../utils/combat';
import { Hero, CombatResult, QuestEnemy } from '../types/hero';
import { notificationBus } from './NotificationSystem';

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
  const [petSkillInfo, setPetSkillInfo] = useState<{ name?: string; count: number } | null>(null);

  useEffect(() => {
    // Executa combate completo por turnos e apresenta o log
    const res = resolveCombat(hero, enemies, { floor, partyBonusPercent: partyRarityBonusPercent });
    setResult(res);
  }, [hero, enemies, floor, partyRarityBonusPercent]);

  useEffect(() => {
    if (!result) return;
    const pet = (hero.pets || []).find(p => p.id === (hero as any).activePetId);
    const skillName = pet?.exclusiveSkill;
    const count = (result.log || []).filter(line => line.includes('Companheiro')).length;
    if (skillName && count > 0) {
      setPetSkillInfo({ name: skillName, count });
      notificationBus.emit({ type: 'quest', title: 'Skill do Mascote', message: `${skillName} ativou ${count} vez(es)`, icon: '🐾', duration: 2500 });
    } else {
      setPetSkillInfo(null);
    }
  }, [result]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="battle-dialog-title">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="battle-dialog-title" className="text-xl font-bold text-white">⚔️ Batalha</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✖</button>
        </div>

        <div className="mt-3 text-sm text-gray-300">
          Inimigos: {enemies.map(e => `${e.count} ${e.type}${e.count > 1 ? 's' : ''}`).join(', ')}
        </div>

        <div className="mt-4 max-h-64 overflow-y-auto rounded bg-gray-700 p-3 text-sm">
          {result?.log?.map((line, idx) => (
            <div key={idx} className={`leading-relaxed ${line.includes('Companheiro') ? 'text-emerald-300' : 'text-gray-200'}`}>{line}</div>
          )) || <div className="text-gray-200">Resolvendo combate...</div>}
        </div>

        {result && (
          <div className="mt-4">
            {(result.petElementHighlights && result.petElementHighlights.length > 0) && (
              <div className="mb-3">
                <div className="text-xs text-gray-300 mb-1">Elementos aplicados pelo companheiro</div>
                <div className="flex gap-2 text-base">
                  {result.petElementHighlights.map((el, i) => {
                    const icon = el === 'earth' ? '⛰️' : el === 'light' ? '✨' : el === 'dark' ? '🌑' : '🌀';
                    return <span key={`${el}-${i}`} title={el}>{icon}</span>;
                  })}
                </div>
              </div>
            )}
            <div className={`text-lg font-semibold ${result.victory ? 'text-green-400' : 'text-red-400'}`}>{result.victory ? 'Vitória' : 'Derrota'}</div>
            <div className="mt-1 text-sm text-gray-300">Dano recebido: {result.damage}</div>
            {(result.xpGained || result.goldGained) && (
              <div className="text-sm text-gray-300">Recompensas: {result.xpGained} XP • {result.goldGained} ouro</div>
            )}
            {petSkillInfo && (
              <div className="mt-1 text-sm text-emerald-300">🐾 Skill do mascote: {petSkillInfo.name} • ativou {petSkillInfo.count}x</div>
            )}
            {result.itemsGained && result.itemsGained.length > 0 && (
              <div className="text-sm text-gray-300">Itens: {result.itemsGained.map(i => i.name).join(', ')}</div>
            )}
            {((result.petDamage || 0) > 0 || (result.petHealing || 0) > 0 || (result.petStuns || 0) > 0) && (
              <div className="mt-3 rounded bg-gray-700 p-3">
                <div className="text-sm text-amber-300 font-semibold mb-1">Companheiro</div>
                <div className="text-sm text-gray-200">Dano: {result.petDamage || 0} • Cura: {result.petHealing || 0} • Controles: {result.petStuns || 0}</div>
                {typeof result.petEnergyUsed === 'number' && (
                  <div className="text-xs text-gray-400 mt-1">Energia consumida: {result.petEnergyUsed}</div>
                )}
              </div>
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
