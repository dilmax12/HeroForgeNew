import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroGallery } from './HeroGallery';
import ErrorBoundary from './ErrorBoundary';
import { useHeroStore } from '../store/heroStore';
import { Hero } from '../types/hero';
import { EXAMPLE_HERO_DATA, generateExampleHero } from '../utils/heroExample';
import { getAltharionLore } from '../utils/story';

const HeroList: React.FC = () => {
  const navigate = useNavigate();
  const { updateHero, createHero } = useHeroStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedHeroForImage, setSelectedHeroForImage] = React.useState<Hero | null>(null);

  const handleCreateHero = () => {
    navigate('/create');
  };

  const handleCreateExampleHero = () => {
    try {
      createHero(EXAMPLE_HERO_DATA);
    } catch (error) {
      console.error('Erro ao criar herói de exemplo:', error);
    }
  };

  const handleHeroSelect = (hero: Hero) => {
    navigate(`/hero/${hero.id}`);
  };

  const handleHeroEdit = (hero: Hero) => {
    // Por enquanto, navega para a página de detalhes
    // Futuramente pode ser uma modal de edição
    navigate(`/hero/${hero.id}`);
  };

  const handleHeroImageChange = (hero: Hero) => {
    setSelectedHeroForImage(hero);
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedHeroForImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        updateHero(selectedHeroForImage.id, { image: result });
        setSelectedHeroForImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const shortLore = getAltharionLore('short');
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <div className="container mx-auto p-4 sm:p-6">
        {/* Input oculto para upload de imagem */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-amber-400 mb-1 sm:mb-2">⚔️ Hero Forge</h1>
          <p className="text-gray-300 text-sm sm:text-base">Gerencie seus heróis épicos</p>
        </div>

        {/* Seção de Navegação Rápida */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            <Link
              to="/quests"
              className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-3 sm:p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-blue-500/30"
            >
              <div className="text-xl sm:text-2xl mb-1 sm:mb-2">⚔️</div>
              <div className="font-medium text-sm sm:text-base">Missões</div>
            </Link>
            <Link
              to="/guild-hub"
              className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white p-3 sm:p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-purple-500/30"
            >
              <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏰</div>
              <div className="font-medium text-sm sm:text-base">Guilda dos Aventureiros</div>
            </Link>
            <Link
              to="/titles"
              className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white p-3 sm:p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-amber-500/30"
            >
              <div className="text-xl sm:text-2xl mb-1 sm:mb-2">👑</div>
              <div className="font-medium text-sm sm:text-base">Títulos</div>
            </Link>
            <Link
              to="/leaderboards"
              className="bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white p-3 sm:p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-yellow-500/30"
            >
              <div className="text-xl sm:text-2xl mb-1 sm:mb-2">🏆</div>
              <div className="font-medium text-sm sm:text-base">Rankings</div>
            </Link>
          </div>
        </div>

        {/* Lore Curta */}
        <div className="mb-6 sm:mb-8 rounded-lg p-4 border border-amber-500/30 bg-amber-900/10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-amber-300 font-semibold">Forjador de Heróis — Introdução</div>
            <div className="flex items-center gap-2">
              <Link to="/intro?version=game_intro" className="px-3 py-1 rounded bg-amber-600 text-black text-xs">Narração</Link>
              <Link to="/intro?version=cinematic" className="px-3 py-1 rounded bg-indigo-600 text-white text-xs">Trailer</Link>
            </div>
          </div>
          <div className="space-y-2 text-xs sm:text-sm text-gray-200">
            {shortLore.paragraphs.map((p, i) => (<p key={i}>{p}</p>))}
          </div>
        </div>

        {/* Galeria de Heróis */}
        <ErrorBoundary>
          <HeroGallery
            onCreateHero={handleCreateHero}
            onHeroSelect={handleHeroSelect}
            onHeroEdit={handleHeroEdit}
            onHeroImageChange={handleHeroImageChange}
            showCreateButton={true}
            cardSize="medium"
            viewMode="grid"
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default HeroList;
