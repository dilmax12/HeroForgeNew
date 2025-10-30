import React, { useState } from 'react';
import { Hero } from '../types/hero';
import { useHeroStore } from '../store/heroStore';
import { SHOP_ITEMS } from '../utils/shop';
import AchievementsList from './AchievementsList';
import ReputationPanel from './ReputationPanel';

interface HeroProgressionProps {
  hero: Hero;
}

const HeroProgression: React.FC<HeroProgressionProps> = ({ hero }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'achievements' | 'reputation'>('overview');
  const { useItem, equipItem, sellItem } = useHeroStore();

  // Calcular XP necessário para o próximo nível
  const calculateXPForLevel = (level: number): number => {
    return level * 100 + (level - 1) * 50;
  };

  const currentLevelXP = calculateXPForLevel(hero.progression.level);
  const nextLevelXP = calculateXPForLevel(hero.progression.level + 1);
  const xpProgress = hero.progression.xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const xpPercentage = Math.max(0, Math.min(100, (xpProgress / xpNeeded) * 100));

  // Obter informações dos itens equipados
  const getEquippedItem = (itemId: string | undefined) => {
    if (!itemId) return null;
    return SHOP_ITEMS.find(item => item.id === itemId);
  };

  const equippedWeapon = getEquippedItem(hero.inventory.equippedWeapon);
  const equippedArmor = getEquippedItem(hero.inventory.equippedArmor);
  const equippedAccessory = getEquippedItem(hero.inventory.equippedAccessory);

  // Calcular bônus totais dos equipamentos
  const getTotalBonuses = () => {
    let bonuses = { attack: 0, defense: 0, hp: 0, mp: 0 };
    
    [equippedWeapon, equippedArmor, equippedAccessory].forEach(item => {
      if (item?.effects) {
        bonuses.attack += item.effects.attack || 0;
        bonuses.defense += item.effects.defense || 0;
        bonuses.hp += item.effects.hp || 0;
        bonuses.mp += item.effects.mp || 0;
      }
    });
    
    return bonuses;
  };

  const totalBonuses = getTotalBonuses();

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: '📊' },
    { id: 'equipment', label: 'Equipamentos', icon: '⚔️' },
    { id: 'achievements', label: 'Conquistas', icon: '🏆' },
    { id: 'reputation', label: 'Reputação', icon: '⭐' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header do Herói */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="text-6xl">{hero.avatar}</div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{hero.name}</h1>
            <p className="text-lg opacity-90">{hero.class} • Nível {hero.progression.level}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="flex items-center space-x-1">
                <span>🪙</span>
                <span>{hero.progression.gold}</span>
              </span>
              <span className="flex items-center space-x-1">
                <span>⭐</span>
                <span>{hero.progression.reputation}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progressão de XP */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">📈 Progressão</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Experiência</span>
                  <span>{hero.progression.xp} XP</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {xpProgress}/{xpNeeded} XP para o nível {hero.progression.level + 1}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{hero.stats.questsCompleted}</div>
                  <div className="text-sm text-gray-600">Missões Completas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{hero.stats.totalCombats}</div>
                  <div className="text-sm text-gray-600">Combates</div>
                </div>
              </div>
            </div>
          </div>

          {/* Atributos e Bônus */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">💪 Atributos</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Força</span>
                  <span className="font-medium">{hero.attributes.forca}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Destreza</span>
                  <span className="font-medium">{hero.attributes.destreza}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Constituição</span>
                  <span className="font-medium">{hero.attributes.constituicao}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inteligência</span>
                  <span className="font-medium">{hero.attributes.inteligencia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sabedoria</span>
                  <span className="font-medium">{hero.attributes.sabedoria}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Carisma</span>
                  <span className="font-medium">{hero.attributes.carisma}</span>
                </div>
              </div>
            </div>

            {/* Atributos Derivados */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold mb-3 text-gray-700">Atributos Derivados</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">HP</span>
                  <span className="font-medium">
                    {hero.derivedAttributes.currentHp}/{hero.derivedAttributes.hp}
                    {totalBonuses.hp > 0 && <span className="text-green-600"> (+{totalBonuses.hp})</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">MP</span>
                  <span className="font-medium">
                    {hero.derivedAttributes.currentMp}/{hero.derivedAttributes.mp}
                    {totalBonuses.mp > 0 && <span className="text-blue-600"> (+{totalBonuses.mp})</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ataque</span>
                  <span className="font-medium">
                    {hero.attributes.forca}
                    {totalBonuses.attack > 0 && <span className="text-red-600"> (+{totalBonuses.attack})</span>}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Defesa</span>
                  <span className="font-medium">
                    {hero.derivedAttributes.armorClass}
                    {totalBonuses.defense > 0 && <span className="text-blue-600"> (+{totalBonuses.defense})</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventário Rápido */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
            <h3 className="text-xl font-bold mb-4 text-gray-800">🎒 Inventário</h3>
            
            {Object.keys(hero.inventory.items).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(hero.inventory.items).map(([itemId, quantity]) => {
                  const item = SHOP_ITEMS.find(i => i.id === itemId);
                  if (!item || quantity <= 0) return null;
                  
                  return (
                    <div key={itemId} className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl mb-1">{item.icon}</div>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">x{quantity}</div>
                      {item.type === 'consumable' && (
                        <button
                          onClick={() => useItem(hero.id, itemId)}
                          className="mt-2 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                        >
                          Usar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📦</div>
                <div>Inventário vazio</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Slots de Equipamento */}
          <div className="lg:col-span-2 space-y-6">
            {/* Arma */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800">⚔️ Arma</h3>
              {equippedWeapon ? (
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{equippedWeapon.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{equippedWeapon.name}</div>
                    <div className="text-sm text-gray-600">{equippedWeapon.description}</div>
                    {equippedWeapon.effects && (
                      <div className="text-sm text-green-600 mt-1">
                        {equippedWeapon.effects.attack && `+${equippedWeapon.effects.attack} Ataque`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => sellItem(hero.id, equippedWeapon.id)}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    Vender
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">⚔️</div>
                  <div>Nenhuma arma equipada</div>
                </div>
              )}
            </div>

            {/* Armadura */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800">🛡️ Armadura</h3>
              {equippedArmor ? (
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{equippedArmor.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{equippedArmor.name}</div>
                    <div className="text-sm text-gray-600">{equippedArmor.description}</div>
                    {equippedArmor.effects && (
                      <div className="text-sm text-blue-600 mt-1">
                        {equippedArmor.effects.defense && `+${equippedArmor.effects.defense} Defesa`}
                        {equippedArmor.effects.hp && ` +${equippedArmor.effects.hp} HP`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => sellItem(hero.id, equippedArmor.id)}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    Vender
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🛡️</div>
                  <div>Nenhuma armadura equipada</div>
                </div>
              )}
            </div>

            {/* Acessório */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold mb-4 text-gray-800">💍 Acessório</h3>
              {equippedAccessory ? (
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{equippedAccessory.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium">{equippedAccessory.name}</div>
                    <div className="text-sm text-gray-600">{equippedAccessory.description}</div>
                    {equippedAccessory.effects && (
                      <div className="text-sm text-purple-600 mt-1">
                        {equippedAccessory.effects.mp && `+${equippedAccessory.effects.mp} MP`}
                        {equippedAccessory.effects.hp && ` +${equippedAccessory.effects.hp} HP`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => sellItem(hero.id, equippedAccessory.id)}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                  >
                    Vender
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">💍</div>
                  <div>Nenhum acessório equipado</div>
                </div>
              )}
            </div>
          </div>

          {/* Resumo de Bônus */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold mb-4 text-gray-800">📊 Bônus Totais</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ataque</span>
                <span className={`font-medium ${totalBonuses.attack > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  +{totalBonuses.attack}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Defesa</span>
                <span className={`font-medium ${totalBonuses.defense > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  +{totalBonuses.defense}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">HP</span>
                <span className={`font-medium ${totalBonuses.hp > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  +{totalBonuses.hp}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">MP</span>
                <span className={`font-medium ${totalBonuses.mp > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                  +{totalBonuses.mp}
                </span>
              </div>
            </div>

            {/* Itens Equipáveis no Inventário */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold mb-3 text-gray-700">Equipar</h4>
              <div className="space-y-2">
                {Object.entries(hero.inventory.items).map(([itemId, quantity]) => {
                  const item = SHOP_ITEMS.find(i => i.id === itemId);
                  if (!item || quantity <= 0 || item.type === 'consumable' || item.type === 'cosmetic') return null;
                  
                  const isEquipped = 
                    hero.inventory.equippedWeapon === itemId ||
                    hero.inventory.equippedArmor === itemId ||
                    hero.inventory.equippedAccessory === itemId;
                  
                  if (isEquipped) return null;
                  
                  return (
                    <button
                      key={itemId}
                      onClick={() => equipItem(hero.id, itemId)}
                      className="w-full flex items-center space-x-2 p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <span>{item.icon}</span>
                      <span className="text-sm">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <AchievementsList hero={hero} />
      )}

      {activeTab === 'reputation' && (
        <ReputationPanel hero={hero} />
      )}
    </div>
  );
};

export default HeroProgression;