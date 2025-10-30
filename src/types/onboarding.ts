export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: string;
  targetElement?: string; // CSS selector for highlighting
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    type: 'click' | 'navigate' | 'wait' | 'input';
    target?: string;
    value?: string;
    delay?: number;
  };
  validation?: {
    type: 'element-exists' | 'hero-created' | 'quest-accepted' | 'custom';
    condition?: () => boolean;
  };
  rewards?: {
    xp?: number;
    gold?: number;
    items?: string[];
  };
  skippable?: boolean;
  autoAdvance?: boolean;
}

export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  prerequisites?: string[];
  category: 'beginner' | 'intermediate' | 'advanced';
}

export interface OnboardingState {
  currentFlow?: string;
  currentStep: number;
  completedFlows: string[];
  completedSteps: string[];
  isActive: boolean;
  showHints: boolean;
  skipTutorials: boolean;
}

export interface OnboardingProgress {
  flowId: string;
  stepId: string;
  completed: boolean;
  timestamp: number;
  timeSpent?: number;
}