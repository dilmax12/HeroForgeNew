import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { recommendationAI } from '../services/recommendationAI';
import { Hero } from '../types/hero';
import { Recommendation } from '../services/recommendationAI';
import { medievalTheme, seasonalThemes, getSeasonalButtonColors } from '../styles/medievalTheme';
import { useMonetizationStore } from '../store/monetizationStore';

interface AIRecommendationsPanelProps {
  hero: Hero;
  className?: string;
  onRecommendationApply?: (recommendation: Recommendation) => void;
}

export const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({
  hero,
  className = '',
  onRecommendationApply
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [optimalBuild, setOptimalBuild] = useState<any>(null);
  const [dailyGoals, setDailyGoals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'build' | 'goals' | 'weaknesses'>('general');
  const [expandedRecommendation, setExpandedRecommendation] = useState<string | null>(null);
  const { activeSeasonalTheme } = useMonetizationStore();
  const seasonalBorder = activeSeasonalTheme ? (seasonalThemes as any)[activeSeasonalTheme]?.border || 'border-white/20' : 'border-white/20';

  const generateRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!hero) {
        setError('Nenhum herói selecionado. Selecione um herói para gerar recomendações.');
        return;
      }
      const [
        generalRecs,
        heroWeaknesses,
        buildSuggestion,
        goals
      ] = await Promise.all([
        recommendationAI.generateRecommendations({
          hero,
          maxRecommendations: 5,
          context: {
            recentActivities: [],
            currentGoals: [],
            weaknesses: [],
            strengths: [],
            availableTime: 'medium',
            preferredActivities: []
          }
        } as any),
        recommendationAI.analyzeHeroWeaknesses(hero),
        recommendationAI.suggestOptimalBuild(hero),
        recommendationAI.generateDailyGoals(hero)
      ]);

      setRecommendations(generalRecs);
      setWeaknesses(heroWeaknesses);
      setOptimalBuild(buildSuggestion);
      setDailyGoals(goals);
    } catch (err) {
      setError('Falha ao gerar recomendações. Tente novamente.');
      console.warn('Recommendations generation warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hero]);

  const handleApplyRecommendation = useCallback((recommendation: Recommendation) => {
    onRecommendationApply?.(recommendation);
  }, [onRecommendationApply]);

  useEffect(() => {
    generateRecommendations();
  }, [hero]);

  const getPriorityColor = (priority: string) => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'critical': return '#dc2626';
      case 'high': return '#f87171';
      case 'medium': return '#fbbf24';
      case 'low': return '#4ade80';
      default: return medievalTheme.colors.text.secondary;
    }
  };

  const getPriorityIcon = (priority: string) => {
    const p = (priority || '').toLowerCase();
    switch (p) {
      case 'critical': return '🚨';
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📝';
    }
  };

  const getCategoryIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'training': return '🎯';
      case 'quest': return '🗺️';
      case 'equipment': return '🛡️';
      case 'strategy': return '🧠';
      case 'social': return '👥';
      case 'progression': return '📈';
      default: return '📋';
    }
  };

  return (
    <div className={className}>
      <div className={`ai-recommendations-panel rounded-xl border ${seasonalBorder}`}>
      <style>{`
        .ai-recommendations-panel {
          background: ${medievalTheme.colors.background.secondary};
          border: 2px solid ${medievalTheme.colors.accent.gold};
          border-radius: 12px;
          padding: 20px;
          max-width: 900px;
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

        .refresh-button {
          background: linear-gradient(135deg, ${medievalTheme.colors.accent.gold}, #b8860b);
          color: ${medievalTheme.colors.text.primary};
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .refresh-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(218, 165, 32, 0.4);
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .hero-summary {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .summary-item {
          text-align: center;
        }

        .summary-label {
          color: ${medievalTheme.colors.text.secondary};
          font-size: 12px;
          margin-bottom: 4px;
        }

        .summary-value {
          color: ${medievalTheme.colors.text.primary};
          font-size: 16px;
          font-weight: bold;
        }

        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(218, 165, 32, 0.3);
          overflow-x: auto;
        }

        .tab {
          background: none;
          border: none;
          padding: 12px 16px;
          color: ${medievalTheme.colors.text.secondary};
          cursor: pointer;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
          font-size: 14px;
        }

        .tab.active {
          color: ${medievalTheme.colors.accent.gold};
          border-bottom-color: ${medievalTheme.colors.accent.gold};
        }

        .content-section {
          min-height: 300px;
        }

        .recommendations-grid {
          display: grid;
          gap: 16px;
        }

        .recommendation-card {
          background: ${medievalTheme.colors.background.primary};
          border: 1px solid ${medievalTheme.colors.accent.gold};
          border-radius: 8px;
          padding: 16px;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .recommendation-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
        }

        .recommendation-card.expanded {
          border-color: ${medievalTheme.colors.accent.gold};
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.3);
        }

        .recommendation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .recommendation-title {
          color: ${medievalTheme.colors.text.primary};
          font-size: 16px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .priority-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .recommendation-description {
          color: ${medievalTheme.colors.text.secondary};
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .recommendation-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .apply-button {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .apply-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.4);
        }

        .details-button {
          background: ${medievalTheme.colors.background.secondary};
          color: ${medievalTheme.colors.text.secondary};
          border: 1px solid ${medievalTheme.colors.accent.gold};
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .details-button:hover {
          background: ${medievalTheme.colors.accent.gold};
          color: ${medievalTheme.colors.text.primary};
        }

        .weaknesses-list {
          display: grid;
          gap: 12px;
        }

        .weakness-item {
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid rgba(248, 113, 113, 0.3);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .weakness-icon {
          font-size: 24px;
        }

        .weakness-text {
          color: ${medievalTheme.colors.text.primary};
          font-size: 14px;
        }

        .build-suggestion {
          background: ${medievalTheme.colors.background.primary};
          border: 1px solid ${medievalTheme.colors.accent.gold};
          border-radius: 8px;
          padding: 20px;
        }

        .build-title {
          color: ${medievalTheme.colors.text.primary};
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .build-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-item {
          text-align: center;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
        }

        .stat-name {
          color: ${medievalTheme.colors.text.secondary};
          font-size: 12px;
          margin-bottom: 4px;
        }

        .stat-value {
          color: ${medievalTheme.colors.accent.gold};
          font-size: 16px;
          font-weight: bold;
        }

        .goals-list {
          display: grid;
          gap: 12px;
        }

        .goal-item {
          background: ${medievalTheme.colors.background.primary};
          border: 1px solid ${medievalTheme.colors.accent.gold};
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .goal-checkbox {
          width: 20px;
          height: 20px;
          border: 2px solid ${medievalTheme.colors.accent.gold};
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${medievalTheme.colors.accent.gold};
        }

        .goal-text {
          color: ${medievalTheme.colors.text.primary};
          font-size: 14px;
          flex: 1;
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
      `}</style>

      <div className="panel-header">
        <div className="panel-title">
          🧠 Recomendações IA
          <div className="ai-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
            </svg>
            IA
          </div>
        </div>
        <button
          className="refresh-button"
          onClick={generateRecommendations}
          disabled={isLoading}
          style={{
            backgroundImage: (() => {
              const { from, to } = getSeasonalButtonColors(activeSeasonalTheme as any);
              return `linear-gradient(135deg, ${from}, ${to})`;
            })()
          }}
        >
          {isLoading ? '⏳ Analisando...' : '🔄 Atualizar'}
        </button>
      </div>

      <div className="hero-summary">
        <div className="summary-item">
          <div className="summary-label">Nível</div>
          <div className="summary-value">{hero.progression.level}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Classe</div>
          <div className="summary-value">{hero.class}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Força</div>
          <div className="summary-value">{hero.attributes.strength}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Agilidade</div>
          <div className="summary-value">{hero.attributes.agility}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Inteligência</div>
          <div className="summary-value">{hero.attributes.intelligence}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Vitalidade</div>
          <div className="summary-value">{hero.attributes.vitality}</div>
        </div>
      </div>

      <div className="tabs">
        {(['general', 'build', 'goals', 'weaknesses'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'general' && '📋 Geral'}
            {tab === 'build' && '🛡️ Build Ideal'}
            {tab === 'goals' && '🎯 Metas Diárias'}
            {tab === 'weaknesses' && '⚠️ Fraquezas'}
          </button>
        ))}
      </div>

      <div className="content-section">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <div>Analisando seu herói e gerando recomendações...</div>
          </div>
        ) : error ? (
          <div className="error-message">
            {error}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="recommendations-grid"
              >
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`recommendation-card ${expandedRecommendation === rec.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedRecommendation(
                      expandedRecommendation === rec.id ? null : rec.id
                    )}
                  >
                    <div className="recommendation-header">
                      <div className="recommendation-title">
                        {getCategoryIcon(rec.type)}
                        {rec.title}
                      </div>
                      <div
                        className="priority-badge"
                        style={{
                          backgroundColor: getPriorityColor(rec.priority),
                          color: 'white'
                        }}
                      >
                        {getPriorityIcon(rec.priority)}
                        {rec.priority}
                      </div>
                    </div>

                    <div className="recommendation-description">
                      {rec.description}
                    </div>

                    {expandedRecommendation === rec.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="recommendation-actions"
                      >
                        <button
                          className="apply-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyRecommendation(rec);
                          }}
                        >
                          ✅ Aplicar
                        </button>
                        <button className="details-button">
                          📖 Mais Detalhes
                        </button>
                      </motion.div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'build' && optimalBuild && (
              <motion.div
                key="build"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="build-suggestion"
              >
                <div className="build-title">
                  🛡️ Build Recomendado para {hero.class}
                </div>
                
                <div className="build-stats">
                  <div className="stat-item">
                    <div className="stat-name">Força</div>
                    <div className="stat-value">{optimalBuild.strength || 25}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-name">Agilidade</div>
                    <div className="stat-value">{optimalBuild.agility || 20}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-name">Inteligência</div>
                    <div className="stat-value">{optimalBuild.intelligence || 15}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-name">Vitalidade</div>
                    <div className="stat-value">{optimalBuild.vitality || 30}</div>
                  </div>
                </div>

                <div style={{ color: medievalTheme.colors.text.secondary, fontSize: '14px' }}>
                  Esta distribuição de atributos é otimizada para sua classe e estilo de jogo atual.
                  Considere redistribuir seus pontos de atributo para maximizar sua efetividade.
                </div>
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="goals-list"
              >
                {dailyGoals.map((goal, index) => (
                  <div key={index} className="goal-item">
                    <div className="goal-checkbox">
                      ☐
                    </div>
                    <div className="goal-text">{goal}</div>
                  </div>
                ))}
              </motion.div>
            )}

            {activeTab === 'weaknesses' && (
              <motion.div
                key="weaknesses"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="weaknesses-list"
              >
                {weaknesses.map((weakness, index) => (
                  <div key={index} className="weakness-item">
                    <div className="weakness-icon">⚠️</div>
                    <div className="weakness-text">{weakness}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      </div>
    </div>
  );
};

export default AIRecommendationsPanel;
