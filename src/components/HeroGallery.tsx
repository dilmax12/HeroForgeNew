import React, { useState, useMemo } from 'react';
import { Hero, HeroClass, Element } from '../types/hero';
import { HeroGalleryCard } from './HeroGalleryCard';
import { useHeroStore } from '../store/heroStore';
import { Search, Filter, Grid, List, Plus } from 'lucide-react';

interface HeroGalleryProps {
  onCreateHero?: () => void;
  onHeroSelect?: (hero: Hero) => void;
  onHeroEdit?: (hero: Hero) => void;
  onHeroImageChange?: (hero: Hero) => void;
  showCreateButton?: boolean;
  cardSize?: 'small' | 'medium' | 'large';
  viewMode?: 'grid' | 'list';
}

export const HeroGallery: React.FC<HeroGalleryProps> = ({
  onCreateHero,
  onHeroSelect,
  onHeroEdit,
  onHeroImageChange,
  showCreateButton = true,
  cardSize = 'medium',
  viewMode: initialViewMode = 'grid'
}) => {
  const { heroes } = useHeroStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<HeroClass | 'all'>('all');
  const [selectedElement, setSelectedElement] = useState<Element | 'all'>('all');
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar heróis baseado nos critérios
  const filteredHeroes = useMemo(() => {
    return heroes.filter(hero => {
      const matchesSearch = hero.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           hero.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           hero.race.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesClass = selectedClass === 'all' || hero.class === selectedClass;
      const matchesElement = selectedElement === 'all' || hero.element === selectedElement;

      return matchesSearch && matchesClass && matchesElement;
    });
  }, [heroes, searchTerm, selectedClass, selectedElement]);

  const handleHeroClick = (hero: Hero) => {
    onHeroSelect?.(hero);
  };

  const gridClasses = {
    small: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    medium: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    large: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
  };

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho com Controles */}
      <div className="bg-gradient-to-r from-amber-900/20 to-yellow-800/20 backdrop-blur-sm rounded-lg border border-yellow-500/30 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Título e Contador */}
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-yellow-400 font-serif">
              Galeria de Heróis
            </h2>
            <span className="bg-yellow-600/20 text-yellow-300 px-3 py-1 rounded-full text-sm">
              {filteredHeroes.length} {filteredHeroes.length === 1 ? 'herói' : 'heróis'}
            </span>
          </div>

          {/* Controles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar heróis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-black/30 border border-yellow-500/30 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 w-40 sm:w-64"
              />
            </div>

            {/* Botão de Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md border transition-colors ${
                showFilters 
                  ? 'bg-yellow-600 border-yellow-500 text-white' 
                  : 'bg-black/30 border-yellow-500/30 text-yellow-400 hover:bg-yellow-600/20'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* Modo de Visualização */}
            <div className="flex border border-yellow-500/30 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-black/30 text-yellow-400 hover:bg-yellow-600/20'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-black/30 text-yellow-400 hover:bg-yellow-600/20'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Botão Criar Herói */}
            {showCreateButton && (
              <button
                onClick={onCreateHero}
                className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 sm:px-4 py-2 rounded-md font-bold transition-colors flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Herói</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtros Expandidos */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-yellow-500/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro por Classe */}
              <div>
                <label className="block text-sm font-medium text-yellow-300 mb-2">
                  Classe
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value as HeroClass | 'all')}
                  className="w-full bg-black/30 border border-yellow-500/30 rounded-md text-white p-2 focus:outline-none focus:border-yellow-400"
                >
                  <option value="all">Todas as Classes</option>
                  <option value="guerreiro">Guerreiro</option>
                  <option value="mago">Mago</option>
                  <option value="ladino">Ladino</option>
                  <option value="clerigo">Clérigo</option>
                  <option value="patrulheiro">Patrulheiro</option>
                  <option value="paladino">Paladino</option>
                  <option value="arqueiro">Arqueiro</option>
                </select>
              </div>

              {/* Filtro por Elemento */}
              <div>
                <label className="block text-sm font-medium text-yellow-300 mb-2">
                  Elemento
                </label>
                <select
                  value={selectedElement}
                  onChange={(e) => setSelectedElement(e.target.value as Element | 'all')}
                  className="w-full bg-black/30 border border-yellow-500/30 rounded-md text-white p-2 focus:outline-none focus:border-yellow-400"
                >
                  <option value="all">Todos os Elementos</option>
                  <option value="fire">🔥 Fogo</option>
                  <option value="ice">❄️ Gelo</option>
                  <option value="thunder">⚡ Raio</option>
                  <option value="earth">🌍 Terra</option>
                  <option value="light">✨ Luz</option>
                  <option value="dark">🌑 Sombra</option>
                  <option value="physical">⚔️ Físico</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Heróis */}
      {filteredHeroes.length > 0 ? (
        <div className={`
          ${viewMode === 'grid' 
            ? `grid ${gridClasses[cardSize]} gap-6` 
            : 'flex flex-col space-y-4'
          }
        `}>
          {filteredHeroes.map((hero) => (
            <HeroGalleryCard
              key={hero.id}
              hero={hero}
              onClick={() => handleHeroClick(hero)}
              size={viewMode === 'list' ? 'small' : cardSize}
              showDetails={true}
              onEdit={onHeroEdit}
              onImageChange={onHeroImageChange}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🦸</div>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">
            Nenhum herói encontrado
          </h3>
          <p className="text-gray-400 mb-6">
            {searchTerm || selectedClass !== 'all' || selectedElement !== 'all'
              ? 'Tente ajustar os filtros de busca.'
              : 'Você ainda não criou nenhum herói.'}
          </p>
          {showCreateButton && (
            <button
              onClick={onCreateHero}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-3 rounded-md font-bold transition-colors flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Criar Primeiro Herói</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HeroGallery;
