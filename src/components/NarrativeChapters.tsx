import React from 'react';
import { useHeroStore } from '../store/heroStore';
import DialogueFrame from './DialogueFrame';

const NarrativeChapters: React.FC = () => {
  const { getSelectedHero } = useHeroStore();
  const hero = getSelectedHero();
  const chapters = hero?.journeyChapters || [];
  const nextMilestone = [4,8,12,16,20].find(m => (hero?.progression.level ?? 1) < m);

  if (!hero) {
    return null;
  }

  return (
    <div className="mt-8 rounded-xl p-6 bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📚</span>
        <h3 className="text-lg font-bold">Capítulos da Jornada</h3>
      </div>
      <ul className="space-y-3">
        {chapters.map((c) => (
          <li key={c.id} className="text-sm text-gray-200">
            <DialogueFrame>
              <div className="font-semibold text-white mb-1">{c.title}</div>
              <div className="text-gray-300">{c.summary}</div>
              <div className="text-xs text-gray-400 mt-1">Criado em {new Date(c.createdAt).toLocaleString()} • Nível {c.levelMilestone}</div>
            </DialogueFrame>
          </li>
        ))}
      </ul>
      {chapters.length === 0 && (
        <div className="text-sm text-gray-400">Ainda sem capítulos. Eles são gerados automaticamente a cada 4 níveis.</div>
      )}
      {nextMilestone && (
        <div className="mt-3 text-xs text-gray-400">Próximo capítulo em nível {nextMilestone}.</div>
      )}
    </div>
  );
};

export default NarrativeChapters;
