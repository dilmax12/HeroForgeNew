import React, { useEffect, useState } from 'react';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes } from '../styles/medievalTheme';

const SeasonalDecor: React.FC = () => {
  const { activeSeasonalTheme } = useMonetizationStore();
  const [msgIndex, setMsgIndex] = useState(0);
  const cfg = (seasonalThemes as any)[activeSeasonalTheme || ''];
  const messages: string[] = Array.isArray(cfg?.messages) ? cfg.messages : [];
  useEffect(() => {
    if (!messages.length) return;
    setMsgIndex(0);
    const t = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 12000);
    return () => clearInterval(t);
  }, [activeSeasonalTheme, messages.length]);
  if (!activeSeasonalTheme || !cfg) return null;
  return (
    <div className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{}}>
      <div className={`bg-gradient-to-r ${cfg.banner} rounded px-2 py-2 flex items-center gap-2`}>
        <span>{cfg.accents[0]}</span>
        <span>{cfg.accents[1]}</span>
        <span>{cfg.accents[2]}</span>
        <span className="ml-2 text-gray-200">
          {activeSeasonalTheme === 'natal' && 'Festival de Inverno'}
          {activeSeasonalTheme === 'pascoa' && 'Celebração do Renascimento'}
          {activeSeasonalTheme === 'ano_novo' && 'Banquete Real e Profecias'}
          {activeSeasonalTheme === 'carnaval' && 'Mascarada dos Bardos'}
        </span>
        {messages.length > 0 && (
          <span className="ml-auto text-gray-300 italic">
            {messages[msgIndex]}
          </span>
        )}
      </div>
    </div>
  );
};

export default SeasonalDecor;