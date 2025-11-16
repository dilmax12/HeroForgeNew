import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHeroStore } from '../store/heroStore';
import { SHOP_CATEGORIES, purchaseItem, canAfford, getDailyOffers, getDiscountedPrice, RARITY_CONFIG } from '../utils/shop';
import { Item } from '../types/hero';
import { useMonetizationStore } from '../store/monetizationStore';
import ThemePreviewModal from './ThemePreviewModal';
import { trackMetric } from '../utils/metricsSystem';
import { seasonalThemes } from '../styles/medievalTheme';

const Shop: React.FC = () => {
  const { getSelectedHero, updateHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const { ownedFrames, activeFrameId, setActiveFrame, markPurchase, ownedThemes, activeThemeId, setActiveTheme } = useMonetizationStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewId, setPreviewId] = useState<'medieval'|'futurista'|'noir'|undefined>(undefined);
  const [activeCategory, setActiveCategory] = useState('consumables');
  const [showDailyOffers, setShowDailyOffers] = useState(false);
  const [showForgeServices, setShowForgeServices] = useState(false);
  const [fusionA, setFusionA] = useState<string>('');
  const [fusionB, setFusionB] = useState<string>('');
  useEffect(() => { trackMetric.pageVisited(selectedHero?.id || 'system', '/shop'); trackMetric.featureUsed(selectedHero?.id || 'system', 'shop-open'); }, [])

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
    try { trackMetric.featureUsed(selectedHero.id, 'shop-buy-click') } catch {}
    const result = purchaseItem(selectedHero, itemId);
    
    if (result.success && result.item) {
      try { trackMetric.itemAcquired(selectedHero.id, { itemId }) } catch {}
      // Atualizar saldo da moeda correta e inventário
      const currency = result.currency || 'gold';
      const newProgression = { ...selectedHero.progression } as any;
      if (result.newBalance !== undefined) {
        if (currency === 'gold') newProgression.gold = result.newBalance;
        else if (currency === 'glory') newProgression.glory = result.newBalance;
        else if (currency === 'arcaneEssence') newProgression.arcaneEssence = result.newBalance;
      } else if (result.newGold !== undefined) {
        newProgression.gold = result.newGold;
      }

      updateHero(selectedHero.id, {
        progression: newProgression,
        inventory: {
          ...selectedHero.inventory,
          items: {
            ...selectedHero.inventory.items,
            [itemId]: (selectedHero.inventory.items[itemId] || 0) + 1
          }
        }
      });
      
      alert(result.message);
    } else {
      try { trackMetric.featureUsed(selectedHero.id, 'shop-buy-denied') } catch {}
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
          {(() => {
            const currency = item.currency || 'gold';
            const label = currency === 'gold' ? 'ouro' : currency === 'glory' ? 'glória' : 'essência arcana';
            if (hasDiscount) {
              return (
                <div>
                  <span className="text-sm text-gray-500 line-through">{item.price} {label}</span>
                  <span className="text-lg font-bold text-green-600 ml-2">{discountedPrice} {label}</span>
                </div>
              );
            }
            return <span className="text-lg font-bold text-yellow-600">{item.price} {label}</span>;
          })()}
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
          {(() => {
            if (canBuy) return 'Comprar';
            const currency = item.currency || 'gold';
            const label = currency === 'gold' ? 'Ouro' : currency === 'glory' ? 'Glória' : 'Essência Arcana';
            return `${label} Insuficiente`;
          })()}
        </button>
      </div>
    );
  };

  const dailyOffers = getDailyOffers();

  const handleRefine = (slot: 'weapon' | 'armor' | 'accessory') => {
    const ok = useHeroStore.getState().refineEquippedItem(selectedHero.id, slot);
    alert(ok ? 'Refino realizado! (chance aplicada)' : 'Falha: requisitos não atendidos ou item indisponível.');
  };

  const handleFuse = () => {
    if (!fusionA || !fusionB) {
      alert('Selecione dois itens para fundir.');
      return;
    }
    const ok = useHeroStore.getState().fuseItems(selectedHero.id, fusionA, fusionB);
    alert(ok ? 'Fusão concluída! Novo item adicionado ao inventário.' : 'Falha na fusão (verifique tipos e quantidades).');
  };

  const handleEnchant = (slot: 'weapon' | 'armor' | 'accessory') => {
    const ok = useHeroStore.getState().enchantEquippedItem(selectedHero.id, slot, 'lifesteal');
    alert(ok ? 'Encantamento aplicado: Lifesteal!' : 'Essência insuficiente ou item não equipado.');
  };

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
        <div className="mt-3 sm:mt-4 flex flex-wrap justify-center gap-2">
          <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-2 sm:p-3 inline-block">
            <span className="text-yellow-800 font-medium text-sm sm:text-base">
              💰 Ouro: {selectedHero.progression.gold || 0}
            </span>
          </div>
          <div className="bg-blue-100 border border-blue-400 rounded-lg p-2 sm:p-3 inline-block">
            <span className="text-blue-800 font-medium text-sm sm:text-base">
              🏆 Glória: {selectedHero.progression.glory || 0}
            </span>
          </div>
          <div className="bg-purple-100 border border-purple-400 rounded-lg p-2 sm:p-3 inline-block">
            <span className="text-purple-800 font-medium text-sm sm:text-base">
              ✨ Essência Arcana: {selectedHero.progression.arcaneEssence || 0}
            </span>
          </div>
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
          onClick={() => { setShowDailyOffers(false); setShowForgeServices(false); trackMetric.featureUsed(selectedHero.id, 'shop-tab-catalog'); }}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
            !showDailyOffers && !showForgeServices ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          Catálogo Geral
        </button>
        <button
          onClick={() => { setShowDailyOffers(true); setShowForgeServices(false); trackMetric.featureUsed(selectedHero.id, 'shop-tab-daily'); }}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
            showDailyOffers ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          ⭐ Ofertas Diárias
        </button>
        <button
          onClick={() => { setShowDailyOffers(false); setShowForgeServices(true); trackMetric.featureUsed(selectedHero.id, 'shop-tab-forge'); }}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
            showForgeServices ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
        >
          ⚒️ Forja e Encantamentos
        </button>
      </div>

      {/* Comunicação de fairness e remover anúncios */}
      <div className="max-w-full sm:max-w-4xl mx-auto mb-6">
        <div className="rounded-lg border bg-white p-3 sm:p-4">
          <div className="text-sm sm:text-base text-gray-700">
            O jogo core é gratuito e justo. Compras são 100% opcionais e apenas cosméticas ou narrativas.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  const { startCheckout, verifyPurchase } = await import('../services/paymentsService');
                  const resp = await startCheckout('remove-ads');
                  if (resp.ok) {
                    const v = await verifyPurchase(resp.sessionId || '');
                    if (v.ok) {
                      trackMetric.purchaseInitiated(selectedHero.id, 'remove-ads');
                      markPurchase('remove-ads', { id: resp.sessionId || `rcpt-${Date.now()}` });
                      useMonetizationStore.getState().removeAdsForever();
                      trackMetric.purchaseCompleted(selectedHero.id, 'remove-ads', resp.sessionId || undefined);
                      alert('Anúncios removidos. Obrigado pelo apoio!');
                    }
                  }
                } catch {
                  // fallback local
                  trackMetric.purchaseInitiated(selectedHero.id, 'remove-ads');
                  markPurchase('remove-ads', { id: `rcpt-${Date.now()}` });
                  useMonetizationStore.getState().removeAdsForever();
                  trackMetric.purchaseCompleted(selectedHero.id, 'remove-ads');
                  alert('Anúncios removidos. Obrigado pelo apoio!');
                }
              }}
              className={`px-3 sm:px-4 py-2 rounded bg-gradient-to-r ${((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.buttonGradient) || 'from-rose-600 to-amber-600'} text-white text-sm sm:text-base hover:brightness-110 flex items-center gap-2`}
            >
              {((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.accents?.[0]) || ''}
              <span>Remover anúncios (IAP único)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner sazonal com link para Premium */}
      <div className="max-w-full sm:max-w-4xl mx-auto mb-6">
        <div className="rounded-lg border bg-white p-3 sm:p-4 flex items-center justify-between">
          <div className="text-sm sm:text-base text-gray-700 flex items-center gap-2">
            <span>{((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.accents?.[0]) || '🎭'}</span>
            <span>Ofertas sazonais disponíveis conforme o tema atual.</span>
          </div>
          <Link to="/premium" onClick={() => { trackMetric.featureUsed(selectedHero.id, 'shop-premium-banner-click'); }} className={`px-3 py-2 rounded bg-gradient-to-r ${((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.buttonGradient) || 'from-amber-600 to-yellow-600'} text-white text-sm hover:brightness-110`}>Ver Ofertas</Link>
        </div>
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
      ) : showForgeServices ? (
        /* Forja e Encantamentos */
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-gray-800">⚒️ Forja e Encantamentos</h2>

          {/* Refinar */}
          <div className="mb-6">
            <h3 className="text-lg sm:text-xl font-semibold mb-3">Refinar Raridade</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['weapon','armor','accessory'] as const).map(slot => {
                const equippedId = (() => {
                  if (slot === 'weapon') return selectedHero.inventory.equippedMainHand || selectedHero.inventory.equippedOffHand || selectedHero.inventory.equippedWeapon || (selectedHero.inventory.equippedWeapons || [])[0];
                  if (slot === 'armor') return selectedHero.inventory.equippedChest || selectedHero.inventory.equippedArmor || (selectedHero.inventory.equippedArmorSlots || [])[0];
                  return selectedHero.inventory.equippedNecklace || selectedHero.inventory.equippedRingLeft || selectedHero.inventory.equippedRingRight || selectedHero.inventory.equippedAccessory || (selectedHero.inventory.equippedAccessories || [])[0];
                })();
                const baseItem = equippedId ? (SHOP_CATEGORIES.weapons.items.concat(SHOP_CATEGORIES.armor.items, SHOP_CATEGORIES.accessories.items).find(i => i.id === equippedId) || selectedHero.inventory.customItems?.[equippedId]) : undefined;
                const currentRarity = equippedId ? (selectedHero.inventory.refined?.[equippedId] || baseItem?.rarity) : undefined;
                const label = slot === 'weapon' ? 'Arma' : slot === 'armor' ? 'Armadura' : 'Acessório';
                const cfgMap: Record<string, { gold: number; essence: number; nextLabel: string }> = {
                  'comum': { gold: 100, essence: 10, nextLabel: 'Incomum' },
                  'incomum': { gold: 200, essence: 20, nextLabel: 'Raro' },
                  'raro': { gold: 400, essence: 40, nextLabel: 'Épico' },
                  'epico': { gold: 1000, essence: 100, nextLabel: 'Lendário' }
                };
                const cfg = currentRarity ? cfgMap[currentRarity] : undefined;
                return (
                  <div key={slot} className="p-4 rounded-lg border bg-white">
                    <div className="font-semibold">{label}</div>
                    <div className="text-sm text-gray-600">{equippedId ? (baseItem?.name || 'Item Personalizado') : 'Nenhum equipado'}</div>
                    <div className="text-sm mt-1">Raridade: {currentRarity ? currentRarity : '-'}</div>
                    <button
                      onClick={() => handleRefine(slot)}
                      disabled={!equippedId || !cfg}
                      className={`mt-3 w-full py-2 px-4 rounded ${equippedId && cfg ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      {cfg ? `Refinar → ${cfg.nextLabel} (💰 ${cfg.gold}, ✨ ${cfg.essence})` : 'Não disponível'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fundir */}
          <div className="mb-6">
            <h3 className="text-lg sm:text-xl font-semibold mb-3">Fundir Itens</h3>
            <p className="text-sm text-gray-600 mb-2">Consome 2 itens do mesmo tipo para criar um novo item único.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item A</label>
                <select value={fusionA} onChange={e => setFusionA(e.target.value)} className="w-full border rounded p-2">
                  <option value="">Selecione</option>
                  {Object.entries(selectedHero.inventory.items)
                    .map(([id, qty]) => ({ id, qty, item: SHOP_CATEGORIES.weapons.items.concat(SHOP_CATEGORIES.armor.items, SHOP_CATEGORIES.accessories.items).find(i => i.id === id) }))
                    .filter(e => e.item && e.qty > 0)
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.item!.name} (x{e.qty})</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Item B</label>
                <select value={fusionB} onChange={e => setFusionB(e.target.value)} className="w-full border rounded p-2">
                  <option value="">Selecione</option>
                  {Object.entries(selectedHero.inventory.items)
                    .map(([id, qty]) => ({ id, qty, item: SHOP_CATEGORIES.weapons.items.concat(SHOP_CATEGORIES.armor.items, SHOP_CATEGORIES.accessories.items).find(i => i.id === id) }))
                    .filter(e => e.item && e.qty > 0)
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.item!.name} (x{e.qty})</option>
                    ))}
                </select>
              </div>
            </div>
            <button onClick={handleFuse} className={`mt-3 px-4 py-2 bg-gradient-to-r ${((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.buttonGradient) || 'from-green-600 to-emerald-600'} text-white rounded hover:brightness-110 flex items-center gap-2`}>
              {((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.accents?.[0]) || ''}
              <span>Fundir</span>
            </button>
          </div>

          {/* Encantar */}
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-3">Encantar Item</h3>
            <p className="text-sm text-gray-600 mb-2">Aplica efeito especial (lifesteal) ao item equipado. Custo: ✨ 50 Essência.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['weapon','armor','accessory'] as const).map(slot => {
                const equippedId = (() => {
                  if (slot === 'weapon') return selectedHero.inventory.equippedMainHand || selectedHero.inventory.equippedOffHand || selectedHero.inventory.equippedWeapon || (selectedHero.inventory.equippedWeapons || [])[0];
                  if (slot === 'armor') return selectedHero.inventory.equippedChest || selectedHero.inventory.equippedArmor || (selectedHero.inventory.equippedArmorSlots || [])[0];
                  return selectedHero.inventory.equippedNecklace || selectedHero.inventory.equippedRingLeft || selectedHero.inventory.equippedRingRight || selectedHero.inventory.equippedAccessory || (selectedHero.inventory.equippedAccessories || [])[0];
                })();
                const label = slot === 'weapon' ? 'Arma' : slot === 'armor' ? 'Armadura' : 'Acessório';
                const enchanted = equippedId ? selectedHero.inventory.enchantments?.[equippedId]?.special : undefined;
                return (
                  <div key={slot} className="p-4 rounded-lg border bg-white">
                    <div className="font-semibold">{label}</div>
                    <div className="text-sm text-gray-600">{equippedId ? (SHOP_CATEGORIES.weapons.items.concat(SHOP_CATEGORIES.armor.items, SHOP_CATEGORIES.accessories.items).find(i => i.id === equippedId)?.name || 'Item Personalizado') : 'Nenhum equipado'}</div>
                    <div className="text-sm mt-1">Encanto: {enchanted ? enchanted : '-'}</div>
                    <button
                      onClick={() => handleEnchant(slot)}
                      disabled={!equippedId}
                      className={`mt-3 w-full py-2 px-4 rounded ${equippedId ? `bg-gradient-to-r ${((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.buttonGradient) || 'from-purple-600 to-violet-600'} text-white hover:brightness-110 flex items-center gap-2` : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      {equippedId ? (((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.accents?.[0]) || '') : ''}
                      <span>Encantar (Lifesteal)</span>
                    </button>
                  </div>
                );
              })}
            </div>
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

          {/* Cosméticos e Premium (visual) */}
          <div id="cosmetics" className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">🎨 Cosméticos (visual) e Premium</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Personalize molduras e fundos do herói. Itens premium são opcionais e não afetam o balanceamento narrativo.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {[{
                id: 'frame-gold', name: 'Moldura Dourada', icon: '🟨', req: '500 XP', unlocked: (selectedHero.progression.xp || 0) >= 500
              }, {
                id: 'frame-royal', name: 'Moldura Real', icon: '👑', req: 'Rank B+', unlocked: (selectedHero.rankData?.currentRank || 'F') <= 'B'
              }, {
                id: 'bg-aurora', name: 'Fundo Aurora', icon: '🌌', req: 'Reputação 10+', unlocked: (selectedHero.progression.reputation || 0) >= 10
              }, {
                id: 'frame-futurista', name: 'Moldura Futurista (Premium)', icon: '🧪', req: 'Produto Premium', unlocked: ownedFrames.includes('futurista')
              }, {
                id: 'frame-noir', name: 'Moldura Noir (Premium)', icon: '🕶️', req: 'Produto Premium', unlocked: ownedFrames.includes('noir')
              }, {
                id: 'theme-futurista', name: 'Tema Futurista (Premium)', icon: '🌌', req: 'Tema Premium', unlocked: ownedThemes.includes('futurista')
              }, {
                id: 'theme-noir', name: 'Tema Noir (Premium)', icon: '🖤', req: 'Tema Premium', unlocked: ownedThemes.includes('noir')
              }, {
                id: 'season-natal', name: 'Tema Sazonal: Festival de Inverno', icon: '🌿', req: 'Sazonal', unlocked: true
              }, {
                id: 'season-pascoa', name: 'Tema Sazonal: Renascimento Rúnico', icon: '🥚', req: 'Sazonal', unlocked: true
              }, {
                id: 'season-ano-novo', name: 'Tema Sazonal: Profecias do Ano Novo', icon: '🎆', req: 'Sazonal', unlocked: true
              }, {
                id: 'season-carnaval', name: 'Tema Sazonal: Mascarada dos Bardos', icon: '🎭', req: 'Sazonal', unlocked: true
              }].map(c => (
                <div key={c.id} className={`p-3 sm:p-4 rounded-lg border ${c.unlocked ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{c.icon}</div>
                  <div className="font-semibold text-sm sm:text-base">{c.name}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Requisito: {c.req}</div>
                  <div className="mt-2 sm:mt-3 flex gap-2">
                <button
                  onClick={() => { if (c.id.startsWith('frame-')) {
                    const map: Record<string, any> = { 'frame-gold': 'medieval', 'frame-royal': 'medieval', 'frame-futurista': 'futurista', 'frame-noir': 'noir' };
                    const target = map[c.id] as ('medieval'|'futurista'|'noir');
                    setPreviewId(target); setPreviewOpen(true);
                  }}}
                  className={`px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  Pré-visualizar
                </button>
                <button
                  disabled={!c.unlocked}
                  onClick={() => { if (c.id.startsWith('frame-')) {
                    const map: Record<string, any> = { 'frame-gold': 'medieval', 'frame-royal': 'medieval', 'frame-futurista': 'futurista', 'frame-noir': 'noir' };
                    const target = map[c.id] as ('medieval'|'futurista'|'noir');
                    setActiveFrame(target);
                  } else if (c.id.startsWith('theme-')) {
                    const target = c.id === 'theme-futurista' ? 'futurista' : 'noir';
                    setActiveTheme(target);
                  } else if (c.id.startsWith('season-')) {
                    const map: Record<string, any> = { 'season-natal': 'natal', 'season-pascoa': 'pascoa', 'season-ano_novo': 'ano_novo', 'season-ano-novo': 'ano_novo', 'season-carnaval': 'carnaval' };
                    const target = map[c.id];
                    useMonetizationStore.getState().setActiveSeasonalTheme(target);
                  }}}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${c.unlocked ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  {c.unlocked ? (
                    c.id.startsWith('frame-')
                      ? (activeFrameId === (c.id === 'frame-futurista' ? 'futurista' : c.id === 'frame-noir' ? 'noir' : 'medieval') ? 'Aplicado' : 'Aplicar')
                      : (c.id.startsWith('theme-')
                          ? (activeThemeId === (c.id === 'theme-futurista' ? 'futurista' : 'noir') ? 'Aplicado' : 'Aplicar')
                          : 'Aplicar')
                  ) : 'Bloqueado'}
                </button>
                    {c.id === 'frame-futurista' || c.id === 'frame-noir' || c.id === 'theme-futurista' || c.id === 'theme-noir' ? (
                      <button
                        onClick={() => {
                          const target = c.id.endsWith('futurista') ? 'futurista' : 'noir';
                          if (c.id.startsWith('frame-')) {
                            if (!ownedFrames.includes(target)) {
                              trackMetric.purchaseInitiated(selectedHero.id, `frame-${target}`);
                              markPurchase(`frame-${target}`, { id: `rcpt-${Date.now()}` });
                              trackMetric.purchaseCompleted(selectedHero.id, `frame-${target}`);
                            }
                          } else {
                            if (!ownedThemes.includes(target)) {
                              trackMetric.purchaseInitiated(selectedHero.id, `theme-${target}`);
                              markPurchase(`theme-${target}`, { id: `rcpt-${Date.now()}` });
                              trackMetric.purchaseCompleted(selectedHero.id, `theme-${target}`);
                            }
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.buttonGradient) || 'from-amber-600 to-yellow-600'} text-white hover:brightness-110 flex items-center gap-2`}
                      >
                        {((seasonalThemes as any)[useMonetizationStore.getState().activeSeasonalTheme || '']?.accents?.[0]) || ''}
                        <span>Comprar Premium</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-sm text-gray-500">
              Itens premium são opcionais; servem apenas para personalização visual.
            </div>
          </div>
          <ThemePreviewModal open={previewOpen} previewFrameId={previewId} onClose={() => setPreviewOpen(false)} />
          {/* Conteúdo Premium: DLCs, Final Alternativo, Passe e Tip Jar */}
          <div id="premium-content" className="mt-10">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-gray-800">📦 Conteúdo Premium</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Opcional, narrativo e sem impacto em balanceamento. Gratuito permanece completo.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="p-4 rounded-lg border bg-white">
                <div className="font-semibold">Capítulo Bônus: Ecos do Destino</div>
                <div className="text-sm text-gray-600 mb-2">Adiciona um capítulo extra à sua jornada com cenas exclusivas.</div>
                <button
                  onClick={() => {
                    trackMetric.purchaseInitiated(selectedHero.id, 'dlc-ecos-destino');
                    markPurchase('dlc-ecos-destino', { id: `rcpt-${Date.now()}` });
                    if (selectedHero) {
                      const now = new Date().toISOString();
                      const chapters = selectedHero.journeyChapters || [];
                      const bonus = {
                        id: `dlc-bonus-${selectedHero.id}`,
                        index: (chapters.length || 0) + 1,
                        title: 'Capítulo Bônus: Ecos do Destino',
                        summary: 'Um eco misterioso revela caminhos ocultos e memórias antigas.',
                        createdAt: now,
                        levelMilestone: selectedHero.progression.level,
                        locked: false,
                        relatedQuests: selectedHero.completedQuests || []
                      } as any;
                      updateHero(selectedHero.id, { journeyChapters: [...chapters, bonus] });
                    }
                    trackMetric.purchaseCompleted(selectedHero.id, 'dlc-ecos-destino');
                  }}
                  className="mt-2 px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
                >Comprar DLC</button>
              </div>
              <div className="p-4 rounded-lg border bg-white">
                <div className="font-semibold">Final Alternativo: Caminho das Sombras</div>
                <div className="text-sm text-gray-600 mb-2">Desbloqueia um epílogo alternativo com escolhas dramáticas.</div>
                <button
                  onClick={() => { markPurchase('dlc-final-sombras', { id: `rcpt-${Date.now()}` }); }}
                  className="mt-2 px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
                >Comprar DLC</button>
              </div>
              <div className="p-4 rounded-lg border bg-white">
                <div className="font-semibold">Passe de Temporada</div>
                <div className="text-sm text-gray-600 mb-2">Conteúdo narrativo exclusivo por temporada.</div>
                <button
                  onClick={() => { trackMetric.purchaseInitiated(selectedHero.id, 'season-pass'); markPurchase('season-pass', { id: `rcpt-${Date.now()}` }); trackMetric.purchaseCompleted(selectedHero.id, 'season-pass'); }}
                  className="mt-2 px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                >Ativar Passe</button>
              </div>
              <div className="p-4 rounded-lg border bg-white">
                <div className="font-semibold">Apoio ao Criador (Tip Jar)</div>
                <div className="text-sm text-gray-600 mb-2">Recompensas simbólicas: emblemas e molduras de agradecimento.</div>
                <div className="flex gap-2">
                  {['bronze','silver','gold'].map(l => (
                    <button key={l}
                      onClick={() => { trackMetric.purchaseInitiated(selectedHero.id, `tip-${l}`); markPurchase(`tip-${l}`, { id: `rcpt-${Date.now()}` }); trackMetric.purchaseCompleted(selectedHero.id, `tip-${l}`); }}
                      className={`px-3 py-2 rounded ${l==='gold' ? 'bg-yellow-600' : l==='silver' ? 'bg-gray-400' : 'bg-orange-600'} text-white hover:opacity-90`}
                    >{l==='bronze' ? 'Bronze' : l==='silver' ? 'Prata' : 'Ouro'}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
