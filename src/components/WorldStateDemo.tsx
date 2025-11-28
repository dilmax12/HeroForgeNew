/**
 * Componente de Demonstração do Sistema de Estado de Mundo
 * Mostra como o novo sistema funciona
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useHeroStore } from '../store/heroStore';
import { worldStateManager } from '../utils/worldState';
import { enhancedMissionGenerator } from '../utils/enhancedMissions';
import { StaminaDisplay } from './StaminaDisplay';

export const WorldStateDemo: React.FC = () => {
  const { getSelectedHero, updateHero } = useHeroStore();
  const [demoResults, setDemoResults] = useState<any[]>([]);
  const selectedHero = getSelectedHero();

  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">🎭</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhum herói selecionado</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para ver a demonstração do sistema de estado de mundo.</p>
      </div>
    );
  }

  const runDemo = () => {
    const results: any[] = [];
    
    // Demonstrar geração de missão
    const mission = enhancedMissionGenerator.generateEnhancedMission(selectedHero);
    results.push({
      type: 'mission_generated',
      title: 'Missão Gerada',
      data: mission
    });

    // Demonstrar processamento de escolha
    if (mission.enhancedChoices && mission.enhancedChoices.length > 0) {
      const choice = mission.enhancedChoices[0];
      const result = enhancedMissionGenerator.processEnhancedChoice(selectedHero, mission, choice.id);
      
      results.push({
        type: 'choice_processed',
        title: 'Escolha Processada',
        data: result
      });

      // Atualizar herói
      updateHero(selectedHero.id, { 
        worldState: selectedHero.worldState,
        progression: selectedHero.progression 
      });
    }

    // Demonstrar story seeds
    const storySeeds = worldStateManager.generateStorySeeds(selectedHero);
    results.push({
      type: 'story_seeds',
      title: 'Story Seeds Gerados',
      data: storySeeds
    });

    setDemoResults(results);
  };

  const clearDemo = () => {
    setDemoResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Demonstração do Sistema de Estado de Mundo</h2>
        <p className="text-gray-300 mb-4">
          Este sistema implementa decisões com consequências, estado de mundo persistente e narrativa procedural.
        </p>
        
        <div className="flex space-x-4">
          <button
            onClick={runDemo}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Executar Demonstração
          </button>
          <button
            onClick={clearDemo}
            className="px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Limpar Resultados
          </button>
        </div>
      </div>

      {/* Estado Atual do Herói */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Estado Atual do Herói</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Display de Stamina */}
          <div className="md:col-span-1">
            <StaminaDisplay />
          </div>
          
          <div className="bg-gray-700 rounded p-4">
            <h4 className="font-semibold text-white mb-2">Informações Básicas</h4>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Nome: {selectedHero.name}</div>
              <div>Classe: {selectedHero.class}</div>
              <div>Nível: {selectedHero.progression.level}</div>
            </div>
          </div>
          
          <div className="bg-gray-700 rounded p-4">
            <h4 className="font-semibold text-white mb-2">Decisões Tomadas</h4>
            <div className="text-sm text-gray-300">
              {selectedHero.worldState?.decisionLog.length || 0} decisões registradas
            </div>
            {selectedHero.worldState?.decisionLog.slice(-3).map((decision, index) => (
              <div key={index} className="text-xs text-gray-400 mt-1">
                • {decision.choiceText} ({decision.rollResult?.success ? 'Sucesso' : 'Falha'})
              </div>
            ))}
          </div>
        </div>

        {/* Reputação com Facções */}
        {selectedHero.worldState?.factions && (
          <div className="mt-4">
            <h4 className="font-semibold text-white mb-2">Reputação com Facções</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(selectedHero.worldState.factions).map(([name, data]) => (
                <div key={name} className="bg-gray-700 rounded p-2">
                  <div className="text-sm text-white">{name}</div>
                  <div className={`text-xs ${
                    data.reputation > 0 ? 'text-green-400' : 
                    data.reputation < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {data.reputation > 0 ? '+' : ''}{data.reputation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resultados da Demonstração */}
      {demoResults.length > 0 && (
        <div className="space-y-4">
          {demoResults.map((result, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="bg-gray-800 rounded-lg p-6"
            >
              <h3 className="text-xl font-bold text-white mb-4">{result.title}</h3>
              
              {result.type === 'mission_generated' && (
                <div className="space-y-3">
                  <div className="bg-gray-700 rounded p-4">
                    <h4 className="font-semibold text-white">{result.data.title}</h4>
                    <p className="text-gray-300 text-sm mt-1">{result.data.description}</p>
                    <div className="text-xs text-gray-400 mt-2">
                      Localização: {result.data.location} • Nível: {result.data.levelRequirement}+ • 
                      Stamina: {result.data.staminaCost || 30}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-semibold text-white">Escolhas Disponíveis:</h5>
                    {result.data.enhancedChoices?.map((choice: any, choiceIndex: number) => (
                      <div key={choiceIndex} className="bg-gray-700 rounded p-3">
                        <div className="font-medium text-white">{choice.text}</div>
                        <div className="text-sm text-gray-300">{choice.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Dificuldade: {choice.riskThreshold}% • 
                          {choice.rollModifiers?.attribute && ` Usa ${choice.rollModifiers.attribute}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {result.type === 'choice_processed' && (
                <div className="space-y-3">
                  <div className={`p-4 rounded ${
                    result.data.success ? 'bg-green-900 border border-green-500' : 'bg-red-900 border border-red-500'
                  }`}>
                    <h4 className="font-semibold text-white">
                      {result.data.success ? '✅ Sucesso!' : '❌ Falha'}
                    </h4>
                    <p className="text-gray-300 text-sm mt-1 whitespace-pre-line">
                      {result.data.narrative}
                    </p>
                  </div>
                  
                  <div className="bg-gray-700 rounded p-4">
                    <h5 className="font-semibold text-white mb-2">Detalhes do Roll:</h5>
                    <div className="text-sm text-gray-300">
                      Roll: {result.data.results.rollResult.roll} + 
                      Modificadores: {result.data.results.rollResult.modifiers} = 
                      {result.data.results.rollResult.total} vs {result.data.results.rollResult.threshold}
                    </div>
                  </div>
                  
                  {result.data.results.appliedEffects.length > 0 && (
                    <div className="bg-gray-700 rounded p-4">
                      <h5 className="font-semibold text-white mb-2">Efeitos Aplicados:</h5>
                      {result.data.results.appliedEffects.map((effect: any, effectIndex: number) => (
                        <div key={effectIndex} className="text-sm text-gray-300">
                          • {effect.description || `${effect.type}: ${effect.value}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {result.type === 'story_seeds' && (
                <div className="bg-gray-700 rounded p-4">
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold text-white">Contexto:</span>
                      <span className="text-gray-300 ml-2">{result.data.context}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-white">Tom:</span>
                      <span className="text-gray-300 ml-2">{result.data.tone}</span>
                    </div>
                    {result.data.previousDecisions.length > 0 && (
                      <div>
                        <span className="font-semibold text-white">Decisões Recentes:</span>
                        <div className="ml-2 text-sm text-gray-300">
                          {result.data.previousDecisions.map((decision: string, decIndex: number) => (
                            <div key={decIndex}>• {decision}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <details className="mt-4">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  Ver dados brutos (JSON)
                </summary>
                <pre className="mt-2 p-4 bg-gray-900 rounded text-xs text-gray-300 overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            </motion.div>
          ))}
        </div>
      )}

      {/* Explicação do Sistema */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Como Funciona o Sistema</h3>
        
        <div className="space-y-4 text-gray-300">
          <div>
            <h4 className="font-semibold text-white">1. WorldState</h4>
            <p className="text-sm">
              Mantém o estado persistente do mundo, incluindo reputação com facções, 
              status de NPCs, eventos ativos e histórico de decisões.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white">2. Decision Log</h4>
            <p className="text-sm">
              Registra todas as escolhas do jogador com timestamp, impacto e resultados de rolls,
              criando uma narrativa persistente.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white">3. Enhanced Choices</h4>
            <p className="text-sm">
              Escolhas com modificadores de atributos, thresholds de risco e efeitos de 
              sucesso/falha que impactam o mundo.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white">4. Story Seeds</h4>
            <p className="text-sm">
              Contexto gerado baseado no estado atual do mundo e decisões passadas,
              usado para criar narrativas dinâmicas.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white">5. Stamina System</h4>
            <p className="text-sm">
              Sistema de "forced rest" onde missões consomem stamina que se recupera ao longo do tempo,
              criando um loop de engajamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
