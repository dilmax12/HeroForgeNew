import React, { useState } from 'react';
import { Hero, HeroClass, Element } from '../types/hero';
import { ELEMENT_INFO } from '../utils/elementSystem';
import { getRankIcon } from '../styles/medievalTheme';
import { useHeroStore } from '../store/heroStore';
import { Eye, Star, Shield, Sword, Wand2, Target, Heart, UserX, Crown, Edit, Camera } from 'lucide-react';

interface HeroGalleryCardProps {
  hero: Hero;
  onClick?: () => void;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  onEdit?: (hero: Hero) => void;
  onImageChange?: (hero: Hero) => void;
}

// Mapeamento de classes para ícones
const CLASS_ICONS: Record<HeroClass, React.ReactNode> = {
  guerreiro: <Sword className="w-4 h-4" />,
  mago: <Wand2 className="w-4 h-4" />,
  ladino: <UserX className="w-4 h-4" />,
  clerigo: <Heart className="w-4 h-4" />,
  patrulheiro: <Target className="w-4 h-4" />,
  paladino: <Crown className="w-4 h-4" />,
  arqueiro: <Target className="w-4 h-4" />
};

// Gradientes baseados nos elementos
const ELEMENT_GRADIENTS: Record<Element, string> = {
  fire: 'from-red-900/20 via-orange-800/30 to-yellow-700/20',
  ice: 'from-blue-900/20 via-cyan-800/30 to-blue-700/20',
  thunder: 'from-purple-900/20 via-yellow-800/30 to-blue-700/20',
  earth: 'from-green-900/20 via-brown-800/30 to-green-700/20',
  light: 'from-yellow-900/20 via-white/30 to-yellow-700/20',
  dark: 'from-purple-900/20 via-gray-800/30 to-black/20',
  physical: 'from-gray-900/20 via-slate-800/30 to-gray-700/20'
};

// Cores dos elementos para bordas e acentos
const ELEMENT_COLORS: Record<Element, string> = {
  fire: 'border-red-500/50 shadow-red-500/20',
  ice: 'border-blue-500/50 shadow-blue-500/20',
  thunder: 'border-yellow-500/50 shadow-yellow-500/20',
  earth: 'border-green-500/50 shadow-green-500/20',
  light: 'border-yellow-400/50 shadow-yellow-400/20',
  dark: 'border-purple-500/50 shadow-purple-500/20',
  physical: 'border-gray-500/50 shadow-gray-500/20'
};

