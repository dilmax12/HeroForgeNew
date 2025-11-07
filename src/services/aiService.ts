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
    const provider = (import.meta.env.VITE_AI_SERVICE_PROVIDER || 'groq') as AIProvider;

    if (provider === 'huggingface') {
      return {
        provider,
        apiKey: '',
        model: import.meta.env.VITE_AI_MODEL || 'HuggingFaceH4/zephyr-7b-beta',
        imageModel: import.meta.env.VITE_AI_IMAGE_MODEL || 'stabilityai/sd-turbo',
        baseURL: '/api/hf-text',
        maxTokens: 1500,
        temperature: 0.7
      };
    }

    // Groq - OpenAI-compatible API
    if (provider === 'groq') {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
      const baseURL = import.meta.env.VITE_GROQ_PROXY_URL || '/api/groq-chat';

      if (!apiKey) {
        console.warn('GROQ API key not found. AI features will be disabled.');
        return {
          provider,
          apiKey: '',
          apiUrl: baseURL,
          model: import.meta.env.VITE_AI_MODEL || 'llama-3.1-8b-instant',
          maxTokens: 1500,
          temperature: 0.7,
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000
        } as any;
      }

      return {
        provider,
        apiKey,
        model: import.meta.env.VITE_AI_MODEL || 'llama-3.1-8b-instant',
        imageModel: import.meta.env.VITE_AI_IMAGE_MODEL || 'stabilityai/sd-turbo',
        baseURL,
        maxTokens: 2000,
        temperature: 0.7
      };
    }

    const apiKey = provider === 'openai'
      ? import.meta.env.VITE_OPENAI_API_KEY
      : import.meta.env.VITE_ANTHROPIC_API_KEY;

    // Em produção sem chaves, retornar configuração padrão sem falhar
    if (!apiKey) {
      console.warn(`API key not found for provider: ${provider}. AI features will be disabled.`);
      return {
        provider,
        apiKey: '',
        apiUrl: '',
        model: provider === 'openai' ? 'gpt-3.5-turbo' : 'claude-3-sonnet-20240229',
        maxTokens: 1000,
        temperature: 0.7,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
      } as any;
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
    // Usa hash simples para evitar problemas de Unicode com btoa
    const str = JSON.stringify(request);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // converte para inteiro 32-bit
    }
    return `k${Math.abs(hash).toString(36)}`;
  }

  private isValidCache(cache: AICache): boolean {
    return Date.now() < cache.expiresAt;
  }

  private async makeOpenAITextRequest(request: AITextRequest): Promise<AITextResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    // Somente inclui Authorization se houver chave no cliente
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const base = this.config.baseURL || '';
    let endpoint = `${base}/chat/completions`;
    if (typeof base === 'string' && base.startsWith('/api/')) {
      // Suporte a dois proxies: /api/groq-chat (POST direto) e /api/groq-openai (OpenAI path)
      endpoint = base.includes('groq-chat') ? base : `${base}/chat/completions`;
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
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

  private async makeHuggingFaceTextRequest(request: AITextRequest): Promise<AITextResponse> {
    const response = await fetch(this.config.baseURL || '/api/hf-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: request.prompt,
        systemMessage: request.systemMessage,
        maxTokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature || this.config.temperature
      })
    });

    const textRaw = await response.text();
    let data: any = { text: '' };
    try { data = JSON.parse(textRaw); } catch { data = { text: textRaw }; }
    if (!response.ok) {
      const errObj = data?.error ?? data;
      const errMsg = typeof errObj === 'string' ? errObj : (errObj?.message || 'Erro ao gerar com Hugging Face');
      throw new AIError({
        code: 'hf_error',
        message: errMsg,
        provider: 'huggingface',
        retryable: response.status >= 500
      });
    }

    return {
      text: data.text || '',
      usage: undefined,
      model: this.config.model,
      provider: 'huggingface'
    } as any;
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

  private async makeHuggingFaceImageRequest(request: AIImageRequest): Promise<AIImageResponse> {
    const response = await fetch('/api/gerar-imagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: request.prompt })
    });

    const data = await response.json().catch(() => ({ imagem: '' }));
    if (!response.ok) {
      throw new AIError({
        code: 'hf_image_error',
        message: data?.error || 'Erro ao gerar imagem no Hugging Face',
        provider: 'huggingface',
        retryable: response.status >= 500
      });
    }

    let imageUrl = data.imagem || '';
    // Se o backend retornou placeholder SVG ou vazio, tentar fallback gratuito Lexica
    if (!imageUrl || (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/svg+xml'))) {
      try {
        const res2 = await fetch(`/api/hero-image?prompt=${encodeURIComponent(request.prompt)}`, { method: 'GET' });
        const data2 = await res2.json().catch(() => ({ image: '' }));
        if (res2.ok && typeof data2?.image === 'string' && data2.image.length > 0) {
          imageUrl = data2.image;
        }
      } catch (_) {
        // Ignorar e manter placeholder
      }
      // Fallback gratuito adicional: Pollinations
      if (!imageUrl || (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/svg+xml'))) {
        imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(request.prompt)}?n=1&size=${encodeURIComponent(request.size || '512x512')}`;
      }
    }

    return {
      url: imageUrl,
      revisedPrompt: request.prompt,
      size: request.size || '512x512',
      model: this.config.imageModel || 'stabilityai/sd-turbo',
      provider: 'huggingface'
    } as any;
  }

  async generateText(request: AITextRequest): Promise<AITextResponse> {
    // Verificar se o serviço está configurado
    if (!this.isConfigured()) {
      return {
        text: 'AI service is not configured. Please check your API keys.',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: this.config.model,
        provider: this.config.provider,
        finishReason: 'stop'
      };
    }

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
      } else if (this.config.provider === 'groq') {
        // Groq usa API compatível com OpenAI
        response = await this.makeOpenAITextRequest(request);
      } else if (this.config.provider === 'anthropic') {
        response = await this.makeAnthropicTextRequest(request);
      } else {
        response = await this.makeHuggingFaceTextRequest(request);
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
    // Verificar se o serviço está configurado
    if (!this.isConfigured()) {
      return {
        url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFJIE5vdCBDb25maWd1cmVkPC90ZXh0Pjwvc3ZnPg==',
        revisedPrompt: request.prompt,
        size: request.size || '1024x1024',
        model: this.config.imageModel || 'stabilityai/sd-turbo',
        provider: this.config.provider
      };
    }

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
        // Para Groq (ou qualquer outro), use o backend Hugging Face para geração de imagem
        response = await this.makeHuggingFaceImageRequest(request);
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
    // Hugging Face usa exclusivamente rotas backend; não requer chave no cliente
    if (this.config.provider === 'huggingface') return true;

    // Groq via proxy serverless (baseURL relativo) também não requer chave no cliente
    if (this.config.provider === 'groq') {
      const isProxy = typeof this.config.baseURL === 'string' && this.config.baseURL.startsWith('/api/');
      return isProxy || !!this.config.apiKey;
    }

    // OpenAI/Anthropic requerem chave no cliente
    return !!this.config.apiKey;
  }

  getProvider(): AIProvider {
    return this.config.provider;
  }
}

// Singleton instance
export const aiService = new AIService();
