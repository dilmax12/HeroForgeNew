import React, { useMemo, useState } from 'react';
import { Hero, HeroAttributes } from '../types/hero';
import { useHeroStore } from '../store/heroStore';
import { ATTRIBUTE_CONSTRAINTS, ATTRIBUTE_INFO, getMaxAttributeForRank } from '../utils/attributeSystem';
import { rankSystem } from '../utils/rankSystem';
import { medievalTheme } from '../styles/medievalTheme';

interface AttributeAllocationPanelProps {
  hero: Hero;
}

const AttributeAllocationPanel: React.FC<AttributeAllocationPanelProps> = ({ hero }) => {
  const { allocateAttributePoints } = useHeroStore();

  const [pending, setPending] = useState<Partial<HeroAttributes>>({});
  const [message, setMessage] = useState<string>('');

  const pointsAvailable = hero.attributePoints || 0;
  const currentRank = hero.rankData?.currentRank || rankSystem.calculateRank(hero);
  const maxAttr = useMemo(() => getMaxAttributeForRank(currentRank), [currentRank]);

  const pointsToSpend = useMemo(() => {
    return Object.values(pending).reduce((sum, v) => sum + (typeof v === 'number' ? Math.max(0, v) : 0), 0);
  }, [pending]);

  const pointsRemaining = Math.max(0, pointsAvailable - pointsToSpend);

  const attributesList = useMemo(() => (
    [
      'forca',
      'destreza',
      'constituicao',
      'inteligencia'
    ] as (keyof HeroAttributes)[]
  ), []);

  const canIncrease = (key: keyof HeroAttributes) => {
    const current = hero.attributes[key];
    const inc = (pending[key] || 0) as number;
    return pointsRemaining > 0 && current + inc < maxAttr;
  };

  const canDecrease = (key: keyof HeroAttributes) => {
    const inc = (pending[key] || 0) as number;
    return inc > 0;
  };

  const increment = (key: keyof HeroAttributes) => {
    if (!canIncrease(key)) return;
    setPending(prev => ({ ...prev, [key]: ((prev[key] as number) || 0) + 1 }));
  };

  const decrement = (key: keyof HeroAttributes) => {
    if (!canDecrease(key)) return;
    setPending(prev => ({ ...prev, [key]: Math.max(0, ((prev[key] as number) || 0) - 1) }));
  };

  const reset = () => {
    setPending({});
    setMessage('');
  };

  const apply = () => {
    if (pointsToSpend <= 0) {
      setMessage('Selecione pelo menos 1 ponto para aplicar.');
      return;
    }
    const ok = allocateAttributePoints(hero.id, pending);
    if (ok) {
      setMessage('Pontos aplicados com sucesso!');
      reset();
    } else {
      setMessage('Não foi possível aplicar. Verifique limites e pontos disponíveis.');
    }
  };

  if (pointsAvailable <= 0) {
    return (
      <div className="bg-gray-700 p-4 rounded border border-gray-600 text-sm text-gray-200">
        Nenhum ponto de atributo disponível no momento.
      </div>
    );
  }

  return (
    <div className="bg-gray-700 p-4 rounded border border-gray-600 space-y-4 text-gray-100">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-300">
          Pontos disponíveis: <span className="font-semibold">{pointsAvailable}</span>
        </div>
        <div className="text-sm text-gray-300">
          A gastar: <span className="font-semibold">{pointsToSpend}</span> • Restantes: <span className="font-semibold">{pointsRemaining}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {attributesList.map((key) => {
          const info = ATTRIBUTE_INFO[key];
          const current = hero.attributes[key];
          const inc = (pending[key] || 0) as number;
          const final = current + inc;
          return (
            <div key={key} className="bg-gray-800 border border-gray-700 rounded p-3 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span>{info.icon}</span>
                  <span className="font-medium text-white">{info.name}</span>
                </div>
                <div className="text-sm text-gray-300">
                  {current} → <span className="font-semibold">{final}</span>
                </div>
              </div>
              <div className="mt-2 space-y-2">
                <div className="text-xs text-gray-400 leading-snug min-w-0 break-words">{info.description}</div>
                <div className="flex items-center justify-end space-x-2">
                  <button
                    className={`px-2 py-1 text-sm rounded ${canDecrease(key) ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    onClick={() => decrement(key)}
                    disabled={!canDecrease(key)}
                  >-</button>
                  <div className="w-8 text-center text-sm">{inc || 0}</div>
                  <button
                    className={`px-2 py-1 text-sm rounded ${canIncrease(key) ? `bg-gradient-to-r ${medievalTheme.gradients.buttons.primary} text-white` : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    onClick={() => increment(key)}
                    disabled={!canIncrease(key)}
                  >+</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end space-x-2">
        <button
          className="px-3 py-2 text-sm rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
          onClick={reset}
        >Cancelar</button>
        <button
          className={`px-3 py-2 text-sm rounded ${pointsToSpend > 0 ? `bg-gradient-to-r ${medievalTheme.gradients.buttons.primary} text-white` : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
          onClick={apply}
          disabled={pointsToSpend <= 0}
        >Aplicar</button>
      </div>

      {message && (
        <div className="text-xs text-gray-400">
          {message}
        </div>
      )}
    </div>
  );
};

export default AttributeAllocationPanel;
