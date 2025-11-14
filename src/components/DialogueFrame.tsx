import React from 'react';
import { useMonetizationStore } from '../store/monetizationStore';
import { seasonalThemes } from '../styles/medievalTheme';

interface Props {
  children: React.ReactNode;
}

const FRAME_STYLES: Record<string, string> = {
  medieval: 'border-amber-500/40 bg-gradient-to-br from-slate-800 to-slate-900 shadow-amber-500/20',
  futurista: 'border-cyan-400/40 bg-gradient-to-br from-slate-900 to-black shadow-cyan-400/20',
  noir: 'border-gray-500/40 bg-gradient-to-br from-black to-slate-900 shadow-black/40'
};

const DialogueFrame: React.FC<Props> = ({ children }) => {
  const { activeFrameId, activeSeasonalTheme } = useMonetizationStore();
  const style = FRAME_STYLES[activeFrameId || 'medieval'] || FRAME_STYLES.medieval;
  const accents = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.accents || [] : [];

  return (
    <div className={`rounded-xl p-4 border ${style} relative`}> 
      {accents.length > 0 && (
        <div className="absolute -top-2 -right-2 text-sm opacity-80">
          <span className="mr-1">{accents[0]}</span>
          <span className="mr-1">{accents[1]}</span>
          <span>{accents[2]}</span>
        </div>
      )}
      {children}
    </div>
  );
};

export default DialogueFrame;