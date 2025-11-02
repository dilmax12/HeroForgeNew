import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroGallery } from './HeroGallery';
import { useHeroStore } from '../store/heroStore';
import { Hero } from '../types/hero';
import { EXAMPLE_HERO_DATA, generateExampleHero } from '../utils/heroExample';

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <div className="container mx-auto p-6">
        {/* Input oculto para upload de imagem */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400 mb-2">⚔️ Hero Forge</h1>
          <p className="text-gray-300">Gerencie seus heróis épicos</p>
          
          {/* Botão para criar herói de exemplo */}
          <div className="mt-4">
            <button
              onClick={handleCreateExampleHero}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
            >
              🧙‍♂️ Criar Herói de Exemplo
            </button>
          </div>
        </div>

        {/* Seção de Navegação Rápida */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link
              to="/quests"
              className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-blue-500/30"
            >
              <div className="text-2xl mb-2">⚔️</div>
              <div className="font-medium">Missões</div>
            </Link>
            <Link
              to="/guilds"
              className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-purple-500/30"
            >
              <div className="text-2xl mb-2">🏰</div>
              <div className="font-medium">Guildas</div>
            </Link>
            <Link
              to="/titles"
              className="bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-amber-500/30"
            >
              <div className="text-2xl mb-2">👑</div>
              <div className="font-medium">Títulos</div>
            </Link>
            <Link
              to="/leaderboards"
              className="bg-gradient-to-br from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-yellow-500/30"
            >
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-medium">Rankings</div>
            </Link>
            <Link
              to="/playtest"
              className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white p-4 rounded-lg text-center transition-all transform hover:scale-105 border border-green-500/30"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium">Playtest</div>
            </Link>
          </div>
        </div>

        {/* Galeria de Heróis */}
        <HeroGallery
          onCreateHero={handleCreateHero}
          onHeroSelect={handleHeroSelect}
          onHeroEdit={handleHeroEdit}
          onHeroImageChange={handleHeroImageChange}
          showCreateButton={true}
          cardSize="medium"
          viewMode="grid"
        />
      </div>
    </div>
  );
};

export default HeroList;