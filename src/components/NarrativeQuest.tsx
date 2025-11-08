import React, { useState } from 'react';
import { Quest, Hero, QuestChoice } from '../types/hero';
import { useHeroStore } from '../store/heroStore';
import { processQuestChoice } from '../utils/narrativeMissions';
import { generateOutcomeNarrative } from '../services/narratorAI';

interface NarrativeQuestProps {
  quest: Quest;
  onComplete: (questId: string, outcome: any) => void;
  onClose: () => void;
}

const NarrativeQuest: React.FC<NarrativeQuestProps> = ({ quest, onComplete, onClose }) => {
  const { getSelectedHero, gainXP, gainGold, addItemToInventory, updateReputation } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [outcome, setOutcome] = useState<any>(null);
  const [dmLine, setDmLine] = useState<string>('');
  const [dmLoading, setDmLoading] = useState<boolean>(false);

  if (!selectedHero) {
    return null;
  }

  const handleChoiceSelect = (choiceId: string) => {
    setSelectedChoice(choiceId);
  };

  const handleConfirmChoice = () => {
    if (!selectedChoice || !quest.choices) return;

    const result = processQuestChoice(
      quest,
      selectedChoice,
      selectedHero.progression.level,
      selectedHero.class,
      selectedHero.progression.reputation
    );

    setOutcome(result);
    setShowOutcome(true);

    // Gerar narrativa emocional do resultado
    setDmLoading(true);
    const rewardSummaryParts: string[] = [];
    if (result.rewards?.xp) rewardSummaryParts.push(`+${result.rewards.xp} XP`);
    if (typeof result.rewards?.gold === 'number') rewardSummaryParts.push(`${result.rewards.gold > 0 ? '+' : ''}${result.rewards.gold} ouro`);
    if (Array.isArray(result.rewards?.items) && result.rewards.items.length > 0) rewardSummaryParts.push(`itens: ${result.rewards.items.join(', ')}`);
    const rewardSummary = rewardSummaryParts.join(', ');
    const consequence = typeof result.reputationChange === 'number' && result.reputationChange !== 0
      ? `${result.reputationChange > 0 ? '+' : ''}${result.reputationChange} reputação`
      : '';
    generateOutcomeNarrative({
      heroName: selectedHero.name,
      questTitle: quest.title,
      success: !!result.success,
      consequence,
      rewardSummary,
    })
      .then(text => setDmLine(text))
      .catch(() => setDmLine('O destino registra este momento: vitória ou lição, ambas forjam a alma.'))
      .finally(() => setDmLoading(false));

    // Aplicar recompensas e mudanças
    if (result.success) {
      // XP
      if (typeof result.rewards.xp === 'number' && result.rewards.xp !== 0) {
        gainXP(selectedHero.id, result.rewards.xp);
      }
      // Ouro (permite valores negativos para escolhas como negociação)
      if (typeof result.rewards.gold === 'number' && result.rewards.gold !== 0) {
        gainGold(selectedHero.id, result.rewards.gold);
      }
      // Itens (lista de IDs)
      if (Array.isArray(result.rewards.items) && result.rewards.items.length > 0) {
        result.rewards.items.forEach((itemId: string) => {
          addItemToInventory(selectedHero.id, itemId, 1);
        });
      }
      
      // Mudanças de reputação (por facção)
      if (result.reputationChanges) {
        Object.entries(result.reputationChanges).forEach(([faction, change]) => {
          if (typeof change === 'number' && change !== 0) {
            updateReputation(faction, change);
          }
        });
      }
      
      onComplete(quest.id, result);
    }
  };

  const getChoiceRequirementText = (choice: QuestChoice) => {
    if (!choice.requirements) return null;

    const req = choice.requirements;
    const requirements = [];

    if (req.level) {
      requirements.push(`Nível ${req.level}`);
    }
    if (req.class) {
      requirements.push(`Classe: ${req.class}`);
    }
    if (req.reputation) {
      requirements.push(`Reputação: ${req.reputation}`);
    }

    return requirements.length > 0 ? `Requisitos: ${requirements.join(', ')}` : null;
  };

  const canSelectChoice = (choice: QuestChoice) => {
    if (!choice.requirements) return true;

    const req = choice.requirements;
    
    if (req.level && selectedHero.progression.level < req.level) return false;
    if (req.class && selectedHero.class !== req.class) return false;
    if (req.reputation && selectedHero.progression.reputation < req.reputation) return false;

    return true;
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 20) return 'text-green-400';
    if (risk <= 50) return 'text-yellow-400';
    if (risk <= 80) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRiskText = (risk: number) => {
    if (risk <= 20) return 'Baixo Risco';
    if (risk <= 50) return 'Risco Moderado';
    if (risk <= 80) return 'Alto Risco';
    return 'Risco Extremo';
  };

  if (showOutcome && outcome) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4 border border-gray-700">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-amber-400 mb-4">
              {outcome.success ? '✅ Sucesso!' : '❌ Falha'}
            </h2>
            {/* Narrativa do Mestre do Jogo para o resultado */}
            {dmLine && (
              <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🎙️</span>
                  <span className="font-semibold">Mestre do Jogo</span>
                  {dmLoading && <span className="text-xs text-gray-300">gerando...</span>}
                </div>
                <p className="text-sm text-gray-200 leading-relaxed">{dmLine}</p>
              </div>
            )}
            
            <div className="bg-gray-700 rounded-lg p-6 mb-6">
              <p className="text-gray-300 text-lg leading-relaxed">
                {outcome.outcome}
              </p>
            </div>

            {/* Recompensas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {outcome.rewards.xp > 0 && (
                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
                  <div className="text-blue-400 font-bold text-lg">+{outcome.rewards.xp} XP</div>
                  <div className="text-gray-400 text-sm">Experiência</div>
                </div>
              )}
              
              {outcome.rewards.gold !== 0 && (
                <div className={`rounded-lg p-4 border ${
                  outcome.rewards.gold > 0 
                    ? 'bg-yellow-900/30 border-yellow-700' 
                    : 'bg-red-900/30 border-red-700'
                }`}>
                  <div className={`font-bold text-lg ${
                    outcome.rewards.gold > 0 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {outcome.rewards.gold > 0 ? '+' : ''}{outcome.rewards.gold} Ouro
                  </div>
                  <div className="text-gray-400 text-sm">Moedas</div>
                </div>
              )}
              
              {outcome.reputationChange !== 0 && (
                <div className={`rounded-lg p-4 border ${
                  outcome.reputationChange > 0 
                    ? 'bg-green-900/30 border-green-700' 
                    : 'bg-red-900/30 border-red-700'
                }`}>
                  <div className={`font-bold text-lg ${
                    outcome.reputationChange > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {outcome.reputationChange > 0 ? '+' : ''}{outcome.reputationChange} Rep
                  </div>
                  <div className="text-gray-400 text-sm">Reputação</div>
                </div>
              )}
            </div>

            {outcome.rewards.items && outcome.rewards.items.length > 0 && (
              <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700 mb-6">
                <h4 className="text-purple-400 font-bold mb-2">Itens Recebidos:</h4>
                <div className="flex flex-wrap gap-2">
                  {outcome.rewards.items.map((item: string, index: number) => (
                    <span key={index} className="bg-purple-700 px-3 py-1 rounded-md text-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 rounded-md font-medium transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-4xl w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-amber-400 mb-2">{quest.title}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>📍 {quest.location}</span>
              <span>⚔️ {quest.difficulty}</span>
              <span>🎯 Nível {quest.levelRequirement}+</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Narrativa */}
        {quest.narrative && (
          <div className="mb-8">
            <div className="bg-gray-700 rounded-lg p-6 mb-4">
              <h3 className="text-lg font-bold text-white mb-3">📖 História</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                {quest.narrative.intro}
              </p>
              <p className="text-gray-300 leading-relaxed">
                {quest.narrative.situation}
              </p>
            </div>
          </div>
        )}

        {/* Escolhas */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-white mb-4">🤔 Suas Opções</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quest.choices?.map((choice) => {
              const canSelect = canSelectChoice(choice);
              const isSelected = selectedChoice === choice.id;
              
              return (
                <div
                  key={choice.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    canSelect
                      ? isSelected
                        ? 'border-amber-500 bg-amber-900/20'
                        : 'border-gray-600 hover:border-gray-500 bg-gray-700'
                      : 'border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => canSelect && handleChoiceSelect(choice.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className={`font-bold ${canSelect ? 'text-white' : 'text-gray-500'}`}>
                      {choice.text}
                    </h4>
                    {isSelected && <span className="text-amber-400">✓</span>}
                  </div>
                  
                  <p className={`text-sm mb-4 ${canSelect ? 'text-gray-300' : 'text-gray-500'}`}>
                    {choice.description}
                  </p>

                  {/* Consequências */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {choice.consequences.xp && (
                        <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                          +{choice.consequences.xp} XP
                        </span>
                      )}
                      {choice.consequences.gold && (
                        <span className={`px-2 py-1 rounded ${
                          choice.consequences.gold > 0
                            ? 'bg-yellow-900/50 text-yellow-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}>
                          {choice.consequences.gold > 0 ? '+' : ''}{choice.consequences.gold} Ouro
                        </span>
                      )}
                      {choice.consequences.reputation && (
                        <span className={`px-2 py-1 rounded ${
                          choice.consequences.reputation > 0
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}>
                          {choice.consequences.reputation > 0 ? '+' : ''}{choice.consequences.reputation} Rep
                        </span>
                      )}
                      {choice.consequences.risk && (
                        <span className={`px-2 py-1 rounded bg-gray-900/50 ${getRiskColor(choice.consequences.risk)}`}>
                          {getRiskText(choice.consequences.risk)}
                        </span>
                      )}
                    </div>

                    {/* Requisitos */}
                    {getChoiceRequirementText(choice) && (
                      <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
                        {getChoiceRequirementText(choice)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-md font-medium transition-colors"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConfirmChoice}
            disabled={!selectedChoice}
            className={`px-6 py-3 rounded-md font-medium transition-colors ${
              selectedChoice
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            Confirmar Escolha
          </button>
        </div>
      </div>
    </div>
  );
};

export default NarrativeQuest;