export const HeroGalleryCard: React.FC<HeroGalleryCardProps> = ({
  hero,
  onClick,
  showDetails = true,
  size = 'medium',
  onEdit,
  onImageChange
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { selectHero, getSelectedHero } = useHeroStore();
  const selectedHero = getSelectedHero();

  const isSelected = selectedHero?.id === hero.id;
  const elementInfo = ELEMENT_INFO[hero.element];

  // Tamanhos baseados na prop size
  const sizeClasses = {
    small: 'w-48 h-64',
    medium: 'w-56 h-72',
    large: 'w-64 h-80'
  };

  const handleCardClick = () => {
    selectHero(hero.id);
    onClick?.();
  };

  const generateAIPrompt = () => {
    const classPrompts = {
      guerreiro: 'heroic warrior with detailed armor',
      mago: 'wise sorcerer with mystical robes',
      ladino: 'stealthy rogue with dark clothing',
      clerigo: 'holy cleric with sacred vestments',
      patrulheiro: 'skilled ranger with nature-themed gear',
      paladino: 'noble paladin with shining armor',
      arqueiro: 'agile archer with elegant bow'
    };

    const elementPrompts = {
      fire: 'surrounded by flames and ember effects, warm orange lighting',
      ice: 'with frost and ice crystals, cool blue atmosphere',
      thunder: 'with lightning and electric energy, dynamic blue-yellow glow',
      earth: 'with stone and nature elements, earthy brown-green tones',
      light: 'bathed in radiant holy light, golden divine atmosphere',
      dark: 'shrouded in shadows and dark energy, purple-black aura',
      physical: 'with metallic armor and weapons, neutral lighting'
    };

    return `Medieval fantasy hero card design, half-body portrait of a ${classPrompts[hero.class]} ${elementPrompts[hero.element]}, inside a golden runic frame, parchment background with soft magical effects, elegant minimal UI, cinematic lighting, digital art, immersive and atmospheric style.`;
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        relative group cursor-pointer
        transform transition-all duration-300 ease-out
        ${isHovered ? 'scale-105 -translate-y-2' : ''}
        ${isSelected ? 'ring-2 ring-yellow-400 ring-opacity-60' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Moldura Externa com Runas */}
      <div className={`
        absolute inset-0 rounded-lg
        bg-gradient-to-br from-yellow-600/20 via-amber-700/30 to-yellow-800/20
        border-2 ${ELEMENT_COLORS[hero.element]}
        shadow-lg ${isHovered ? 'shadow-xl shadow-yellow-500/30' : ''}
        transition-all duration-300
      `}>
        {/* Runas nos Cantos */}
        <div className="absolute top-2 left-2 text-yellow-400/60 text-xs">⚜</div>
        <div className="absolute top-2 right-2 text-yellow-400/60 text-xs">⚜</div>
        <div className="absolute bottom-2 left-2 text-yellow-400/60 text-xs">⚜</div>
        <div className="absolute bottom-2 right-2 text-yellow-400/60 text-xs">⚜</div>
      </div>

      {/* Fundo de Pergaminho com Efeito Elemental */}
      <div className={`
        absolute inset-1 rounded-md
        bg-gradient-to-br ${ELEMENT_GRADIENTS[hero.element]}
        backdrop-blur-sm
      `}>
        {/* Textura de Pergaminho */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/10 via-yellow-100/5 to-amber-200/10 rounded-md" />
        
        {/* Partículas Mágicas */}
        {isHovered && (
          <div className="absolute inset-0 overflow-hidden rounded-md">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-pulse opacity-60" />
            <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-yellow-400 rounded-full animate-pulse opacity-40 animation-delay-300" />
            <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-yellow-400 rounded-full animate-pulse opacity-50 animation-delay-600" />
          </div>
        )}
      </div>

      {/* Área do Retrato */}
      <div className="relative h-3/4 p-3">
        <div className="relative h-full rounded-md overflow-hidden">
          {/* Placeholder ou Imagem do Herói */}
          {hero.image && !imageError ? (
            <img
              src={hero.image}
              alt={hero.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`
              w-full h-full flex items-center justify-center
              bg-gradient-to-br ${ELEMENT_GRADIENTS[hero.element]}
              text-6xl
            `}>
              {CLASS_ICONS[hero.class] || '🦸'}
            </div>
          )}

          {/* Brilho Mágico ao Redor do Personagem */}
          <div className={`
            absolute inset-0 
            bg-gradient-to-t from-transparent via-transparent to-yellow-400/10
            ${isHovered ? 'opacity-100' : 'opacity-0'}
            transition-opacity duration-300
          `} />

          {/* Rank Badge no Canto Superior Direito */}
          <div className="absolute top-2 right-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-yellow-400 font-bold">
              {getRankIcon(hero.progression?.rank || 'F')} {hero.progression?.rank || 'F'}
            </div>
          </div>

          {/* Nível no Canto Superior Esquerdo */}
          <div className="absolute top-2 left-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-white font-bold">
              Nv. {hero.progression?.level || 1}
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Informações Inferior */}
      <div className="absolute bottom-2 left-2 right-2 h-1/3 z-40">
        <div className="h-full bg-black/80 backdrop-blur-md rounded-md border border-yellow-500/30 p-3 flex flex-col justify-between shadow-lg">
          {/* Nome do Herói - Área Superior */}
          <div className="flex-shrink-0">
            <h3 className="text-white font-bold text-lg truncate font-serif leading-tight drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,1)' }}>
              {hero.name || 'Nome não definido'}
            </h3>
          </div>

          {/* Informações Inferiores */}
          <div className="flex flex-col space-y-1 flex-shrink-0">
            {/* Classe e Elemento */}
            <div className="flex items-center justify-between text-sm text-gray-300">
              <div className="flex items-center space-x-1 min-w-0 flex-1">
                {CLASS_ICONS[hero.class]}
                <span className="capitalize truncate">{hero.class}</span>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <span className="text-base">{elementInfo.icon}</span>
              </div>
            </div>

            {/* Raça e XP */}
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span className="capitalize truncate">{hero.race}</span>
              <span className="text-sm whitespace-nowrap">{hero.progression?.xp || 0} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Ações (aparece no hover) */}
      {showDetails && isHovered && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg z-50">
          <div className="flex flex-col space-y-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClick?.();
              }}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 rounded-md font-bold text-xs transition-colors duration-200 flex items-center space-x-2"
            >
              <Eye className="w-3 h-3" />
              <span>Ver Detalhes</span>
            </button>
            
            {onEdit && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(hero);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-md font-bold text-xs transition-colors duration-200 flex items-center space-x-2"
              >
                <Edit className="w-3 h-3" />
                <span>Editar</span>
              </button>
            )}
            
            {onImageChange && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onImageChange(hero);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-md font-bold text-xs transition-colors duration-200 flex items-center space-x-2"
              >
                <Camera className="w-3 h-3" />
                <span>Trocar Foto</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Indicador de Seleção */}
      {isSelected && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-yellow-500 text-white rounded-full p-1">
            <Star className="w-4 h-4 fill-current" />
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroGalleryCard;