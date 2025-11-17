import { OnboardingFlow, OnboardingStep } from '../types/onboarding';

export const ONBOARDING_FLOWS: OnboardingFlow[] = [
  {
    id: 'first-steps',
    name: 'Primeiros Passos',
    description: 'Aprenda o básico do HeroForge',
    category: 'beginner',
    steps: [
      {
        id: 'welcome',
        title: 'Bem-vindo ao HeroForge! 🎮',
        description: 'Vamos começar sua jornada épica!',
        content: 'O HeroForge é um sistema de gamificação que transforma suas tarefas diárias em aventuras épicas. Você criará heróis, completará missões e evoluirá suas habilidades!',
        position: 'center',
        skippable: true,
        autoAdvance: false
      },
      {
        id: 'create-hero',
        title: 'Crie seu Primeiro Herói',
        description: 'Todo aventureiro precisa de um herói!',
        content: 'Clique no botão "Criar Herói" para começar. Escolha um nome épico e uma classe que combine com você!',
        targetElement: '[data-testid="create-hero-button"]',
        position: 'bottom',
        action: {
          type: 'navigate',
          target: '/heroes/new'
        },
        validation: {
          type: 'hero-created'
        },
        rewards: {
          xp: 50,
          gold: 100
        }
      },
      {
        id: 'hero-overview',
        title: 'Conheça seu Herói',
        description: 'Vamos explorar as informações do seu herói',
        content: 'Aqui você pode ver o nível, experiência, ouro e estatísticas do seu herói. Essas informações são atualizadas conforme você completa missões!',
        targetElement: '[data-testid="hero-stats"]',
        position: 'right',
        autoAdvance: true
      },
      {
        id: 'first-quest',
        title: 'Sua Primeira Missão',
        description: 'Hora de começar a aventura!',
        content: 'Vamos ao Quadro de Missões para aceitar sua primeira quest. Clique no ícone de pergaminho na navegação rápida!',
        targetElement: '[data-testid="quick-nav-quests"]',
        position: 'top',
        action: {
          type: 'navigate',
          target: '/quests'
        }
      },
      {
        id: 'accept-quest',
        title: 'Aceite uma Missão',
        description: 'Escolha uma missão adequada ao seu nível',
        content: 'Procure por missões com dificuldade "Fácil" ou "Normal". Clique em "Aceitar Missão" para adicioná-la às suas missões ativas!',
        targetElement: '[data-testid="quest-card"]',
        position: 'left',
        validation: {
          type: 'quest-accepted'
        },
        rewards: {
          xp: 25
        }
      },
      {
        id: 'daily-goals',
        title: 'Metas Diárias',
        description: 'Ganhe bônus extras todos os dias!',
        content: 'As metas diárias oferecem recompensas especiais. Complete-as para ganhar XP e ouro extras! Acesse através da navegação rápida.',
        targetElement: '[data-testid="quick-nav-daily-goals"]',
        position: 'top',
        action: {
          type: 'navigate',
          target: '/daily-goals'
        }
      },
      {
        id: 'tutorial-complete',
        title: 'Tutorial Concluído! 🎉',
        description: 'Você está pronto para a aventura!',
        content: 'Parabéns! Você aprendeu o básico do HeroForge. Continue completando missões, evoluindo seu herói e desbloqueando novos recursos!',
        position: 'center',
        rewards: {
          xp: 100,
          gold: 200,
          items: ['potion_health', 'scroll_wisdom']
        }
      }
    ]
  },
  {
    id: 'advanced-features',
    name: 'Recursos Avançados',
    description: 'Explore funcionalidades avançadas',
    category: 'intermediate',
    prerequisites: ['first-steps'],
    steps: [
      {
        id: 'guild-system',
        title: 'Guilda dos Aventureiros',
        description: 'Una-se a outros heróis!',
        content: 'A Guilda dos Aventureiros é o hub para colaborar, compartilhar missões e competir em rankings especiais.',
        targetElement: '[data-testid="quick-nav-guilds"]',
        position: 'top',
        action: {
          type: 'navigate',
          target: '/guild-hub'
        }
      },
      {
        id: 'equipment-system',
        title: 'Sistema de Equipamentos',
        description: 'Melhore suas estatísticas!',
        content: 'Visite a loja para comprar armas, armaduras e acessórios. Equipamentos melhoram suas estatísticas e eficiência em missões.',
        targetElement: '[data-testid="hero-equipment"]',
        position: 'right'
      },
      {
        id: 'achievements',
        title: 'Sistema de Conquistas',
        description: 'Desbloqueie títulos especiais!',
        content: 'Complete desafios específicos para ganhar conquistas e títulos únicos. Alguns títulos oferecem bônus permanentes!',
        targetElement: '[data-testid="achievements-tab"]',
        position: 'bottom'
      },
      {
        id: 'leaderboards',
        title: 'Rankings Globais',
        description: 'Compete com outros heróis!',
        content: 'Veja como você se compara a outros jogadores em diferentes categorias: XP, ouro, missões completadas e muito mais!',
        targetElement: '[data-testid="quick-nav-leaderboards"]',
        position: 'top',
        action: {
          type: 'navigate',
          target: '/leaderboards'
        }
      }
    ]
  },
  {
    id: 'power-user',
    name: 'Usuário Avançado',
    description: 'Domine todas as funcionalidades',
    category: 'advanced',
    prerequisites: ['first-steps', 'advanced-features'],
    steps: [
      {
        id: 'narrative-quests',
        title: 'Missões Narrativas',
        description: 'Experiências imersivas!',
        content: 'As missões narrativas oferecem histórias envolventes com múltiplas escolhas e consequências. Cada decisão afeta o resultado!',
        targetElement: '[data-testid="narrative-quests-tab"]',
        position: 'bottom'
      },
      {
        id: 'reputation-system',
        title: 'Sistema de Reputação',
        description: 'Construa relacionamentos!',
        content: 'Sua reputação com diferentes facções afeta as missões disponíveis e recompensas. Escolha suas alianças sabiamente!',
        targetElement: '[data-testid="reputation-tab"]',
        position: 'right'
      },
      {
        id: 'advanced-strategies',
        title: 'Estratégias Avançadas',
        description: 'Otimize sua progressão!',
        content: 'Combine equipamentos, planeje suas missões diárias e use consumíveis estrategicamente para maximizar seus ganhos!',
        position: 'center'
      }
    ]
  }
];

