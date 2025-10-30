import React, { useState, useEffect } from 'react';
import { RankCelebration as RankCelebrationData, RankLevel } from '../types/ranks';
import { RankCard } from './RankCard';
import { RankPromotionAnimation } from './RankAnimations';
import { 
  Trophy, 
  Star, 
  Sparkles, 
  Crown, 
  Zap, 
  X,
  ChevronRight,
  Gift
} from 'lucide-react';

interface RankCelebrationProps {
  celebration: RankCelebrationData;
  onClose: () => void;
  onViewRewards?: () => void;
  className?: string;
}

export const RankCelebration: React.FC<RankCelebrationProps> = ({
  celebration,
  onClose,
  onViewRewards,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showRewards, setShowRewards] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'intro' | 'celebrate' | 'rewards'>('intro');

  useEffect(() => {
    // Trigger entrance animation
    const timer1 = setTimeout(() => setIsVisible(true), 100);
    const timer2 = setTimeout(() => setAnimationPhase('celebrate'), 800);
    const timer3 = setTimeout(() => setAnimationPhase('rewards'), 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getRankIcon = (rank: RankLevel) => {
    switch (rank) {
      case 'S': return Crown;
      case 'A': return Trophy;
      case 'B': return Star;
      case 'C': return Sparkles;
      case 'D': return Zap;
      default: return Trophy;
    }
  };

  const getRankColor = (rank: RankLevel) => {
    switch (rank) {
      case 'S': return 'from-purple-500 to-pink-500';
      case 'A': return 'from-yellow-500 to-orange-500';
      case 'B': return 'from-blue-500 to-cyan-500';
      case 'C': return 'from-green-500 to-emerald-500';
      case 'D': return 'from-gray-500 to-slate-500';
      case 'E': return 'from-orange-500 to-red-500';
      case 'F': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const RankIcon = getRankIcon(celebration.newRank);

  return (
    <>
      {/* Animação principal de promoção */}
      <RankPromotionAnimation
        isVisible={isVisible && !showRewards}
        newRank={celebration.newRank}
        onComplete={() => setShowRewards(true)}
      />

      {/* Modal de recompensas */}
      <AnimatePresence>
        {isVisible && showRewards && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: 50 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-gradient-to-br from-purple-900 to-blue-900 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 text-center border border-purple-500"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="text-4xl mb-4"
                >
                  🎁
                </motion.div>

                <h2 className="text-2xl font-bold text-yellow-400 mb-4">
                  Recompensas de Rank!
                </h2>

                {/* Recompensas */}
                {celebration.rewards && celebration.rewards.length > 0 && (
                  <div className="mb-6">
                    <div className="space-y-2">
                      {celebration.rewards.map((reward, index) => (
                        <motion.div
                          key={index}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-center bg-purple-800 bg-opacity-50 rounded-lg p-3"
                        >
                          <span className="text-yellow-400 mr-2">✨</span>
                          <span className="text-white">{reward}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClose}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-lg"
                >
                  Continuar Jornada
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Component for managing multiple celebrations
interface RankCelebrationManagerProps {
  celebrations: RankCelebrationData[];
  onCelebrationViewed: (index: number) => void;
  onViewRewards?: (celebration: RankCelebrationData) => void;
}

export const RankCelebrationManager: React.FC<RankCelebrationManagerProps> = ({
  celebrations,
  onCelebrationViewed,
  onViewRewards
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (celebrations.length === 0) return null;

  const handleClose = () => {
    onCelebrationViewed(currentIndex);
    
    // Show next celebration if available
    if (currentIndex < celebrations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const currentCelebration = celebrations[currentIndex];

  return (
    <RankCelebration
      celebration={currentCelebration}
      onClose={handleClose}
      onViewRewards={onViewRewards ? () => onViewRewards(currentCelebration) : undefined}
    />
  );
};