import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { generateDMLine } from '../services/narratorAI';

const DMNarrator: React.FC = () => {
  const location = useLocation();
  const { getSelectedHero } = useHeroStore();
  const hero = getSelectedHero();
  const [line, setLine] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const text = await generateDMLine({
          route: location.pathname,
          heroName: hero?.name,
          heroClass: hero?.class,
        });
        if (!cancelled) setLine(text);
      } catch (e) {
        if (!cancelled) setLine('O vento sussurra: o destino aguarda teu próximo passo...');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [location.pathname, hero?.name, hero?.class]);

  if (!hero) return null;

  return (
    <div className="mt-4 p-3 bg-gray-800/60 border border-gray-700 rounded-md text-gray-200">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🎙️</span>
        <span className="font-semibold">Mestre do Jogo</span>
        {loading && <span className="text-xs text-gray-400">gerando...</span>}
      </div>
      <p className="text-sm leading-relaxed">{line}</p>
    </div>
  );
};

export default DMNarrator;

