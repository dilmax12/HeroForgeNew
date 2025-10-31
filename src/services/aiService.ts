import {
  AIConfig,
  AIProvider,
  AITextRequest,
  AITextResponse,
  AIImageRequest,
  AIImageResponse,
  AIError as AIErrorInterface,
  AICache,
  AIUsageStats
} from '../types/ai';

class AIError extends Error implements AIErrorInterface {
  code: string;
  provider: AIProvider;
  retryable: boolean;

  constructor(error: AIErrorInterface) {
    super(error.message);
    this.name = 'AIError';
    this.code = error.code;
    this.provider = error.provider;
    this.retryable = error.retryable;
  }
}

class AIService {
  private config: AIConfig;
  private cache: Map<string, AICache> = new Map();
  private usageStats: AIUsageStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    requestsByType: {},
    averageResponseTime: 0,
    errorRate: 0
  };

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AIConfig {
    const provider = (import.meta.env.VITE_AI_SERVICE_PROVIDER || 'openai') as AIProvider;
    const apiKey = provider === 'openai' 
      ? import.meta.env.VITE_OPENAI_API_KEY 
      : import.meta.env.VITE_ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for provider: ${provider}`);
    }

    return {
      provider,
      apiKey,
      model: import.meta.env.VITE_AI_MODEL || (provider === 'openai' ? 'gpt-4' : 'claude-3-sonnet-20240229'),
      imageModel: import.meta.env.VITE_AI_IMAGE_MODEL || 'dall-e-3',
      baseURL: provider === 'openai' 
        ? import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1'
        : import.meta.env.VITE_ANTHROPIC_API_URL || 'https://api.anthropic.com/v1',
      maxTokens: 2000,
      temperature: 0.7
    };
  }

  private generateCacheKey(request: AITextRequest | AIImageRequest): string {
    return btoa(JSON.stringify(request)).replace(/[/+=]/g, '');
  }

  private isValidCache(cache: AICache): boolean {
    return Date.now() < cache.expiresAt;
  }

  private async makeOpenAITextRequest(request: AITextRequest): Promise<AITextResponse> {
    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          ...(request.systemMessage ? [{ role: 'system', content: request.systemMessage }] : []),
          ...(request.context ? [{ role: 'user', content: request.context }] : []),
          { role: 'user', content: request.prompt }
        ],
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature || this.config.temperature
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AIError({
        code: error.error?.code || 'unknown_error',
        message: error.error?.message || 'Unknown error occurred',
        provider: 'openai',
        retryable: response.status >= 500
      });
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      usage: data.usage,
      model: data.model,
      provider: 'openai'
    };
  }

  private async makeAnthropicTextRequest(request: AITextRequest): Promise<AITextResponse> {
    const response = await fetch(`${this.config.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature || this.config.temperature,
        system: request.systemMessage,
        messages: [
          ...(request.context ? [{ role: 'user', content: request.context }] : []),
          { role: 'user', content: request.prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AIError({
        code: error.error?.type || 'unknown_error',
        message: error.error?.message || 'Unknown error occurred',
        provider: 'anthropic',
        retryable: response.status >= 500
      });
    }

    const data = await response.json();
    return {
      text: data.content[0].text,
      usage: data.usage,
      model: data.model,
      provider: 'anthropic'
    };
  }

  private async makeOpenAIImageRequest(request: AIImageRequest): Promise<AIImageResponse> {
    const response = await fetch(`${this.config.baseURL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.imageModel,
        prompt: request.prompt,
        size: request.size || '1024x1024',
        quality: request.quality || 'standard',
        style: request.style || 'vivid',
        n: request.n || 1
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AIError({
        code: error.error?.code || 'unknown_error',
        message: error.error?.message || 'Unknown error occurred',
        provider: 'openai',
        retryable: response.status >= 500
      });
    }

    const data = await response.json();
    return {
      url: data.data[0].url,
      revisedPrompt: data.data[0].revised_prompt,
      size: request.size || '1024x1024',
      model: this.config.imageModel!,
      provider: 'openai'
    };
  }

  async generateText(request: AITextRequest): Promise<AITextResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    if (import.meta.env.VITE_AI_CACHE_ENABLED === 'true') {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isValidCache(cached)) {
        return cached.response as AITextResponse;
      }
    }

    try {
      let response: AITextResponse;

      if (this.config.provider === 'openai') {
        response = await this.makeOpenAITextRequest(request);
      } else {
        response = await this.makeAnthropicTextRequest(request);
      }

      // Update usage stats
      this.updateUsageStats(startTime, response.usage?.totalTokens || 0, 'text');

      // Cache the response
      if (import.meta.env.VITE_AI_CACHE_ENABLED === 'true') {
        this.cache.set(cacheKey, {
          key: cacheKey,
          response,
          timestamp: Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        });
      }

      return response;
    } catch (error) {
      this.usageStats.errorRate++;
      throw error;
    }
  }

  async generateImage(request: AIImageRequest): Promise<AIImageResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    if (import.meta.env.VITE_AI_CACHE_ENABLED === 'true') {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isValidCache(cached)) {
        return cached.response as AIImageResponse;
      }
    }

    try {
      let response: AIImageResponse;

      if (this.config.provider === 'openai') {
        response = await this.makeOpenAIImageRequest(request);
      } else {
        throw new Error('Image generation not supported for Anthropic');
      }

      // Update usage stats
      this.updateUsageStats(startTime, 0, 'image');

      // Cache the response
      if (import.meta.env.VITE_AI_CACHE_ENABLED === 'true') {
        this.cache.set(cacheKey, {
          key: cacheKey,
          response,
          timestamp: Date.now(),
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        });
      }

      return response;
    } catch (error) {
      this.usageStats.errorRate++;
      throw error;
    }
  }

  private updateUsageStats(startTime: number, tokens: number, type: string): void {
    const responseTime = Date.now() - startTime;
    
    this.usageStats.totalRequests++;
    this.usageStats.totalTokens += tokens;
    this.usageStats.requestsByType[type] = (this.usageStats.requestsByType[type] || 0) + 1;
    
    // Update average response time
    this.usageStats.averageResponseTime = 
      (this.usageStats.averageResponseTime * (this.usageStats.totalRequests - 1) + responseTime) / 
      this.usageStats.totalRequests;
  }

  getUsageStats(): AIUsageStats {
    return { ...this.usageStats };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  getProvider(): AIProvider {
    return this.config.provider;
  }
}

// Singleton instance
export const aiService = new AIService();