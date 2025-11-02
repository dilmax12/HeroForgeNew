import React, { useState } from 'react';
import { useHeroStore } from '../store/heroStore';
import { SHOP_ITEMS, SHOP_CATEGORIES, purchaseItem, canAfford, getDailyOffers, getDiscountedPrice, RARITY_CONFIG } from '../utils/shop';
import { Item } from '../types/hero';

const Shop: React.FC = () => {
  const { getSelectedHero, updateHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [activeCategory, setActiveCategory] = useState('consumables');
  const [showDailyOffers, setShowDailyOffers] = useState(false);

  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Loja do Aventureiro</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para acessar a loja.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
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

  const renderItem = (item: Item) => {
    const canBuy = canAfford(selectedHero, item);
    const discountedPrice = getDiscountedPrice(item, selectedHero);
    const hasDiscount = discountedPrice < item.price;
    const rarity = RARITY_CONFIG[item.rarity];

    return (
      <div 
        key={item.id} 
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
          }`}
        >
          {canBuy ? 'Comprar' : 'Ouro Insuficiente'}
        </button>
      </div>
    );
  };

  const dailyOffers = getDailyOffers();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          🏪 Loja do Aventureiro
        </h1>
        <p className="text-gray-600">
          Equipamentos, consumíveis e itens especiais para sua jornada
        </p>
        <div className="mt-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 inline-block">
          <span className="text-yellow-800 font-medium">
            💰 Ouro Disponível: {selectedHero.progression.gold}g
          </span>
        </div>
      </div>

      {/* Navegação */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button
          onClick={() => setShowDailyOffers(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !showDailyOffers ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Catálogo Geral
        </button>
        <button
          onClick={() => setShowDailyOffers(true)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showDailyOffers ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ⭐ Ofertas Diárias
        </button>
      </div>

      {showDailyOffers ? (
        /* Ofertas Diárias */
        <div>
          <h2 className="text-2xl font-bold text-center mb-6 text-orange-600">
            ⭐ Ofertas Especiais do Dia (20% OFF)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dailyOffers.map(renderItem)}
          </div>
        </div>
      ) : (
        /* Catálogo Geral */
        <div>
          {/* Categorias */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {Object.entries(SHOP_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeCategory === key
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>

          {/* Itens da categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {SHOP_CATEGORIES[activeCategory as keyof typeof SHOP_CATEGORIES].items.map(renderItem)}
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;