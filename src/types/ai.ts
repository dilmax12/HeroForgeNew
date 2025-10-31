export type AIProvider = 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  imageModel?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AITextRequest {
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  systemMessage?: string;
}

export interface AITextResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface AIImageRequest {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface AIImageResponse {
  url: string;
  revisedPrompt?: string;
  size: string;
  model: string;
  provider: AIProvider;
}

export interface StoryGenerationRequest {
  heroName: string;
  heroClass: string;
  heroRace: string;
  heroLevel: number;
  dominantAttribute: string;
  background?: string;
  recentAchievements?: string[];
  questHistory?: string[];
  personalityTraits?: string[];
}

export interface MissionGenerationRequest {
  heroLevel: number;
  heroClass: string;
  heroRace: string;
  difficulty: 'facil' | 'normal' | 'dificil' | 'epica';
  missionType: 'combat' | 'exploration' | 'social' | 'narrative';
  context?: string;
  previousChoices?: string[];
}

export interface NPCDialogueRequest {
  npcName: string;
  npcRole: string;
  heroName: string;
  heroClass: string;
  context: string;
  mood?: 'friendly' | 'neutral' | 'hostile' | 'mysterious';
  previousInteractions?: string[];
}

export interface AIRecommendationRequest {
  heroId: string;
  heroLevel: number;
  heroClass: string;
  completedQuests: string[];
  currentEquipment: string[];
  availableGold: number;
  recentActivity: string[];
  recommendationType: 'quest' | 'equipment' | 'strategy' | 'progression';
}

export interface AICache {
  key: string;
  response: AITextResponse | AIImageResponse;
  timestamp: number;
  expiresAt: number;
}

export interface AIError {
  code: string;
  message: string;
  provider: AIProvider;
  retryable: boolean;
}

export interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  requestsByType: Record<string, number>;
  averageResponseTime: number;
  errorRate: number;
}