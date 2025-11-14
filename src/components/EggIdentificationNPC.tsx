import React from 'react';
import { useHeroStore } from '../store/heroStore';
import { EGG_IDENTIFY_COST } from '../utils/pets';

const EggIdentificationNPC: React.FC = () => {
  const { getSelectedHero, identifyEggForSelected } = useHeroStore();
  const hero = getSelectedHero();
  if (!hero) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-5xl mb-2">🦸</div>
        <p>Selecione um herói para consultar o Mestre Zoólogo.</p>
      </div>
    );
  }

  const eggs = (hero.eggs || []).filter(e => e.status === 'misterioso');

  return (
    <div className="space-y-4">
      <div className="p-4 rounded bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-800">🔮 Mestre Zoólogo Arkemis</div>
          <div className="text-4xl">🦉</div>
        </div>
        <div className="mt-2 text-sm text-gray-700">Traga seus ovos misteriosos e eu os identificarei por um preço justo.</div>
      </div>

      <div className="space-y-3">
        {eggs.length === 0 && (
          <div className="p-4 rounded bg-white border border-gray-200 text-gray-700">Nenhum ovo misterioso no momento. Explore missões e dungeons para encontrar ovos.</div>
        )}
        {eggs.map(e => {
          const range = EGG_IDENTIFY_COST[e.baseRarity];
          return (
            <div key={e.id} className="p-4 rounded bg-white border border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">{e.name}</div>
                <div className="text-xs text-gray-600">Raridade: {e.baseRarity} • Custo: {range.min}–{range.max} ouro</div>
              </div>
              <button
                onClick={() => identifyEggForSelected(e.id)}
                disabled={(hero.progression.gold || 0) < range.min}
                className={`px-4 py-2 rounded text-white ${ (hero.progression.gold || 0) >= range.min ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                Identificar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EggIdentificationNPC;