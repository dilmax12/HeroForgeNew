import React, { useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { Title } from '../types/hero';
import { 
  getTitlesByCategory, 
  getTitlesByRarity, 
  getActiveTitle, 
  formatTitleDisplay,
  getRarityColor,
  getRarityBg
} from '../utils/titles';

const TitlesManager: React.FC = () => {
  const { selectedHero, setActiveTitle } = useHeroStore();
  const [selectedCategory, setSelectedCategory] = useState<'all' | Title['category']>('all');
  const [selectedRarity, setSelectedRarity] = useState<'all' | Title['rarity']>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!selectedHero) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-amber-400 mb-4">Selecione um Herói</h2>
        <p className="text-gray-300">Você precisa selecionar um herói para gerenciar títulos.</p>
      </div>
    );
  }

  const activeTitle = getActiveTitle(selectedHero);

  // Filtrar títulos
  let filteredTitles = selectedHero.titles;

  if (selectedCategory !== 'all') {
    filteredTitles = getTitlesByCategory(filteredTitles, selectedCategory);
  }

  if (selectedRarity !== 'all') {
    filteredTitles = getTitlesByRarity(filteredTitles, selectedRarity);
  }

  if (searchTerm) {
    filteredTitles = filteredTitles.filter(title =>
      title.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      title.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const handleSetActiveTitle = (titleId: string) => {
    setActiveTitle(titleId);
  };

  const handleRemoveActiveTitle = () => {
    setActiveTitle(undefined);
  };

  const getCategoryIcon = (category: Title['category']) => {
    switch (category) {
      case 'combat': return '⚔️';
      case 'exploration': return '🗺️';
      case 'social': return '👥';
      case 'achievement': return '🏆';
      case 'special': return '⭐';
      default: return '📜';
    }
  };

  const getCategoryName = (category: Title['category']) => {
    switch (category) {
      case 'combat': return 'Combate';
      case 'exploration': return 'Exploração';
      case 'social': return 'Social';
      case 'achievement': return 'Conquistas';
      case 'special': return 'Especial';
      default: return 'Outros';
    }
  };

  const getRarityName = (rarity: Title['rarity']) => {
    switch (rarity) {
      case 'comum': return 'Comum';
      case 'raro': return 'Raro';
      case 'epico': return 'Épico';
      case 'lendario': return 'Lendário';
      case 'especial': return 'Especial';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-amber-400 mb-4">Gerenciar Títulos</h2>
        
        {/* Título Ativo */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">Título Ativo</h3>
          {activeTitle ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-4xl">{activeTitle.badge}</span>
                <div>
                  <h4 className={`text-lg font-bold ${getRarityColor(activeTitle.rarity)}`}>
                    {activeTitle.name}
                  </h4>
                  <p className="text-gray-300 text-sm">{activeTitle.description}</p>
                  <p className="text-amber-400 text-sm mt-1">
                    Como será exibido: {formatTitleDisplay(selectedHero)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveActiveTitle}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors"
              >
                Remover Título
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Nenhum título ativo</p>
              <p className="text-sm text-gray-500">
                Selecione um título abaixo para exibi-lo em seu perfil
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Filtros</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Busca */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buscar Título
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome ou descrição..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Categorias</option>
              <option value="combat">⚔️ Combate</option>
              <option value="exploration">🗺️ Exploração</option>
              <option value="social">👥 Social</option>
              <option value="achievement">🏆 Conquistas</option>
              <option value="special">⭐ Especial</option>
            </select>
          </div>

          {/* Raridade */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Raridade
            </label>
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Raridades</option>
              <option value="comum">Comum</option>
              <option value="raro">Raro</option>
              <option value="epico">Épico</option>
              <option value="lendario">Lendário</option>
              <option value="especial">Especial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Títulos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTitles.map(title => (
          <div 
            key={title.id} 
            className={`bg-gray-800 rounded-lg p-6 border transition-all hover:border-amber-500 ${
              activeTitle?.id === title.id ? 'border-amber-500 bg-amber-900/10' : 'border-gray-700'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{title.badge}</span>
                <div>
                  <h4 className={`text-lg font-bold ${getRarityColor(title.rarity)}`}>
                    {title.name}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getRarityColor(title.rarity)} ${getRarityBg(title.rarity)}`}>
                      {getRarityName(title.rarity)}
                    </span>
                    <span className="text-gray-400 text-xs flex items-center space-x-1">
                      <span>{getCategoryIcon(title.category)}</span>
                      <span>{getCategoryName(title.category)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-300 text-sm mb-4">{title.description}</p>

            <div className="text-xs text-gray-400 mb-4">
              Desbloqueado em: {new Date(title.unlockedAt).toLocaleDateString('pt-BR')}
            </div>

            <div className="flex justify-end">
              {activeTitle?.id === title.id ? (
                <span className="px-4 py-2 bg-amber-600 rounded-md font-medium text-sm">
                  ✓ Ativo
                </span>
              ) : (
                <button
                  onClick={() => handleSetActiveTitle(title.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-medium text-sm transition-colors"
                >
                  Equipar Título
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTitles.length === 0 && (
        <div className="text-center p-8">
          <p className="text-gray-400 mb-4">
            {selectedHero.titles.length === 0 
              ? 'Você ainda não possui títulos desbloqueados.'
              : 'Nenhum título encontrado com os filtros aplicados.'
            }
          </p>
          {selectedHero.titles.length === 0 && (
            <p className="text-sm text-gray-500">
              Complete conquistas e missões para desbloquear títulos!
            </p>
          )}
        </div>
      )}

      {/* Estatísticas */}
      <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Estatísticas de Títulos</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-400">{selectedHero.titles.length}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">
              {getTitlesByRarity(selectedHero.titles, 'comum').length}
            </div>
            <div className="text-sm text-gray-400">Comuns</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">
              {getTitlesByRarity(selectedHero.titles, 'raro').length}
            </div>
            <div className="text-sm text-gray-400">Raros</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {getTitlesByRarity(selectedHero.titles, 'epico').length}
            </div>
            <div className="text-sm text-gray-400">Épicos</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {getTitlesByRarity(selectedHero.titles, 'lendario').length}
            </div>
            <div className="text-sm text-gray-400">Lendários</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitlesManager;