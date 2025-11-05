import React, { useState } from 'react';
import { useHeroStore } from '../store/heroStore';

interface TrainingOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  duration: number; // em minutos
  rewards: {
    xp?: number;
    gold?: number;
    attributes?: Record<string, number>;
  };
  requirements?: {
    level?: number;
    gold?: number;
  };
}

const TRAINING_OPTIONS: TrainingOption[] = [
  {
    id: 'basic-combat',
    name: 'Treinamento Básico de Combate',
    description: 'Aprenda os fundamentos do combate corpo a corpo',
    icon: '⚔️',
    cost: 20,
    duration: 3,
    rewards: {
      xp: 25,
      attributes: { forca: 1 }
    }
  },
  {
    id: 'agility-training',
    name: 'Treinamento de Agilidade',
    description: 'Melhore sua velocidade e reflexos',
    icon: '🏃',
    cost: 25,
    duration: 3,
    rewards: {
      xp: 30,
      attributes: { destreza: 1 }
    }
  },
  {
    id: 'magic-studies',
    name: 'Estudos Mágicos',
    description: 'Aprofunde seus conhecimentos arcanos',
    icon: '📚',
    cost: 35,
    duration: 3,
    rewards: {
      xp: 40,
      attributes: { inteligencia: 1 }
    },
    requirements: {
      level: 3
    }
  },
  {
    id: 'meditation',
    name: 'Meditação Espiritual',
    description: 'Fortaleça sua mente e espírito',
    icon: '🧘',
    cost: 30,
    duration: 3,
    rewards: {
      xp: 35,
      attributes: { sabedoria: 1 }
    }
  },
  {
    id: 'endurance-training',
    name: 'Treinamento de Resistência',
    description: 'Aumente sua resistência física',
    icon: '💪',
    cost: 40,
    duration: 3,
    rewards: {
      xp: 45,
      attributes: { constituicao: 1 }
    },
    requirements: {
      level: 2
    }
  },
  {
    id: 'charisma-workshop',
    name: 'Workshop de Liderança',
    description: 'Desenvolva suas habilidades sociais',
    icon: '🎭',
    cost: 50,
    duration: 3,
    rewards: {
      xp: 50,
      attributes: { carisma: 1 }
    },
    requirements: {
      level: 5
    }
  },
  {
    id: 'advanced-combat',
    name: 'Combate Avançado',
    description: 'Técnicas avançadas de combate',
    icon: '🗡️',
    cost: 100,
    duration: 3,
    rewards: {
      xp: 100,
      attributes: { forca: 2, destreza: 1 }
    },
    requirements: {
      level: 10
    }
  },
  {
    id: 'treasure-hunting',
    name: 'Caça ao Tesouro',
    description: 'Aprenda a encontrar tesouros escondidos',
    icon: '💰',
    cost: 75,
    duration: 3,
    rewards: {
      xp: 60,
      gold: 150
    },
    requirements: {
      level: 7
    }
  }
];

