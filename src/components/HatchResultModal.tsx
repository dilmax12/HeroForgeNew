import React from 'react';
import { useHeroStore } from '../store/heroStore';
import type { Pet } from '../types/hero';

const Row: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
  <div className="flex justify-between text-sm"><span className="text-gray-300">{label}</span><span className="text-gray-100 font-medium">{value}</span></div>
);

const HatchResultModal: React.FC<{ petId: string; onClose: () => void }> = ({ petId, onClose }) => {
  const { getSelectedHero, setActivePet } = useHeroStore();
  const hero = getSelectedHero();
  const pet = hero?.pets?.find(p => p.id === petId) as Pet | undefined;
  if (!pet) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-amber-500 bg-slate-900 p-5 text-white">
        <div className="text-center mb-3">
          <div className="text-5xl mb-2">🐣</div>
          <div className="text-xl font-bold">Mascote Eclodido!</div>
        </div>
        <div className="space-y-2">
          <Row label="Nome" value={pet.name} />
          <Row label="Tipo" value={pet.type} />
          <Row label="Classe" value={pet.petClass} />
          <Row label="Raridade" value={pet.rarity} />
          {pet.mutation?.variant && <Row label="Mutação" value={pet.mutation.variant} />}
          {pet.exclusiveSkill && <Row label="Habilidade" value={pet.exclusiveSkill} />}
          <div className="mt-2 text-xs text-gray-300">Qualidade: {pet.qualityRoll}% • Nível: {pet.level} • Estágio: {pet.stage.replace('_', ' ')}</div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => { setActivePet(pet.id); onClose(); }} className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-700">Tornar Ativo</button>
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600">Fechar</button>
        </div>
      </div>
    </div>
  );
};

export default HatchResultModal;

