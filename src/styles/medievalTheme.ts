// Tema Medieval Moderno - HeroForge v2.2
// Sistema de cores, gradientes e estilos temáticos

export const medievalTheme = {
  // Paleta de cores principal
  colors: {
    // Tons de ouro e âmbar (nobreza, conquistas)
    gold: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    
    // Tons de bronze e cobre (veteranos, experiência)
    bronze: {
      50: '#fdf8f6',
      100: '#f2e8e5',
      200: '#eaddd7',
      300: '#e0cfc5',
      400: '#d2bab0',
      500: '#bfa094',
      600: '#a18072',
      700: '#8b6f47',
      800: '#734a2e',
      900: '#5c3317'
    },
    
    // Tons de prata (elite, pureza)
    silver: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a'
    },
    
    // Tons de púrpura real (mestres, magia)
    royal: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87'
    },
    
    // Tons de vermelho carmesim (poder, força)
    crimson: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },
    
    // Tons de esmeralda (natureza, crescimento)
    emerald: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b'
    }
  },

  // Gradientes temáticos
  gradients: {
    ranks: {
      'Novato': 'from-slate-400 via-slate-500 to-slate-600',
      'Aprendiz': 'from-emerald-400 via-emerald-500 to-emerald-600',
      'Aventureiro': 'from-blue-400 via-blue-500 to-blue-600',
      'Veterano': 'from-bronze-400 via-bronze-500 to-bronze-600',
      'Elite': 'from-silver-400 via-silver-500 to-silver-600',
      'Mestre': 'from-royal-400 via-royal-500 to-royal-600',
      'Grão-Mestre': 'from-crimson-400 via-crimson-500 to-crimson-600',
      'Lenda': 'from-gold-300 via-gold-400 to-gold-500'
    },
    
    backgrounds: {
      primary: 'from-slate-900 via-slate-800 to-slate-900',
      secondary: 'from-slate-800 via-slate-700 to-slate-800',
      accent: 'from-gold-900/20 via-gold-800/10 to-transparent',
      hero: 'from-royal-900/30 via-royal-800/20 to-transparent',
      quest: 'from-emerald-900/30 via-emerald-800/20 to-transparent',
      combat: 'from-crimson-900/30 via-crimson-800/20 to-transparent'
    },
    
    buttons: {
      primary: 'from-gold-500 via-gold-600 to-gold-700',
      secondary: 'from-silver-500 via-silver-600 to-silver-700',
      success: 'from-emerald-500 via-emerald-600 to-emerald-700',
      danger: 'from-crimson-500 via-crimson-600 to-crimson-700',
      royal: 'from-royal-500 via-royal-600 to-royal-700'
    }
  },

  // Ícones temáticos por categoria
  icons: {
    ranks: {
      'Novato': '🌱',
      'Aprendiz': '⚔️',
      'Aventureiro': '🗡️',
      'Veterano': '🛡️',
      'Elite': '👑',
      'Mestre': '🏆',
      'Grão-Mestre': '💎',
      'Lenda': '⭐'
    },
    
    classes: {
      'Guerreiro': '⚔️',
      'Mago': '🔮',
      'Arqueiro': '🏹',
      'Ladino': '🗡️',
      'Paladino': '🛡️',
      'Bárbaro': '🪓',
      'Druida': '🌿',
      'Feiticeiro': '✨'
    },
    
    activities: {
      'quest-completed': '🎯',
      'epic-quest-completed': '🌟',
      'level-up': '📈',
      'achievement-unlocked': '🏆',
      'title-earned': '👑',
      'event-completed': '🎪',
      'daily-goal-completed': '✅',
      'combat-victory': '⚔️',
      'rank-promotion': '🏆'
    },
    
    ui: {
      close: '✕',
      menu: '☰',
      settings: '⚙️',
      profile: '👤',
      stats: '📊',
      inventory: '🎒',
      guild: '🏰',
      leaderboard: '🏆',
      calendar: '📅',
      notification: '🔔'
    }
  },

  // Efeitos visuais
  effects: {
    shadows: {
      small: 'shadow-lg shadow-black/25',
      medium: 'shadow-xl shadow-black/30',
      large: 'shadow-2xl shadow-black/40',
      glow: 'shadow-2xl shadow-gold-500/20',
      royal: 'shadow-2xl shadow-royal-500/20',
      crimson: 'shadow-2xl shadow-crimson-500/20'
    },
    
    borders: {
      gold: 'border border-gold-500/30',
      silver: 'border border-silver-500/30',
      royal: 'border border-royal-500/30',
      crimson: 'border border-crimson-500/30',
      emerald: 'border border-emerald-500/30'
    },
    
    animations: {
      float: 'animate-bounce',
      pulse: 'animate-pulse',
      spin: 'animate-spin',
      ping: 'animate-ping'
    }
  },

  // Tipografia temática
  typography: {
    fonts: {
      heading: 'font-bold tracking-wide',
      body: 'font-medium',
      accent: 'font-semibold tracking-wider uppercase'
    },
    
    sizes: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl'
    }
  },

  // Layouts e espaçamentos
  layout: {
    spacing: {
      xs: 'p-2',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-12'
    },
    
    rounded: {
      sm: 'rounded-md',
      md: 'rounded-lg',
      lg: 'rounded-xl',
      full: 'rounded-full'
    },
    
    containers: {
      card: 'bg-slate-800 rounded-lg border border-slate-700 shadow-xl',
      panel: 'bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-600 shadow-2xl',
      modal: 'bg-gradient-to-br from-slate-900 to-black rounded-2xl border border-slate-600 shadow-2xl'
    }
  }
};

// Funções utilitárias para o tema
export const getThemeColor = (category: keyof typeof medievalTheme.colors, shade: number = 500) => {
  return medievalTheme.colors[category]?.[shade as keyof typeof medievalTheme.colors[typeof category]] || '#64748b';
};

export const getRankGradient = (rank: string) => {
  return medievalTheme.gradients.ranks[rank as keyof typeof medievalTheme.gradients.ranks] || 'from-gray-400 to-gray-600';
};

export const getRankIcon = (rank: string) => {
  return medievalTheme.icons.ranks[rank as keyof typeof medievalTheme.icons.ranks] || '🎖️';
};

export const getClassIcon = (heroClass: string) => {
  return medievalTheme.icons.classes[heroClass as keyof typeof medievalTheme.icons.classes] || '⚔️';
};

export const getActivityIcon = (activityType: string) => {
  return medievalTheme.icons.activities[activityType as keyof typeof medievalTheme.icons.activities] || '🎮';
};