const Training: React.FC = () => {
  const { getSelectedHero, updateHero } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [activeTraining, setActiveTraining] = useState<string | null>(null);
  const [trainingEndTime, setTrainingEndTime] = useState<number | null>(null);

  if (!selectedHero) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="text-6xl mb-4">💪</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Centro de Treinamento</h2>
        <p className="text-gray-600 mb-6">Selecione um herói para começar o treinamento.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">
          Voltar à Lista de Heróis
        </Link>
      </div>
    );
  }

  const canAffordTraining = (option: TrainingOption) => {
    return selectedHero.progression.gold >= option.cost;
  };

  const meetsRequirements = (option: TrainingOption) => {
    if (option.requirements?.level && selectedHero.progression.level < option.requirements.level) {
      return false;
    }
    if (option.requirements?.gold && selectedHero.progression.gold < option.requirements.gold) {
      return false;
    }
    return true;
  };

  const startTraining = (option: TrainingOption) => {
    if (!canAffordTraining(option) || !meetsRequirements(option)) return;

    // Deduzir custo
    updateHero(selectedHero.id, {
      progression: {
        ...selectedHero.progression,
        gold: selectedHero.progression.gold - option.cost
      }
    });

    // Definir treinamento ativo
    setActiveTraining(option.id);
    const endTime = Date.now() + (option.duration * 60 * 1000);
    setTrainingEndTime(endTime);

    // Simular conclusão do treinamento (em produção, isso seria gerenciado pelo backend)
    setTimeout(() => {
      completeTraining(option);
    }, option.duration * 60 * 1000);
  };

  const completeTraining = (option: TrainingOption) => {
    const updates: any = {
      progression: {
        ...selectedHero.progression
      }
    };

    // Aplicar recompensas
    if (option.rewards.xp) {
      updates.progression.xp = selectedHero.progression.xp + option.rewards.xp;
    }

    if (option.rewards.gold) {
      updates.progression.gold = selectedHero.progression.gold + option.rewards.gold;
    }

    if (option.rewards.attributes) {
      updates.attributes = { ...selectedHero.attributes };
      Object.entries(option.rewards.attributes).forEach(([attr, value]) => {
        updates.attributes[attr] = (selectedHero.attributes[attr] || 0) + value;
      });
    }

    updateHero(selectedHero.id, updates);
    setActiveTraining(null);
    setTrainingEndTime(null);

    alert(`Treinamento concluído! Você ganhou as recompensas de ${option.name}.`);
  };

  const getRemainingTime = () => {
    if (!trainingEndTime) return 0;
    return Math.max(0, trainingEndTime - Date.now());
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          💪 Centro de Treinamento
        </h1>
        <p className="text-gray-600">
          Aprimore suas habilidades e atributos através de treinamentos especializados
        </p>
        <div className="mt-4 bg-blue-100 border border-blue-400 rounded-lg p-3 inline-block">
          <span className="text-blue-800 font-medium">
            💰 Ouro Disponível: {selectedHero.progression.gold}g
          </span>
        </div>
      </div>

      {/* Status do Treinamento Ativo */}
      {activeTraining && (
        <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-yellow-800 mb-2">
              🏃 Treinamento em Andamento
            </h3>
            <p className="text-yellow-700">
              {TRAINING_OPTIONS.find(t => t.id === activeTraining)?.name}
            </p>
            <p className="text-yellow-600 text-sm mt-1">
              Tempo restante: {formatTime(getRemainingTime())}
            </p>
          </div>
        </div>
      )}

      {/* Opções de Treinamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TRAINING_OPTIONS.map((option) => {
          const canAfford = canAffordTraining(option);
          const meetsReqs = meetsRequirements(option);
          const isAvailable = canAfford && meetsReqs && !activeTraining;

          return (
            <div
              key={option.id}
              className={`bg-white p-6 rounded-lg border-2 shadow-sm ${
                isAvailable ? 'border-green-400 hover:shadow-md' : 'border-gray-300'
              } transition-shadow`}
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">{option.icon}</div>
                <h3 className="text-lg font-bold text-gray-800">{option.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
              </div>

              {/* Informações */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Custo:</span>
                  <span className="font-medium text-yellow-600">{option.cost}g</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duração:</span>
                  <span className="font-medium">{option.duration} min</span>
                </div>
              </div>

              {/* Requisitos */}
              {option.requirements && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Requisitos:</h4>
                  {option.requirements.level && (
                    <div className={`text-xs ${selectedHero.progression.level >= option.requirements.level ? 'text-green-600' : 'text-red-600'}`}>
                      Nível {option.requirements.level}+
                    </div>
                  )}
                </div>
              )}

              {/* Recompensas */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Recompensas:</h4>
                <div className="space-y-1">
                  {option.rewards.xp && (
                    <div className="text-xs text-blue-600">+{option.rewards.xp} XP</div>
                  )}
                  {option.rewards.gold && (
                    <div className="text-xs text-yellow-600">+{option.rewards.gold} Ouro</div>
                  )}
                  {option.rewards.attributes && Object.entries(option.rewards.attributes).map(([attr, value]) => (
                    <div key={attr} className="text-xs text-green-600">
                      +{value} {attr.charAt(0).toUpperCase() + attr.slice(1)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão */}
              <button
                onClick={() => startTraining(option)}
                disabled={!isAvailable}
                className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                  isAvailable
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {!canAfford ? 'Ouro Insuficiente' :
                 !meetsReqs ? 'Requisitos não atendidos' :
                 activeTraining ? 'Treinamento em andamento' :
                 'Iniciar Treinamento'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Training;
