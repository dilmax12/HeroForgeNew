import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { imageAIService } from '../services/imageAIService';
import { Hero } from '../types/hero';
import { medievalTheme } from '../styles/medievalTheme';

interface AIAvatarGeneratorProps {
  hero: Hero;
  onAvatarGenerated?: (avatarUrl: string) => void;
  style?: 'portrait' | 'full-body' | 'action';
  className?: string;
}

export const AIAvatarGenerator: React.FC<AIAvatarGeneratorProps> = ({
  hero,
  onAvatarGenerated,
  style = 'portrait',
  className = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Inicializa o preview com a imagem já salva do herói, se existir
  useEffect(() => {
    if (hero?.image && !generatedAvatar) {
      setGeneratedAvatar(hero.image);
    }
  }, [hero?.image]);

  const generateAvatar = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      if (!hero) {
        setError('Herói não disponível para gerar avatar.');
        return;
      }
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const avatarUrl = await imageAIService.generateHeroAvatar(hero, style);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setGeneratedAvatar(avatarUrl);
      onAvatarGenerated?.(avatarUrl);
      
      setTimeout(() => setProgress(0), 1000);
    } catch (err) {
      setError('Falha ao gerar avatar. Tente novamente.');
      console.error('Avatar generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [hero, style, onAvatarGenerated]);

  const regenerateAvatar = useCallback(() => {
    setGeneratedAvatar(null);
    generateAvatar();
  }, [hero, style]);

  return (
    <div className={`ai-avatar-generator ${className}`}>
      <style>{`
        .ai-avatar-generator {
          background: linear-gradient(${medievalTheme.gradients.backgrounds.secondary});
          border: 2px solid ${medievalTheme.colors.gold[500]};
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .avatar-preview {
          width: 200px;
          height: 200px;
          margin: 0 auto 20px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid ${medievalTheme.colors.accent.gold};
          background: ${medievalTheme.colors.background.primary};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder {
          color: ${medievalTheme.colors.text.secondary};
          font-size: 14px;
          text-align: center;
        }

        .generate-button {
          background: linear-gradient(135deg, ${medievalTheme.colors.accent.gold}, #b8860b);
          color: ${medievalTheme.colors.text.primary};
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 0 8px;
          font-size: 14px;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(218, 165, 32, 0.4);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .regenerate-button {
          background: linear-gradient(135deg, ${medievalTheme.colors.accent.silver}, #a0a0a0);
          color: ${medievalTheme.colors.text.primary};
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .regenerate-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(192, 192, 192, 0.4);
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: ${medievalTheme.colors.background.primary};
          border-radius: 2px;
          overflow: hidden;
          margin: 16px 0;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${medievalTheme.colors.accent.gold}, #ffd700);
          transition: width 0.3s ease;
        }

        .error-message {
          color: ${medievalTheme.colors.accent.crimson};
          font-size: 14px;
          margin-top: 12px;
          padding: 8px;
          background: rgba(220, 20, 60, 0.1);
          border-radius: 6px;
          border: 1px solid rgba(220, 20, 60, 0.3);
        }

        .hero-info {
          margin-bottom: 16px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          font-size: 14px;
          color: ${medievalTheme.colors.text.secondary};
        }

        .style-selector {
          margin-bottom: 16px;
        }

        .style-option {
          background: ${medievalTheme.colors.background.primary};
          color: ${medievalTheme.colors.text.secondary};
          border: 1px solid ${medievalTheme.colors.accent.gold};
          padding: 6px 12px;
          margin: 0 4px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
        }

        .style-option.active {
          background: ${medievalTheme.colors.accent.gold};
          color: ${medievalTheme.colors.text.primary};
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          color: ${medievalTheme.colors.text.primary};
          z-index: 10;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(218, 165, 32, 0.3);
          border-top: 3px solid ${medievalTheme.colors.accent.gold};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .ai-badge {
          position: absolute;
          top: 8px;
          right: 8px;
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

        .ai-icon {
          width: 12px;
          height: 12px;
        }
      `}</style>

      <div className="ai-badge">
        <svg className="ai-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
        </svg>
        IA
      </div>

      <div className="hero-info">
        <strong>{hero?.name ?? 'Herói'}</strong> - {(hero?.class ?? 'guerreiro')} Nível {(hero?.progression?.level ?? 1)}
      </div>

      <div className="avatar-preview">
        <AnimatePresence mode="wait">
          {generatedAvatar ? (
            <motion.img
              key="avatar"
              src={generatedAvatar}
              alt={`Avatar de ${hero.name}`}
              className="avatar-image"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
              onError={() => {
                setError('Falha ao carregar imagem.');
                setGeneratedAvatar(null);
              }}
            />
          ) : (
            <motion.div
              key="placeholder"
              className="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎭</div>
              Clique para gerar avatar com IA
            </motion.div>
          )}
        </AnimatePresence>

        {isGenerating && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div>Gerando avatar...</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {progress}%
            </div>
          </div>
        )}
      </div>

      {isGenerating && (
        <div className="progress-bar">
          <motion.div
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className="style-selector">
        {(['portrait', 'full-body', 'action'] as const).map((styleOption) => (
          <button
            key={styleOption}
            className={`style-option ${style === styleOption ? 'active' : ''}`}
            onClick={() => {
              // This would need to be passed as a prop to change style
            }}
            disabled={isGenerating}
          >
            {styleOption === 'portrait' && 'Retrato'}
            {styleOption === 'full-body' && 'Corpo Inteiro'}
            {styleOption === 'action' && 'Ação'}
          </button>
        ))}
      </div>

      <div>
        {!generatedAvatar ? (
          <button
            className="generate-button"
            onClick={generateAvatar}
            disabled={isGenerating}
          >
            {isGenerating ? 'Gerando...' : '✨ Gerar Avatar com IA'}
          </button>
        ) : (
          <div>
            <button
              className="regenerate-button"
              onClick={regenerateAvatar}
              disabled={isGenerating}
            >
              🔄 Regenerar
            </button>
          </div>
        )}
      </div>

      {error && (
        <motion.div
          className="error-message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default AIAvatarGenerator;
