import React from 'react';
import AIDungeonRun from './AIDungeonRun';

export default function MissionsHub() {

  return (
    <div className="max-w-full md:max-w-6xl mx-auto px-3 md:px-6">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-amber-300">Jogar</h1>
        <p className="text-xs sm:text-sm text-gray-300">Modo de masmorra por etapas com decisões e batalhas.</p>
      </div>

      <div className="rounded-lg bg-gray-800 p-3 md:p-4">
        <AIDungeonRun />
      </div>
    </div>
  );
}
