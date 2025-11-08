import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { SHOP_CATEGORIES, purchaseItem, canAfford, getDailyOffers, getDiscountedPrice, RARITY_CONFIG } from '../utils/shop';
import { Item } from '../types/hero';

const Shop: React.FC = () => {
  const { getSelectedHero, updateHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [activeCategory, setActiveCategory] = useState('consumables');
  const [showDailyOffers, setShowDailyOffers] = useState(false);

  if (!selectedHero) {
    return (
      <div className="max-w-full sm:max-w-4xl mx-auto p-4 sm:p-6 text-center">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Loja do Aventureiro</h2>
        <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Selecione um herói para acessar a loja.</p>
        <Link to="/" className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded hover:bg-blue-700 transition-colors text-sm sm:text-base">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }

  const handlePurchase = (itemId: string) => {
    const result = purchaseItem(selectedHero, itemId);
    
    if (result.success && result.newGold !== undefined && result.item) {
      // Atualizar ouro do herói
      updateHero(selectedHero.id, {
        progression: {
          ...selectedHero.progression,
          gold: result.newGold
        },
        inventory: {
          ...selectedHero.inventory,
          items: {
            ...selectedHero.inventory.items,
            [itemId]: (selectedHero.inventory.items[itemId] || 0) + 1
          }
        }
      });
      
      // Mostrar notificação de sucesso
      alert(result.message);
    } else {
      // Mostrar erro
      alert(result.message);
    }
  };

  const renderItem = (item: Item, index?: number) => {
    const canBuy = canAfford(selectedHero, item);
    const discountedPrice = getDiscountedPrice(item, selectedHero);
    const hasDiscount = discountedPrice < item.price;
    const rarity = RARITY_CONFIG[item.rarity];

    return (
      <div 
        key={`${item.id}-${index ?? 0}`}
        className={`bg-white p-4 rounded-lg border-2 shadow-sm hover:shadow-md transition-shadow`}
        style={{ borderColor: rarity.color }}
      >
        <div className="text-center mb-3">
          <div className="text-3xl mb-2">{item.icon || '📦'}</div>
          <h3 className="font-bold text-gray-800" style={{ color: rarity.color }}>
            {item.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
        </div>

        {/* Bônus */}
        {item.bonus && (
          <div className="text-xs text-center mb-3 space-y-1">
            {Object.entries(item.bonus).map(([stat, value]) => (
              <div key={stat} className="text-green-600">
                +{value} {stat.charAt(0).toUpperCase() + stat.slice(1)}
              </div>
            ))}
          </div>
        )}

        {/* Efeitos */}
        {item.effects && (
          <div className="text-xs text-center mb-3 space-y-1">
            {item.effects.hp && <div className="text-red-600">+{item.effects.hp} HP</div>}
            {item.effects.mp && <div className="text-blue-600">+{item.effects.mp} MP</div>}
            {item.effects.duration && <div className="text-purple-600">Duração: {item.effects.duration}min</div>}
          </div>
        )}

        {/* Preço */}
        <div className="text-center mb-3">
          {hasDiscount ? (
            <div>
              <span className="text-sm text-gray-500 line-through">{item.price}g</span>
              <span className="text-lg font-bold text-green-600 ml-2">{discountedPrice}g</span>
            </div>
          ) : (
            <span className="text-lg font-bold text-yellow-600">{item.price}g</span>
          )}
        </div>

        {/* Botão de compra */}
        <button
          onClick={() => handlePurchase(item.id)}
          disabled={!canBuy}
          className={`w-full py-2 px-4 rounded font-medium transition-colors ${
            canBuy
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          {canBuy ? 'Comprar' : 'Ouro Insuficiente'}
        </button>
      </div>
    );
  };

  const dailyOffers = getDailyOffers();

  return (
    <div className="max-w-full lg:max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2">
          🏪 Loja do Aventureiro
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Equipamentos, consumíveis e itens especiais para sua jornada
        </p>
        <div className="mt-3 sm:mt-4 bg-yellow-100 border border-yellow-400 rounded-lg p-2 sm:p-3 inline-block">
          <span className="text-yellow-800 font-medium text-sm sm:text-base">
            💰 Ouro Disponível: {selectedHero.progression.gold}g
          </span>
        </div>
        <div className="mt-3 sm:mt-4">
          <a
            href="#cosmetics"
            className="inline-block px-3 sm:px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm sm:text-base"
          >
            💖 Apoie o projeto (Cosméticos)
          </a>
        </div>
      </div>

      {/* Navegação */}
      <div className="flex flex-wrap justify-center gap-2 mb-4 sm:mb-6">
        <button
          onClick={() => setShowDailyOffers(false)}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
            !showDailyOffers ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          Catálogo Geral
        </button>
        <button
          onClick={() => setShowDailyOffers(true)}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
            showDailyOffers ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          ⭐ Ofertas Diárias
        </button>
      </div>

      {showDailyOffers ? (
        /* Ofertas Diárias */
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-orange-600">
            ⭐ Ofertas Especiais do Dia (20% OFF)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {dailyOffers.map(renderItem)}
          </div>
        </div>
      ) : (
        /* Catálogo Geral */
        <div>
          {/* Categorias */}
          <div className="flex flex-wrap justify-center gap-2 mb-4 sm:mb-6">
            {Object.entries(SHOP_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                  activeCategory === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>

          {/* Itens da categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {SHOP_CATEGORIES[activeCategory as keyof typeof SHOP_CATEGORIES].items.map(renderItem)}
          </div>

          {/* Cosméticos (placeholder) */}
          <div id="cosmetics" className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">🎨 Cosméticos (visual)</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Personalize molduras e fundos do herói. Desbloqueios naturais por XP e reputação.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[{
                id: 'frame-gold', name: 'Moldura Dourada', icon: '🟨', req: '500 XP', unlocked: (selectedHero.progression.xp || 0) >= 500
              }, {
                id: 'frame-royal', name: 'Moldura Real', icon: '👑', req: 'Rank B+', unlocked: (selectedHero.rankData?.currentRank || 'F') <= 'B'
              }, {
                id: 'bg-aurora', name: 'Fundo Aurora', icon: '🌌', req: 'Reputação 10+', unlocked: (selectedHero.progression.reputation || 0) >= 10
              }].map(c => (
                <div key={c.id} className={`p-3 sm:p-4 rounded-lg border ${c.unlocked ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{c.icon}</div>
                  <div className="font-semibold text-sm sm:text-base">{c.name}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Requisito: {c.req}</div>
                  <div className="mt-2 sm:mt-3">
                    <button
                      disabled={!c.unlocked}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${c.unlocked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    >
                      {c.unlocked ? 'Aplicar' : 'Bloqueado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-sm text-gray-500">
              Em breve: compra de cosméticos premium para apoiar o projeto.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
