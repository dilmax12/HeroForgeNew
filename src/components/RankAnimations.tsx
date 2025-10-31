import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RankLevel } from '../types/ranks';
import { medievalTheme, getRankGradient, getRankIcon } from '../styles/medievalTheme';

interface RankPromotionAnimationProps {
  isVisible: boolean;
  newRank: RankLevel;
  onComplete: () => void;
}

export const RankPromotionAnimation: React.FC<RankPromotionAnimationProps> = ({
  isVisible,
  newRank,
  onComplete
}) => {
  const [showParticles, setShowParticles] = useState(false);
  const [showRankBadge, setShowRankBadge] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer1 = setTimeout(() => setShowParticles(true), 500);
      const timer2 = setTimeout(() => setShowRankBadge(true), 1000);
      const timer3 = setTimeout(() => onComplete(), 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
        >
          {/* Fundo com efeito de brilho */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 bg-gradient-radial from-yellow-400/20 via-transparent to-transparent"
          />

          {/* Partículas flutuantes */}
          <AnimatePresence>
            {showParticles && (
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 0, 
                      y: 100, 
                      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                      scale: 0 
                    }}
                    animate={{ 
                      opacity: [0, 1, 0], 
                      y: -100, 
                      scale: [0, 1, 0],
                      rotate: 360
                    }}
                    transition={{ 
                      duration: 2, 
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Conteúdo principal */}
          <motion.div
            initial={{ scale: 0, rotateY: 180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative z-10 text-center"
          >
            {/* Título da promoção */}
            <motion.h1
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-8"
            >
              PROMOÇÃO!
            </motion.h1>

            {/* Badge do novo rank */}
            <AnimatePresence>
              {showRankBadge && (
                <motion.div
                  initial={{ scale: 0, rotateZ: -180 }}
                  animate={{ scale: 1, rotateZ: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r ${getRankGradient(newRank)} text-white text-2xl font-bold shadow-2xl`}
                >
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                    className="text-4xl mr-4"
                  >
                    {getRankIcon(newRank)}
                  </motion.span>
                  <span>Rank {newRank}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Texto de congratulações */}
            <motion.p
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="text-xl text-gray-300 mt-8"
            >
              Parabéns pela sua ascensão heroica!
            </motion.p>

            {/* Efeito de brilho no fundo */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`absolute inset-0 -z-10 rounded-full bg-gradient-to-r ${getRankGradient(newRank)} blur-3xl`}
            />
          </motion.div>

          {/* Raios de luz */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: [0, 0.8, 0] }}
                transition={{ 
                  duration: 1.5, 
                  delay: 0.5 + i * 0.1,
                  ease: "easeOut"
                }}
                className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-transparent"
                style={{
                  left: `${50 + Math.cos(i * Math.PI / 4) * 30}%`,
                  transform: `rotate(${i * 45}deg)`,
                  transformOrigin: 'center'
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface RankProgressAnimationProps {
  progress: number;
  isAnimating: boolean;
  color?: string;
}

export const RankProgressAnimation: React.FC<RankProgressAnimationProps> = ({
  progress,
  isAnimating,
  color = 'from-blue-400 to-blue-600'
}) => {
  return (
    <div className="relative w-full h-4 bg-gray-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ 
          duration: isAnimating ? 1.5 : 0.3, 
          ease: "easeOut" 
        }}
        className={`h-full bg-gradient-to-r ${color} relative`}
      >
        {/* Efeito de brilho na barra de progresso */}
        <motion.div
          animate={{ x: [-100, 300] }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-20"
        />
      </motion.div>
      
      {/* Partículas na barra de progresso */}
      {isAnimating && (
        <div className="absolute inset-0">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: 0, 
                y: Math.random() * 16,
                opacity: 0 
              }}
              animate={{ 
                x: progress * 3, 
                opacity: [0, 1, 0] 
              }}
              transition={{ 
                duration: 1, 
                delay: i * 0.2,
                ease: "easeOut"
              }}
              className="absolute w-1 h-1 bg-white rounded-full"
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FloatingRankBadgeProps {
  rank: RankLevel;
  isFloating?: boolean;
}

export const FloatingRankBadge: React.FC<FloatingRankBadgeProps> = ({
  rank,
  isFloating = true
}) => {
  return (
    <motion.div
      animate={isFloating ? { 
        y: [0, -10, 0],
        scale: [1, 1.05, 1]
      } : {}}
      transition={isFloating ? { 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" 
      } : {}}
      className={`inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r ${getRankGradient(rank)} text-white font-bold ${medievalTheme.effects.shadows.glow}`}
    >
      <span className="text-xl mr-2">{getRankIcon(rank)}</span>
      <span>{rank}</span>
    </motion.div>
  );
};