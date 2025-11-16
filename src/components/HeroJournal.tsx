/**
 * Diário do Herói - Hero Journal
 * Exibe o histórico de decisões e narrativa do herói
 */

import React, { useState } from 'react';
import { getAltharionLore } from '../utils/story';
import { motion, AnimatePresence } from 'framer-motion';
import { Hero, DecisionLogEntry } from '../types/hero';
import { getReputationLevel, getReputationDescription } from '../utils/reputationSystem';

interface HeroJournalProps {
  hero: Hero;
}

export const HeroJournal: React.FC<HeroJournalProps> = ({ hero }) => {
  const [selectedEntry, setSelectedEntry] = useState<DecisionLogEntry | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'success' | 'failure'>('all');

  const decisionLog = hero.worldState?.decisionLog || [];
  
  const filteredEntries = decisionLog.filter(entry => {
    if (filterType === 'all') return true;
    return entry.rollResult?.success === (filterType === 'success');
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImpactSummary = (entry: DecisionLogEntry) => {
    const impacts: string[] = [];
    
    if (entry.impact.immediate.gold) {
      impacts.push(`${entry.impact.immediate.gold > 0 ? '+' : ''}${entry.impact.immediate.gold} ouro`);
    }
    
    if (entry.impact.immediate.xp) {
      impacts.push(`+${entry.impact.immediate.xp} XP`);
    }
    
    if (entry.impact.immediate.reputation) {
      Object.entries(entry.impact.immediate.reputation).forEach(([faction, value]) => {
        impacts.push(`${faction}: ${value > 0 ? '+' : ''}${value}`);
      });
    }
    
    if (entry.impact.immediate.items) {
      impacts.push(`${entry.impact.immediate.items.length} item(s)`);
    }
    
    return impacts.join(', ') || 'Sem impactos imediatos';
  };

  const getReputationSummary = () => {
    if (!hero.worldState?.factions) return [];

    return Object.entries(hero.worldState.factions)
      .filter(([_, data]) => Math.abs(data.reputation) > 5)
      .sort(([_, a], [__, b]) => b.reputation - a.reputation)
      .map(([name, data]) => {
        const level = getReputationLevel(data.reputation);
        const displayName = name.charAt(0).toUpperCase() + name.slice(1);
        return {
          name: displayName,
          reputation: data.reputation,
          status: level.name,
          description: getReputationDescription(data.reputation),
          color: level.color
        };
      });
  };

  const reputationSummary = getReputationSummary();
  const worldTopics = getAltharionLore('topics');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Diário de {hero.name}</h2>
        
        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Decisões Tomadas</div>
            <div className="text-2xl font-bold text-white">{decisionLog.length}</div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Taxa de Sucesso</div>
            <div className="text-2xl font-bold text-green-400">
              {decisionLog.length > 0 
                ? Math.round((decisionLog.filter(e => e.rollResult?.success).length / decisionLog.length) * 100)
                : 0}%
            </div>
          </div>
          <div className="bg-gray-700 rounded p-3">
            <div className="text-gray-400 text-sm">Stamina Atual</div>
            <div className="text-2xl font-bold text-blue-400">
              {hero.stamina?.current || 100}/{hero.stamina?.max || 100}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex space-x-2">
          {(['all', 'success', 'failure'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`px-4 py-2 rounded transition-colors ${
                filterType === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filter === 'all' ? 'Todas' : filter === 'success' ? 'Sucessos' : 'Falhas'}
            </button>
          ))}
        </div>
      </div>

      {/* Reputação com Facções */}
      {reputationSummary.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Reputação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reputationSummary.map(({ name, reputation, status, description, color }) => (
              <div key={name} className="flex justify-between items-center bg-gray-700 rounded p-3">
                <div>
                  <div className="text-white font-semibold">{name}</div>
                  <div className={`text-sm ${color}`} title={description}>
                    {status}
                  </div>
                </div>
                <div className={`text-lg font-bold ${
                  reputation > 0 ? 'text-green-400' : reputation < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {reputation > 0 ? '+' : ''}{reputation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* História do Mundo */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white">História do Mundo</h3>
          <span className="text-xs text-gray-400">Wiki</span>
        </div>
        <div className="space-y-4">
          {worldTopics.sections.map((sec: any) => (
            <div key={sec.id} className="rounded border border-white/10 bg-white/5 p-4">
              <div className="text-white font-semibold mb-2">{sec.title}</div>
              <ul className="list-disc ml-5 text-sm text-gray-200 space-y-1">
                {sec.bullets.map((b: string, i: number) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-400">Base: Forjador de Heróis — Altharion</div>
      </div>

      {/* Timeline de Decisões */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4">Histórico de Decisões</h3>
        
        {filteredEntries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-lg">Nenhuma decisão registrada ainda</div>
            <div className="text-gray-500 text-sm mt-2">
              Complete missões e eventos para começar a construir sua história
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border-l-4 pl-4 py-3 cursor-pointer transition-all ${
                  entry.rollResult?.success 
                    ? 'border-green-500 bg-green-900/20 hover:bg-green-900/30' 
                    : 'border-red-500 bg-red-900/20 hover:bg-red-900/30'
                }`}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${entry.rollResult?.success ? '✅' : '❌'}`}>
                        {entry.rollResult?.success ? '✅' : '❌'}
                      </span>
                      <span className="text-white font-semibold">{entry.choiceText}</span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      {formatDate(entry.timestamp)}
                    </div>
                    <div className="text-gray-300 text-sm mt-1">
                      {getImpactSummary(entry)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      Roll: {entry.rollResult?.roll} + {entry.rollResult?.modifiers} = {entry.rollResult?.roll + entry.rollResult?.modifiers}
                    </div>
                    <div className="text-sm text-gray-500">
                      vs {entry.rollResult?.threshold}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Decisão */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">Detalhes da Decisão</h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="text-gray-400 text-sm">Escolha</div>
                  <div className="text-white font-semibold">{selectedEntry.choiceText}</div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-sm">Data</div>
                  <div className="text-white">{formatDate(selectedEntry.timestamp)}</div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-sm">Resultado do Roll</div>
                  <div className={`text-lg font-bold ${selectedEntry.rollResult?.success ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedEntry.rollResult?.success ? 'Sucesso' : 'Falha'}
                  </div>
                  <div className="text-gray-300 text-sm">
                    Roll: {selectedEntry.rollResult?.roll} + Modificadores: {selectedEntry.rollResult?.modifiers} = {selectedEntry.rollResult?.roll + selectedEntry.rollResult?.modifiers} vs {selectedEntry.rollResult?.threshold}
                  </div>
                </div>
                
                {/* Impactos Imediatos */}
                {Object.keys(selectedEntry.impact.immediate).length > 0 && (
                  <div>
                    <div className="text-gray-400 text-sm mb-2">Impactos Imediatos</div>
                    <div className="bg-gray-700 rounded p-3 space-y-1">
                      {selectedEntry.impact.immediate.gold && (
                        <div className="text-yellow-400">
                          Ouro: {selectedEntry.impact.immediate.gold > 0 ? '+' : ''}{selectedEntry.impact.immediate.gold}
                        </div>
                      )}
                      {selectedEntry.impact.immediate.xp && (
                        <div className="text-blue-400">
                          XP: +{selectedEntry.impact.immediate.xp}
                        </div>
                      )}
                      {selectedEntry.impact.immediate.reputation && Object.entries(selectedEntry.impact.immediate.reputation).map(([faction, value]) => (
                        <div key={faction} className="text-purple-400">
                          {faction}: {value > 0 ? '+' : ''}{value}
                        </div>
                      ))}
                      {selectedEntry.impact.immediate.items && (
                        <div className="text-green-400">
                          Itens: {selectedEntry.impact.immediate.items.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Impactos de Longo Prazo */}
                {Object.keys(selectedEntry.impact.longTerm).length > 0 && (
                  <div>
                    <div className="text-gray-400 text-sm mb-2">Impactos de Longo Prazo</div>
                    <div className="bg-gray-700 rounded p-3 space-y-1">
                      {selectedEntry.impact.longTerm.npcRelations && Object.entries(selectedEntry.impact.longTerm.npcRelations).map(([npc, value]) => (
                        <div key={npc} className="text-cyan-400">
                          {npc}: {value > 0 ? '+' : ''}{value} relação
                        </div>
                      ))}
                      {selectedEntry.impact.longTerm.worldEvents && (
                        <div className="text-orange-400">
                          Eventos: {selectedEntry.impact.longTerm.worldEvents.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
