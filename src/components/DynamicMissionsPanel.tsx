import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dynamicMissionsAI } from '../services/dynamicMissionsAI';
import { Hero } from '../types/hero';
import { DynamicMission, MissionObjective, NPCDialogue } from '../services/dynamicMissionsAI';
import { medievalTheme, seasonalThemes, getSeasonalButtonColors } from '../styles/medievalTheme';
import { useMonetizationStore } from '../store/monetizationStore';

interface DynamicMissionsPanelProps {
  hero: Hero;
  className?: string;
  onMissionAccept?: (mission: DynamicMission) => void;
  onMissionComplete?: (mission: DynamicMission) => void;
}

export const DynamicMissionsPanel: React.FC<DynamicMissionsPanelProps> = ({
  hero,
  className = '',
  onMissionAccept,
  onMissionComplete
}) => {
  const [missions, setMissions] = useState<DynamicMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<DynamicMission | null>(null);
  const [npcDialogue, setNpcDialogue] = useState<NPCDialogue | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingDialogue, setIsLoadingDialogue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-white/20' : 'border-white/20';

  const generateMissions = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (!hero) {
        setError('Nenhum herói selecionado. Selecione um herói para gerar missões.');
        return;
      }
      const newMissions = await Promise.all([
        dynamicMissionsAI.generateMission({
          hero,
          missionType: 'combat',
          difficulty: 'medium',
          context: 'Missão principal focada em combate'
        } as any),
        dynamicMissionsAI.generateMission({
          hero,
          missionType: 'exploration',
          difficulty: 'easy',
          context: 'Missão secundária de exploração'
        } as any),
        dynamicMissionsAI.generateMission({
          hero,
          missionType: 'social',
          difficulty: 'easy',
          context: 'Objetivo diário com interação social'
        } as any)
      ]);

      setMissions(newMissions);
    } catch (err) {
      setError('Falha ao gerar missões. Tente novamente.');
      console.error('Mission generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [hero]);

  const generateNPCDialogue = useCallback(async (mission: DynamicMission) => {
    setIsLoadingDialogue(true);
    try {
      if (!hero) {
        return;
      }
      const npcName = mission.npcDialogue?.[0]?.npcName || 'NPC';
      const context = `${mission.title}: ${mission.description}`;
      const dialogue = await dynamicMissionsAI.generateNPCDialogue(
        hero,
        npcName,
        context
      );
      setNpcDialogue(dialogue);
    } catch (err) {
      console.error('Dialogue generation error:', err);
    } finally {
      setIsLoadingDialogue(false);
    }
  }, [hero]);

  const handleMissionSelect = useCallback((mission: DynamicMission) => {
    setSelectedMission(mission);
    generateNPCDialogue(mission);
  }, [hero]);

  const handleAcceptMission = useCallback((mission: DynamicMission) => {
    onMissionAccept?.(mission);
    setSelectedMission(null);
    setNpcDialogue(null);
  }, [onMissionAccept]);

  useEffect(() => {
    generateMissions();
  }, [hero]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#4ade80';
      case 'medium': return '#fbbf24';
      case 'hard': return '#f87171';
      case 'legendary': return '#a855f7';
      default: return medievalTheme.colors.text.secondary;
    }
  };

  const getMissionTypeIcon = (type: string) => {
    switch (type) {
      case 'main': return '⚔️';
      case 'side': return '🗡️';
      case 'daily': return '📅';
      default: return '📜';
    }
  };

  return (
    <div className={className}>
      <div className={`dynamic-missions-panel rounded-xl border ${seasonalBorder}`}>
      <style>{`
        .dynamic-missions-panel {
          background: ${medievalTheme.colors.background.secondary};
          border: 2px solid ${medievalTheme.colors.accent.gold};
          border-radius: 12px;
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${medievalTheme.colors.accent.gold};
        }

        .panel-title {
          color: ${medievalTheme.colors.text.primary};
          font-size: 24px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-badge {
          background: linear-gradient(135deg, #4169e1, #1e90ff);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .generate-button {
          background: linear-gradient(135deg, ${medievalTheme.colors.accent.gold}, #b8860b);
          color: ${medievalTheme.colors.text.primary};
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(218, 165, 32, 0.4);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(218, 165, 32, 0.3);
        }

        .tab {
          background: none;
          border: none;
          padding: 12px 20px;
          color: ${medievalTheme.colors.text.secondary};
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
        }

        .tab.active {
          color: ${medievalTheme.colors.accent.gold};
          border-bottom-color: ${medievalTheme.colors.accent.gold};
        }

        .missions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .mission-card {
          background: ${medievalTheme.colors.background.primary};
          border: 1px solid ${medievalTheme.colors.accent.gold};
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .mission-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
          border-color: ${medievalTheme.colors.accent.gold};
        }

        .mission-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .mission-title {
          color: ${medievalTheme.colors.text.primary};
          font-size: 16px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mission-difficulty {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .mission-description {
          color: ${medievalTheme.colors.text.secondary};
          font-size: 14px;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .mission-objectives {
          margin-bottom: 12px;
        }

        .objective-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: ${medievalTheme.colors.text.secondary};
          margin-bottom: 4px;
        }

        .mission-rewards {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .reward-item {
          background: rgba(218, 165, 32, 0.2);
          color: ${medievalTheme.colors.accent.gold};
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: bold;
        }

        .mission-npc {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 10px;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: ${medievalTheme.colors.text.secondary};
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(218, 165, 32, 0.3);
          border-top: 2px solid ${medievalTheme.colors.accent.gold};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-message {
          color: ${medievalTheme.colors.accent.crimson};
          text-align: center;
          padding: 16px;
          background: rgba(220, 20, 60, 0.1);
          border-radius: 8px;
          border: 1px solid rgba(220, 20, 60, 0.3);
        }

        .mission-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: ${medievalTheme.colors.background.secondary};
          border: 2px solid ${medievalTheme.colors.accent.gold};
          border-radius: 12px;
          padding: 24px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${medievalTheme.colors.accent.gold};
        }

        .close-button {
          background: none;
          border: none;
          color: ${medievalTheme.colors.text.secondary};
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dialogue-section {
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border-left: 4px solid ${medievalTheme.colors.accent.gold};
        }

        .npc-name {
          color: ${medievalTheme.colors.accent.gold};
          font-weight: bold;
          margin-bottom: 8px;
        }

        .dialogue-text {
          color: ${medievalTheme.colors.text.primary};
          font-style: italic;
          line-height: 1.5;
        }

        .accept-button {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          margin-top: 16px;
        }

        .accept-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
        }
      `}</style>

      <div className="panel-header">
        <div className="panel-title">
          🗡️ Missões Dinâmicas
          <div className="ai-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
            </svg>
            IA
      </div>
    </div>
        <button
          className="generate-button"
          onClick={generateMissions}
          disabled={isGenerating}
          style={{
            backgroundImage: (() => {
              const { from, to } = getSeasonalButtonColors(activeSeasonalTheme as any);
              return `linear-gradient(135deg, ${from}, ${to})`;
            })()
          }}
        >
          {isGenerating ? '⏳ Gerando...' : '🔄 Gerar Novas'}
        </button>
      </div>

      <div className="tabs">
        {(['available', 'active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'available' && '📋 Disponíveis'}
            {tab === 'active' && '⚔️ Ativas'}
            {tab === 'completed' && '✅ Concluídas'}
          </button>
        ))}
      </div>

      {isGenerating ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div>Gerando missões personalizadas...</div>
        </div>
      ) : error ? (
        <div className="error-message">
          {error}
        </div>
      ) : (
        <div className="missions-grid">
          <AnimatePresence>
            {missions.map((mission, index) => (
              <motion.div
                key={mission.id}
                className="mission-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleMissionSelect(mission)}
              >
                <div className="mission-npc">
                  {mission.location ? `📍 ${mission.location}` : '📍 Local desconhecido'}
                  {mission.npcDialogue && mission.npcDialogue[0]?.npcName ? ` • 👤 ${mission.npcDialogue[0].npcName}` : ''}
                </div>
                
                <div className="mission-header">
                  <div className="mission-title">
                    {getMissionTypeIcon(mission.type)}
                    {mission.title}
                  </div>
                  <div
                    className="mission-difficulty"
                    style={{
                      backgroundColor: getDifficultyColor(mission.difficulty),
                      color: 'white'
                    }}
                  >
                    {mission.difficulty}
                  </div>
                </div>

                <div className="mission-description">
                  {mission.description}
                </div>

                <div className="mission-objectives">
                  {mission.objectives.slice(0, 2).map((objective, idx) => (
                    <div key={idx} className="objective-item">
                      <span>•</span>
                      <span>{objective.description}</span>
                    </div>
                  ))}
                  {mission.objectives.length > 2 && (
                    <div className="objective-item">
                      <span>•</span>
                      <span>+{mission.objectives.length - 2} mais...</span>
                    </div>
                  )}
                </div>

                <div className="mission-rewards">
                  {(() => {
                    const rewards = Array.isArray(mission.rewards) ? mission.rewards : [];
                    const gold = rewards.filter(r => r.type === 'gold').reduce((sum, r) => sum + (r.amount || 0), 0);
                    const xp = rewards.filter(r => r.type === 'experience').reduce((sum, r) => sum + (r.amount || 0), 0);
                    const itemsCount = rewards.filter(r => r.type === 'item').length;
                    return (
                      <>
                        <div className="reward-item">💰 {gold} ouro</div>
                        <div className="reward-item">⭐ {xp} XP</div>
                        {itemsCount > 0 && (
                          <div className="reward-item">🎁 {itemsCount} itens</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {selectedMission && (
          <motion.div
            className="mission-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedMission(null);
                setNpcDialogue(null);
              }
            }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="modal-header">
                <div className="mission-title">
                  {getMissionTypeIcon(selectedMission.type)}
                  {selectedMission.title}
                </div>
                <button
                  className="close-button"
                  onClick={() => {
                    setSelectedMission(null);
                    setNpcDialogue(null);
                  }}
                >
                  ×
                </button>
              </div>

              {isLoadingDialogue ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <div>Gerando diálogo do NPC...</div>
                </div>
              ) : npcDialogue && (
                <div className="dialogue-section">
                  <div className="npc-name">{npcDialogue.npcName}:</div>
                  <div className="dialogue-text">"{npcDialogue.dialogue}"</div>
                </div>
              )}

              <div className="mission-description" style={{ marginBottom: '16px' }}>
                {selectedMission.description}
              </div>

              <div className="mission-objectives" style={{ marginBottom: '16px' }}>
                <strong style={{ color: medievalTheme.colors.text.primary }}>Objetivos:</strong>
                {selectedMission.objectives.map((objective, idx) => (
                  <div key={idx} className="objective-item">
                    <span>•</span>
                    <span>{objective.description}</span>
                  </div>
                ))}
              </div>

              <button
                className="accept-button"
                onClick={() => handleAcceptMission(selectedMission)}
              >
                ⚔️ Aceitar Missão
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};

export default DynamicMissionsPanel;
