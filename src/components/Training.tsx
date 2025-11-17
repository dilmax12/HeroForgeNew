import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGameSettingsStore } from '../store/gameSettingsStore';
import { useHeroStore } from '../store/heroStore';
import { getMaxAttributeForRank } from '../utils/attributeSystem';
import { rankSystem } from '../utils/rankSystem';
import { onboardingManager } from '../utils/onboardingSystem';

interface TrainingOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  currency?: 'gold' | 'glory' | 'arcaneEssence';
  duration: number; // em minutos
  fatiguePenalty?: number; // penalidade de fadiga aplicada ao concluir
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
    currency: 'gold',
    duration: 3,
    fatiguePenalty: 15,
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
    currency: 'gold',
    duration: 3,
    fatiguePenalty: 15,
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
    currency: 'arcaneEssence',
    duration: 3,
    fatiguePenalty: 15,
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
    currency: 'glory',
    duration: 3,
    fatiguePenalty: 10,
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
    currency: 'gold',
    duration: 3,
    fatiguePenalty: 25,
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
    currency: 'glory',
    duration: 3,
    fatiguePenalty: 10,
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
    currency: 'glory',
    duration: 3,
    fatiguePenalty: 30,
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
    currency: 'gold',
    duration: 3,
    fatiguePenalty: 20,
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
  const { getSelectedHero, updateHero, updateDailyGoalProgress } = useHeroStore();
  const selectedHero = getSelectedHero();
  const [activeTraining, setActiveTraining] = useState<string | null>(null);
  const [trainingEndTime, setTrainingEndTime] = useState<number | null>(null);
  const [tick, setTick] = useState(0); // força re-render para atualizar contador
  const currentRank = selectedHero?.rankData?.currentRank || (selectedHero ? rankSystem.calculateRank(selectedHero) : undefined);
  const maxAttr = currentRank ? getMaxAttributeForRank(currentRank) : undefined;
  const attemptsByStatus = { ...(selectedHero?.stats as any)?.trainingAttemptsByStatus || {} } as Record<string, number>;

  // Atualiza o contador em tempo real enquanto houver treinamento ativo
  useEffect(() => {
    if (!activeTraining || !trainingEndTime) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 500);
    return () => clearInterval(id);
  }, [activeTraining, trainingEndTime]);

  useEffect(() => {
    if (!selectedHero) return;
    const last = selectedHero.stats.lastTrainingDate ? new Date(selectedHero.stats.lastTrainingDate).toDateString() : '';
    const today = new Date().toDateString();
    if (last !== today) {
      updateHero(selectedHero.id, { stats: { ...selectedHero.stats, trainingsToday: 0, trainingAttemptsByStatus: {}, lastTrainingDate: new Date().toISOString() } });
    }
  }, [selectedHero?.id]);

  // Retomar/Concluir treino baseado em stats persistidos
  useEffect(() => {
    if (!selectedHero) return;
    const activeUntilISO = selectedHero.stats.trainingActiveUntil;
    const activeName = selectedHero.stats.trainingActiveName;
    if (!activeUntilISO || !activeName) return;
    const endTs = new Date(activeUntilISO).getTime();
    const now = Date.now();
    const option = TRAINING_OPTIONS.find(o => o.name === activeName) || null;
    if (!option) {
      // Limpar status inválido
      updateHero(selectedHero.id, { stats: { ...selectedHero.stats, trainingActiveUntil: undefined, trainingActiveName: undefined } });
      return;
    }
    if (now < endTs) {
      // Reativar contador local
      setActiveTraining(option.id);
      setTrainingEndTime(endTs);
    } else {
      // Concluir imediatamente e aplicar decremento diário
      completeTraining(option);
    }
  }, [selectedHero?.id]);

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

  // Custo com desconto global (buff da Guilda)
  const getDiscountedCost = (option: TrainingOption) => {
    const discountPercent = useGameSettingsStore.getState().trainingCostReductionPercent || 0;
    const capped = Math.max(0, Math.min(100, discountPercent));
    const discounted = Math.ceil(option.cost * (1 - capped / 100));
    return Math.max(0, discounted);
  };

  const canAffordTraining = (option: TrainingOption) => {
    const currency = option.currency || 'gold';
    const prog = selectedHero.progression;
    const balance = currency === 'gold' ? (prog.gold || 0)
                    : currency === 'glory' ? (prog.glory || 0)
                    : (prog.arcaneEssence || 0);
    return balance >= getDiscountedCost(option);
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

    // Bloquear se qualquer atributo-alvo já estiver no limite
    if (option.rewards.attributes && maxAttr !== undefined) {
      const atCap = Object.entries(option.rewards.attributes).some(([attr]) => {
        const current = (selectedHero.attributes as any)[attr] || 0;
        return current >= (maxAttr as number);
      });
      if (atCap) {
        alert('Este treinamento não pode ser iniciado: atributo já está no limite.');
        return;
      }
    }

    // Verificar limite diário por status e reset se mudou o dia
    const now = new Date();
    const nowISO = now.toISOString();
    const lastDateStr = selectedHero.stats.lastTrainingDate ? new Date(selectedHero.stats.lastTrainingDate).toDateString() : '';
    const todayStr = now.toDateString();
    const attemptsByStatus = { ...(selectedHero.stats as any).trainingAttemptsByStatus || {} } as Record<string, number>;
    const dailyLimitPerStatus = 10;

    if (lastDateStr !== todayStr) {
      // Reset diário
      for (const k of Object.keys(attemptsByStatus)) delete attemptsByStatus[k];
      updateHero(selectedHero.id, {
        stats: {
          ...selectedHero.stats,
          trainingsToday: 0,
          lastTrainingDate: nowISO
        }
      });
    }

    if (option.rewards.attributes) {
      const blocked = Object.keys(option.rewards.attributes).some(attr => (attemptsByStatus[attr] || 0) >= dailyLimitPerStatus);
      if (blocked) {
        alert('Limite diário de treino por status atingido (10). Volte amanhã.');
        return;
      }
    }

    // Deduzir custo conforme a moeda
    const currency = option.currency || 'gold';
    const prog = selectedHero.progression;
    const newProgression = { ...prog } as any;
    const effectiveCost = getDiscountedCost(option);
    if (currency === 'gold') newProgression.gold = (prog.gold || 0) - effectiveCost;
    else if (currency === 'glory') newProgression.glory = (prog.glory || 0) - effectiveCost;
    else newProgression.arcaneEssence = (prog.arcaneEssence || 0) - effectiveCost;
    updateHero(selectedHero.id, { progression: newProgression });

    // Definir treinamento ativo
    setActiveTraining(option.id);
    const endTime = Date.now() + (option.duration * 60 * 1000);
    setTrainingEndTime(endTime);

    // Persistir status de treino ativo para HUD
    updateHero(selectedHero.id, {
      stats: {
        ...selectedHero.stats,
        trainingActiveUntil: new Date(endTime).toISOString(),
        trainingActiveName: option.name,
        // também marcar último treino iniciado hoje
        lastTrainingDate: nowISO
      }
    });

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

    // Escalonar recompensas conforme Fadiga
    const fatigue = selectedHero.progression.fatigue || 0;
    let effectiveness = 1;
    if (fatigue >= 70) effectiveness = 0.5;
    else if (fatigue >= 40) effectiveness = 0.75;

    // Aplicar recompensas
    if (option.rewards.xp) {
      const gained = Math.floor(option.rewards.xp * effectiveness);
      updates.progression.xp = (selectedHero.progression.xp || 0) + gained;
    }

    if (option.rewards.gold) {
      const gained = Math.floor(option.rewards.gold * effectiveness);
      updates.progression.gold = (selectedHero.progression.gold || 0) + gained;
    }

    if (option.rewards.attributes && maxAttr !== undefined) {
      updates.attributes = { ...selectedHero.attributes };
      Object.entries(option.rewards.attributes).forEach(([attr, value]) => {
        const current = (selectedHero.attributes as any)[attr] || 0;
        const next = current + Math.max(1, Math.floor(value * effectiveness));
        (updates.attributes as any)[attr] = Math.min(maxAttr as number, next);
      });
    }

    // Incrementar contador diário de treinos
    const nowISO = new Date().toISOString();
    const trainingsToday = (selectedHero.stats.trainingsToday || 0) + 1;
    const attemptsByStatus = { ...(selectedHero.stats as any).trainingAttemptsByStatus || {} } as Record<string, number>;
    if (option.rewards.attributes) {
      Object.keys(option.rewards.attributes).forEach(attr => {
        attemptsByStatus[attr] = (attemptsByStatus[attr] || 0) + 1;
      });
    }

    updates.stats = {
      ...selectedHero.stats,
      trainingsToday,
      lastTrainingDate: nowISO,
      trainingDailyLimit: 10,
      trainingAttemptsByStatus: attemptsByStatus,
      // limpar status de treino ativo
      trainingActiveUntil: undefined,
      trainingActiveName: undefined
    };

    // Aplicar Fadiga ao concluir
    const penalty = option.fatiguePenalty ?? 20;
    const nextFatigue = Math.min(100, (selectedHero.progression.fatigue || 0) + penalty);
    updates.progression.fatigue = nextFatigue;

    updateHero(selectedHero.id, updates);
    // Atualizar metas diárias relacionadas
    updateDailyGoalProgress(selectedHero.id, 'attribute-trained', 1);
    if (option.rewards.xp) {
      updateDailyGoalProgress(selectedHero.id, 'xp-gained', option.rewards.xp);
    }
    if (option.rewards.gold) {
      updateDailyGoalProgress(selectedHero.id, 'gold-earned', option.rewards.gold);
    }
    setActiveTraining(null);
    setTrainingEndTime(null);

    alert(`Treinamento concluído! Efetividade ${Math.round(effectiveness*100)}%. Recompensas de ${option.name} aplicadas.`);
    try { localStorage.setItem('hfn_training_basic_done', '1'); } catch {}
    try { onboardingManager.markStepValidated('basic-training'); onboardingManager.saveState(); } catch {}
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
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <div className="bg-blue-100 border border-blue-400 rounded-lg px-3 py-2 inline-flex items-center">
            <span className="text-blue-800 font-medium">💰 Ouro: {selectedHero.progression.gold || 0}g</span>
          </div>
          <div className="bg-purple-100 border border-purple-400 rounded-lg px-3 py-2 inline-flex items-center">
            <span className="text-purple-800 font-medium">🏆 Glória: {selectedHero.progression.glory || 0}</span>
          </div>
          <div className="bg-indigo-100 border border-indigo-400 rounded-lg px-3 py-2 inline-flex items-center">
            <span className="text-indigo-800 font-medium">✨ Essência Arcana: {selectedHero.progression.arcaneEssence || 0}</span>
          </div>
          <div className="bg-red-100 border border-red-400 rounded-lg px-3 py-2 inline-flex items-center">
            <span className="text-red-800 font-medium">😴 Fadiga: {selectedHero.progression.fatigue || 0}/100</span>
          </div>
        </div>
        <div className="mt-2 bg-green-100 border border-green-400 rounded-lg p-2 inline-block ml-2">
          <span className="text-green-800 font-medium">
            🗓️ Limite por status: 10 tentativas por atributo
          </span>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {(['forca','destreza','constituicao','inteligencia','sabedoria','carisma'] as const)
            .slice()
            .sort((a,b) => (attemptsByStatus[b]||0) - (attemptsByStatus[a]||0))
            .map(attr => {
              const used = attemptsByStatus[attr] || 0;
              const blocked = used >= 10;
              const boxCls = blocked ? 'bg-red-100 border border-red-400 text-red-800' : 'bg-gray-100 border border-gray-300 text-gray-800';
              return (
                <div key={attr} className={`${boxCls} rounded px-3 py-1 text-sm`}> 
                  <span className="font-medium capitalize">{attr}</span>: {used}/10
                </div>
              );
            })}
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
          const attemptsByStatus = { ...(selectedHero.stats as any).trainingAttemptsByStatus || {} } as Record<string, number>;
          const dailyLimitPerStatus = 10;
          const attrCapBlocked = option.rewards.attributes && maxAttr !== undefined ? Object.entries(option.rewards.attributes).some(([attr]) => {
            const current = (selectedHero.attributes as any)[attr] || 0;
            return current >= (maxAttr as number);
          }) : false;
          const perStatusBlocked = option.rewards.attributes ? Object.keys(option.rewards.attributes).some(attr => (attemptsByStatus[attr] || 0) >= dailyLimitPerStatus) : false;
          const isAvailable = canAfford && meetsReqs && !activeTraining && !attrCapBlocked && !perStatusBlocked;

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
            <span className={`font-medium ${
              (option.currency || 'gold') === 'gold' ? 'text-yellow-600' :
              (option.currency || 'gold') === 'glory' ? 'text-purple-700' : 'text-indigo-700'
            }`}>
              {getDiscountedCost(option)} {(option.currency || 'gold') === 'gold' ? 'ouro' : (option.currency || 'gold') === 'glory' ? 'glória' : 'essência'}
            </span>
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
                  {option.rewards.attributes && Object.entries(option.rewards.attributes).map(([attr, value]) => {
                    const used = attemptsByStatus[attr] || 0;
                    const blocked = used >= 10;
                    const cls = blocked ? 'text-red-600' : 'text-green-600';
                    return (
                      <div key={attr} className={`text-xs ${cls}`}>
                        +{value} {attr.charAt(0).toUpperCase() + attr.slice(1)}
                        <span className={blocked ? 'ml-2 text-red-600' : 'ml-2 text-gray-500'}>({used}/10 hoje)</span>
                      </div>
                    );
                  })}
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
                {!canAfford ? ((option.currency || 'gold') === 'gold' ? 'Ouro Insuficiente' : (option.currency || 'gold') === 'glory' ? 'Glória Insuficiente' : 'Essência Insuficiente') :
                 !meetsReqs ? 'Requisitos não atendidos' :
                 attrCapBlocked ? 'Atributo no limite' :
                 activeTraining ? 'Treinamento em andamento' :
                 perStatusBlocked ? 'Limite por status atingido' :
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
