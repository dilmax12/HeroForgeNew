import React, { useState } from 'react';
import { Hero, Guild, Quest } from '../types/hero';
import { useHeroStore } from '../store/heroStore';

interface GuildSystemProps {
  hero: Hero;
}

const GuildSystem: React.FC<GuildSystemProps> = ({ hero }) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'my-guild' | 'create'>('browse');
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildDescription, setNewGuildDescription] = useState('');
  
  const { 
    guilds, 
    availableQuests,
    createGuild, 
    joinGuild, 
    leaveGuild,
    acceptQuest,
    completeQuest,
    refreshQuests,
    depositGoldToGuild,
    withdrawGoldFromGuild,
    contributeXPToGuild,
    ensureDefaultGuildExists
  } = useHeroStore();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [contributeXPAmount, setContributeXPAmount] = useState('');

  const currentGuild = hero.progression.guildId ? 
    guilds.find(g => g.id === hero.progression.guildId) : null;

  const handleCreateGuild = () => {
    if (newGuildName.trim() && newGuildDescription.trim()) {
      createGuild(hero.id, newGuildName.trim(), newGuildDescription.trim());
      setNewGuildName('');
      setNewGuildDescription('');
      setActiveTab('my-guild');
    }
  };

  const handleJoinGuild = (guildId: string) => {
    joinGuild(hero.id, guildId);
    setActiveTab('my-guild');
  };

  const handleLeaveGuild = () => {
    if (currentGuild) {
      leaveGuild(hero.id, currentGuild.id);
      setActiveTab('browse');
    }
  };

  const handleQuickJoinDefaultGuild = () => {
    ensureDefaultGuildExists();
    const defaultGuild = guilds.find(g => g.name === 'Foja dos Herois');
    if (defaultGuild) {
      joinGuild(hero.id, defaultGuild.id);
      setActiveTab('my-guild');
    }
  };

  const handleAcceptGuildQuest = (questId: string) => {
    console.log('🎯 Tentando aceitar missão de guilda:', {
      questId,
      heroId: hero.id,
      heroLevel: hero.progression.level,
      activeQuests: hero.activeQuests.length,
      maxActiveQuests: 3
    });
    
    const quest = availableQuests.find(q => q.id === questId);
    console.log('📋 Missão encontrada:', quest);
    
    const result = acceptQuest(hero.id, questId);
    console.log('✅ Resultado da aceitação:', result);
    
    if (result) {
      console.log('🎉 Missão aceita com sucesso!');
    } else {
      console.log('❌ Falha ao aceitar missão');
    }
  };

  const handleCompleteGuildQuest = (questId: string) => {
    console.log('🏁 Tentando completar missão de guilda:', {
      questId,
      heroId: hero.id,
      heroLevel: hero.progression.level,
      activeQuests: hero.activeQuests
    });
    
    const quest = availableQuests.find(q => q.id === questId);
    console.log('📋 Missão encontrada:', quest);
    
    const result = completeQuest(hero.id, questId, true); // autoResolve=true para missões de guilda
    console.log('✅ Resultado da conclusão:', result);
    
    if (result !== null) {
      // Mostrar narrativa do combate
      if (result.log && result.log.length > 0) {
        console.log('📖 Narrativa do Combate:');
        result.log.forEach((line, index) => {
          setTimeout(() => console.log(`   ${line}`), index * 500);
        });
      }
      
      if (result.victory) {
        console.log('🎉 VITÓRIA! Missão completada com sucesso!');
        alert(`🎉 VITÓRIA!\n\n${result.log?.join('\n') || 'Missão completada com sucesso!'}`);
      } else {
        console.log('💔 DERROTA! A missão falhou...');
        alert(`💔 DERROTA!\n\n${result.log?.join('\n') || 'A missão falhou. Tente novamente quando estiver mais forte!'}`);
      }
    } else {
      console.log('❌ Falha ao completar missão');
      alert('❌ Erro ao processar a missão. Tente novamente.');
    }
  };

  const getQuestDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'fácil': return 'text-green-600 bg-green-100';
      case 'média': return 'text-yellow-600 bg-yellow-100';
      case 'difícil': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getQuestTypeIcon = (type: string) => {
    switch (type) {
      case 'Contrato': return '📋';
      case 'Caça': return '⚔️';
      case 'Exploração': return '🗺️';
      case 'História': return '📖';
      default: return '❓';
    }
  };

  const tabs = [
    { id: 'browse', label: 'Explorar Guildas', icon: '🔍' },
    { id: 'my-guild', label: currentGuild ? 'Minha Guilda' : 'Sem Guilda', icon: '🏰' },
    { id: 'create', label: 'Criar Guilda', icon: '➕' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">🏰 Sistema de Guildas</h1>
        <p className="text-lg opacity-90">
          {currentGuild ? `Membro da ${currentGuild.name}` : 'Aventureiro Independente'}
        </p>
      </div>

      {/* Navegação */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
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
      {activeTab === 'browse' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Guildas Disponíveis</h2>
          
          {guilds.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guilds.map(guild => (
                <div key={guild.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{guild.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{guild.description}</p>
                    </div>
                    <div className="text-2xl">🏰</div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Membros:</span>
                      <span className="font-medium">{guild.members.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">XP da Guilda:</span>
                      <span className="font-medium">{guild.guildXP}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tesouro:</span>
                      <span className="font-medium">{guild.bankGold} 🪙</span>
                    </div>
                  </div>

                  {hero.progression.guildId === guild.id ? (
                    <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-center text-sm font-medium">
                      ✓ Membro desta guilda
                    </div>
                  ) : hero.progression.guildId ? (
                    <div className="bg-gray-100 text-gray-600 px-3 py-2 rounded text-center text-sm">
                      Já é membro de outra guilda
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoinGuild(guild.id)}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors"
                    >
                      Entrar na Guilda
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🏰</div>
              <h3 className="text-xl font-medium mb-2">Nenhuma guilda encontrada</h3>
              <p>Seja o primeiro a criar uma guilda!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'my-guild' && (
        <div className="space-y-6">
          {currentGuild ? (
            <>
              {/* Informações da Guilda */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{currentGuild.name}</h2>
                    <p className="text-gray-600 mt-1">{currentGuild.description}</p>
                  </div>
                  <button
                    onClick={handleLeaveGuild}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    Sair da Guilda
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{currentGuild.members.length}</div>
                    <div className="text-sm text-gray-600">Membros</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{currentGuild.guildXP}</div>
                    <div className="text-sm text-gray-600">XP da Guilda</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{currentGuild.level ?? Math.max(1, Math.floor(currentGuild.guildXP / 250) + 1)}</div>
                    <div className="text-sm text-gray-600">Nível da Guilda</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{currentGuild.bankGold}</div>
                    <div className="text-sm text-gray-600">Tesouro</div>
                  </div>
                </div>

                {/* Operações de Tesouro/Contribuição */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="text-sm font-medium text-gray-800 mb-2">Depositar Ouro</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Quantidade"
                      />
                      <button
                        onClick={() => {
                          const amt = parseInt(depositAmount, 10);
                          if (!isNaN(amt) && amt > 0) {
                            const ok = depositGoldToGuild(hero.id, amt);
                            if (ok) setDepositAmount('');
                          }
                        }}
                        className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                      >
                        Depositar
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Seu ouro: {hero.progression.gold}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="text-sm font-medium text-gray-800 mb-2">Sacar Ouro</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Quantidade"
                      />
                      <button
                        onClick={() => {
                          const amt = parseInt(withdrawAmount, 10);
                          if (!isNaN(amt) && amt > 0) {
                            const ok = withdrawGoldFromGuild(hero.id, amt);
                            if (ok) setWithdrawAmount('');
                          }
                        }}
                        className="px-3 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                      >
                        Sacar
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Tesouro da guilda: {currentGuild.bankGold}</div>
                    <div className="text-xs text-gray-500">Necessita papel: líder/oficial</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="text-sm font-medium text-gray-800 mb-2">Contribuir XP</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={contributeXPAmount}
                        onChange={e => setContributeXPAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Quantidade"
                      />
                      <button
                        onClick={() => {
                          const amt = parseInt(contributeXPAmount, 10);
                          if (!isNaN(amt) && amt > 0) {
                            const ok = contributeXPToGuild(hero.id, amt);
                            if (ok) {
                              refreshQuests(hero.progression.level);
                              setContributeXPAmount('');
                            }
                          }
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Contribuir
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Aumenta o nível da guilda</div>
                  </div>
                </div>
              </div>

              {/* Membros da Guilda */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800">👥 Membros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentGuild.members.map(memberId => {
                    // Em uma implementação real, você buscaria os dados do herói pelo ID
                    const isCurrentHero = memberId === hero.id;
                    return (
                      <div key={memberId} className={`p-3 rounded-lg border ${isCurrentHero ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{isCurrentHero ? hero.avatar : '👤'}</div>
                          <div>
                            <div className="font-medium">{isCurrentHero ? hero.name : `Membro ${memberId.slice(-4)}`}</div>
                            <div className="text-sm text-gray-600">
                              {isCurrentHero ? `${hero.class} • Nível ${hero.progression.level}` : 'Aventureiro'}
                            </div>
                          </div>
                          {isCurrentHero && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Você</span>}
                          {currentGuild.roles && currentGuild.roles[memberId] && (
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                              {currentGuild.roles[memberId] === 'lider' ? 'Líder' : currentGuild.roles[memberId] === 'oficial' ? 'Oficial' : 'Membro'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quadro de Missões da Guilda */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">📋 Quadro de Missões da Guilda</h3>
                  <button
                    onClick={() => refreshQuests(hero.progression.level)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
                  >
                    🔄 Atualizar Missões
                  </button>
                </div>
                
                {availableQuests.filter(quest => quest.isGuildQuest).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableQuests.filter(quest => quest.isGuildQuest).slice(0, 6).map(quest => {
                      const isAccepted = hero.activeQuests.includes(quest.id);
                      const canAccept = hero.progression.level >= quest.levelRequirement && !isAccepted;
                      
                      return (
                        <div key={quest.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-xl">{getQuestTypeIcon(quest.type)}</span>
                              <div>
                                <h4 className="font-semibold text-gray-800">{quest.title}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${getQuestDifficultyColor(quest.difficulty)}`}>
                                  {quest.difficulty}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{quest.description}</p>
                          
                          <div className="flex justify-between items-center text-sm mb-3">
                            <span className="text-gray-600">Nível mín: {quest.levelRequirement}</span>
                            <div className="flex space-x-3">
                              <span className="text-yellow-600">🪙 {quest.rewards?.gold || 0}</span>
                              <span className="text-blue-600">⭐ {quest.rewards?.xp || 0}</span>
                            </div>
                          </div>
                          
                          {isAccepted ? (
                            <button
                              onClick={() => handleCompleteGuildQuest(quest.id)}
                              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                            >
                              Completar Missão
                            </button>
                          ) : canAccept ? (
                            <button
                              onClick={() => handleAcceptGuildQuest(quest.id)}
                              className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 transition-colors"
                            >
                              Aceitar Missão
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded cursor-not-allowed"
                            >
                              {hero.progression.level < quest.levelRequirement ? 'Nível insuficiente' : 'Já aceita'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📋</div>
                    <div>Nenhuma missão disponível no momento</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🏰</div>
              <h3 className="text-xl font-medium mb-2">Você não está em nenhuma guilda</h3>
              <p className="mb-6">Explore guildas existentes ou crie a sua própria!</p>
              <div className="space-x-4">
                <button
                  onClick={() => setActiveTab('browse')}
                  className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition-colors"
                >
                  Explorar Guildas
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors"
                >
                  Criar Guilda
                </button>
                <button
                  onClick={handleQuickJoinDefaultGuild}
                  className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 transition-colors"
                >
                  Entrar na Foja dos Herois
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">➕ Criar Nova Guilda</h2>
            
            {hero.progression.guildId ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">⚠️</div>
                <h3 className="text-lg font-medium mb-2">Você já está em uma guilda</h3>
                <p>Saia da sua guilda atual para criar uma nova.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Guilda
                  </label>
                  <input
                    type="text"
                    value={newGuildName}
                    onChange={(e) => setNewGuildName(e.target.value)}
                    placeholder="Digite o nome da sua guilda..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={newGuildDescription}
                    onChange={(e) => setNewGuildDescription(e.target.value)}
                    placeholder="Descreva o propósito e valores da sua guilda..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    maxLength={200}
                  />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Dicas para criar uma guilda</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Escolha um nome único e memorável</li>
                    <li>• Descreva claramente o foco da guilda (PvE, social, etc.)</li>
                    <li>• Defina expectativas para os membros</li>
                    <li>• Seja acolhedor para atrair novos aventureiros</li>
                  </ul>
                </div>
                
                <button
                  onClick={handleCreateGuild}
                  disabled={!newGuildName.trim() || !newGuildDescription.trim()}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Criar Guilda
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuildSystem;