export class OnboardingManager {
  private static instance: OnboardingManager;
  private currentFlow?: OnboardingFlow;
  private currentStepIndex: number = 0;
  private completedFlows: Set<string> = new Set();
  private completedSteps: Set<string> = new Set();
  private isActive: boolean = false;
  private callbacks: Map<string, Function[]> = new Map();
  private validatedSteps: Set<string> = new Set();

  static getInstance(): OnboardingManager {
    if (!OnboardingManager.instance) {
      OnboardingManager.instance = new OnboardingManager();
    }
    return OnboardingManager.instance;
  }

  startFlow(flowId: string): boolean {
    const flow = ONBOARDING_FLOWS.find(f => f.id === flowId);
    if (!flow) return false;

    // Check prerequisites
    if (flow.prerequisites) {
      const hasPrerequisites = flow.prerequisites.every(prereq => 
        this.completedFlows.has(prereq)
      );
      if (!hasPrerequisites) return false;
    }

    this.currentFlow = flow;
    this.currentStepIndex = 0;
    this.isActive = true;
    this.emit('flow-started', { flow });
    this.emit('step-changed', { step: this.getCurrentStep() });
    this.saveState();
    return true;
  }

  getCurrentStep(): OnboardingStep | null {
    if (!this.currentFlow || !this.isActive) return null;
    return this.currentFlow.steps[this.currentStepIndex] || null;
  }

  nextStep(): boolean {
    if (!this.currentFlow || !this.isActive) return false;

    const currentStep = this.getCurrentStep();
    if (currentStep) {
      if (currentStep.validation) {
        const ok = this.isStepValidated(currentStep.id);
        if (!ok) {
          this.emit('validation-required', { step: currentStep });
          return false;
        }
      }
      this.markStepCompleted(currentStep.id);
      this.emit('step-completed', { step: currentStep });
    }

    this.currentStepIndex++;
    
    if (this.currentStepIndex >= this.currentFlow.steps.length) {
      this.completeFlow();
      return false;
    }

    this.emit('step-changed', { step: this.getCurrentStep() });
    this.saveState();
    return true;
  }

  previousStep(): boolean {
    if (!this.currentFlow || !this.isActive || this.currentStepIndex <= 0) return false;
    
    this.currentStepIndex--;
    this.emit('step-changed', { step: this.getCurrentStep() });
    this.saveState();
    return true;
  }

  skipStep(): boolean {
    const currentStep = this.getCurrentStep();
    if (!currentStep || !currentStep.skippable) return false;
    
    const moved = this.nextStep();
    if (moved) this.saveState();
    return moved;
  }

  completeFlow(): void {
    if (!this.currentFlow) return;

    this.completedFlows.add(this.currentFlow.id);
    this.emit('flow-completed', { flow: this.currentFlow });
    this.reset();
    this.saveState();
  }

  reset(): void {
    this.currentFlow = undefined;
    this.currentStepIndex = 0;
    this.isActive = false;
    this.emit('onboarding-reset');
    this.saveState();
  }

  markStepCompleted(stepId: string): void {
    this.completedSteps.add(stepId);
    this.saveState();
  }

  isStepCompleted(stepId: string): boolean {
    return this.completedSteps.has(stepId);
  }

  markStepValidated(stepId: string): void {
    this.validatedSteps.add(stepId);
    this.emit('step-validated', { stepId });
    this.saveState();
  }

  isStepValidated(stepId: string): boolean {
    return this.validatedSteps.has(stepId);
  }

  isFlowCompleted(flowId: string): boolean {
    return this.completedFlows.has(flowId);
  }

  getAvailableFlows(): OnboardingFlow[] {
    return ONBOARDING_FLOWS.filter(flow => {
      if (this.isFlowCompleted(flow.id)) return false;
      
      if (flow.prerequisites) {
        return flow.prerequisites.every(prereq => this.isFlowCompleted(prereq));
      }
      
      return true;
    });
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    const totalSteps = ONBOARDING_FLOWS.reduce((sum, flow) => sum + flow.steps.length, 0);
    const completedSteps = this.completedSteps.size;
    
    return {
      completed: completedSteps,
      total: totalSteps,
      percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
    };
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Persistence
  saveState(): void {
    const state = {
      completedFlows: Array.from(this.completedFlows),
      completedSteps: Array.from(this.completedSteps),
      validatedSteps: Array.from(this.validatedSteps),
      currentFlow: this.currentFlow?.id,
      currentStepIndex: this.currentStepIndex,
      isActive: this.isActive
    };
    localStorage.setItem('heroforge-onboarding', JSON.stringify(state));
  }

  loadState(): void {
    const saved = localStorage.getItem('heroforge-onboarding');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.completedFlows = new Set(state.completedFlows || []);
        this.completedSteps = new Set(state.completedSteps || []);
        this.validatedSteps = new Set(state.validatedSteps || []);
        this.currentStepIndex = state.currentStepIndex || 0;
        this.isActive = state.isActive || false;
        
        if (state.currentFlow && this.isActive) {
          this.currentFlow = ONBOARDING_FLOWS.find(f => f.id === state.currentFlow);
        }
      } catch (error) {
        console.error('Failed to load onboarding state:', error);
      }
    }
  }
}

export const onboardingManager = OnboardingManager.getInstance();
