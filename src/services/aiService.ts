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
import { getCachedImage, setCachedImage } from '../utils/imageCache';

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

  private fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
    return fetch(input, { ...(init || {}), signal: controller.signal })
      .finally(() => clearTimeout(id));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
  }

  private parseRetrySeconds(messageOrHeader?: string | null): number | undefined {
    if (!messageOrHeader) return undefined;
    // Try standard Retry-After header (seconds)
    const asNumber = Number(messageOrHeader);
    if (!isNaN(asNumber) && asNumber > 0) return asNumber;
    // Try to parse "Please try again in Xs" pattern
    const match = messageOrHeader.match(/try again in\s*([\d.]+)s/i);
    if (match) {
      const secs = parseFloat(match[1]);
      if (!isNaN(secs) && secs > 0) return secs;
    }
    return undefined;
  }

  private loadConfig(): AIConfig {
    // Força configuração consistente: texto via Groq proxy backend e imagem via rota backend
    const provider: AIProvider = 'groq';
    const isDev = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.DEV;
    return {
      provider,
      apiKey: '',
      model: 'llama-3.1-8b-instant',
      imageModel: 'stabilityai/sd-turbo',
      // Em dev usamos o proxy Express 
      baseURL: isDev ? '/api/groq-openai' : '/api/groq-chat',
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
    const maxRetries = 3;
    let attempt = 0;
    let lastErrorMsg = '';

    while (attempt <= maxRetries) {
      const maxTokensForAttempt = Math.max(200, (request.maxTokens || this.config.maxTokens || 2000) - (attempt * 200));
      console.debug('[AI][OpenAIText] Request', {
        endpoint,
        provider: this.config.provider,
        model: this.config.model,
        maxTokens: maxTokensForAttempt,
        temperature: request.temperature || this.config.temperature,
        promptLen: request.prompt?.length || 0,
        hasContext: !!request.context,
        attempt
      });

      const response = await this.fetchWithTimeout(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            ...(request.systemMessage ? [{ role: 'system', content: request.systemMessage }] : []),
            ...(request.context ? [{ role: 'user', content: request.context }] : []),
            { role: 'user', content: request.prompt }
          ],
          max_tokens: maxTokensForAttempt,
          temperature: request.temperature || this.config.temperature
        })
      }, 12000);

      if (response.ok) {
        const data = await response.json();
        console.debug('[AI][OpenAIText] Success', {
          status: response.status,
          model: data.model,
          textLen: data?.choices?.[0]?.message?.content?.length || 0
        });
        return {
          text: data.choices[0].message.content,
          usage: data.usage,
          model: data.model,
          provider: 'openai'
        };
      }

      const raw = await response.text();
      let error: any = {};
      try { error = JSON.parse(raw); } catch { error = { error: { message: raw } }; }
      lastErrorMsg = error.error?.message || raw || 'Unknown error occurred';
      console.error('[AI][OpenAIText] Error', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        message: lastErrorMsg,
        rawSnippet: typeof raw === 'string' ? raw.slice(0, 300) : '',
        retryAfter: response.headers.get('retry-after') || undefined
      });

      if (response.status === 429) {
        // Rate limit: aplicar backoff exponencial com jitter e respeitar Retry-After se presente
        const retryAfterHeader = response.headers.get('retry-after');
        const retryAfterFromHeader = this.parseRetrySeconds(retryAfterHeader);
        const retryAfterFromMsg = this.parseRetrySeconds(lastErrorMsg);
        const baseWaitMs = Math.round((retryAfterFromHeader ?? retryAfterFromMsg ?? 3) * 1000);
        const exponentialMs = baseWaitMs * Math.pow(2, attempt);
        const jitterMs = Math.floor(Math.random() * 300);
        await this.sleep(Math.max(1000, exponentialMs + jitterMs));
        attempt++;
        continue;
      }

      // Outros erros: lançar imediatamente
      throw new AIError({
        code: error.error?.code || 'unknown_error',
        message: lastErrorMsg,
        provider: 'openai',
        retryable: response.status >= 500
      });
    }

    // Se exceder retries por rate limit, propaga erro amigável e marcando como retryable
    throw new AIError({
      code: 'rate_limit',
      message: lastErrorMsg || 'Rate limit reached. Please try again later.',
      provider: 'openai',
      retryable: true
    });
  }

  private async makeHuggingFaceTextRequest(request: AITextRequest): Promise<AITextResponse> {
    const endpoint = this.config.baseURL || '/api/hf-text';
    console.debug('[AI][HFText] Request', {
      endpoint,
      model: this.config.model,
      maxTokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature || this.config.temperature,
      promptLen: request.prompt?.length || 0,
      hasContext: !!request.systemMessage
    });
    const response = await fetch(endpoint, {
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
      console.error('[AI][HFText] Error', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        message: errMsg,
        rawSnippet: typeof textRaw === 'string' ? textRaw.slice(0, 300) : ''
      });
      throw new AIError({
        code: 'hf_error',
        message: errMsg,
        provider: 'huggingface',
        retryable: response.status >= 500
      });
    }

    console.debug('[AI][HFText] Success', {
      status: response.status,
      textLen: (data.text || '').length
    });
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
    // Persistent cache check by prompt (Lexica/Pollinations URLs)
    const cacheEnabled = import.meta.env.VITE_AI_CACHE_ENABLED !== 'false';
    if (cacheEnabled) {
      const cachedUrl = getCachedImage(request.prompt);
      if (cachedUrl) {
        return {
          url: cachedUrl,
          revisedPrompt: request.prompt,
          size: request.size || '512x512',
          model: this.config.imageModel || 'stabilityai/sd-turbo',
          provider: 'cache'
        } as any;
      }
    }

    const response = await this.fetchWithTimeout('/api/gerar-imagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: request.prompt })
    }, 9000);

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
        const res2 = await this.fetchWithTimeout(`/api/hero-image?prompt=${encodeURIComponent(request.prompt)}`, { method: 'GET' }, 7000);
        const data2 = await res2.json().catch(() => ({ image: '' }));
        if (res2.ok && typeof data2?.image === 'string' && data2.image.length > 0) {
          imageUrl = data2.image;
        }
      } catch {
        // Ignorar e manter placeholder
      }
      // Fallback gratuito adicional: Pollinations
      if (!imageUrl || (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/svg+xml'))) {
        // Prefer width/height params for Pollinations for broader compatibility
        const size = (request.size || '512x512').split('x');
        const width = encodeURIComponent(size[0] || '512');
        const height = encodeURIComponent(size[1] || '512');
        imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(request.prompt)}?n=1&width=${width}&height=${height}`;
      }
    }

    // Persist cache for http(s) URLs (avoid data URIs)
    if (cacheEnabled && typeof imageUrl === 'string' && /^https?:\/\//.test(imageUrl)) {
      const srcType = imageUrl.includes('lexica.art') ? 'lexica' : (imageUrl.includes('pollinations.ai') ? 'pollinations' : 'hf');
      // Cache for 7 days by default
      setCachedImage(request.prompt, imageUrl, 7 * 24 * 60 * 60 * 1000, srcType as any);
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
      console.debug('[AI][Text] Dispatch', {
        provider: this.config.provider,
        baseURL: this.config.baseURL,
        model: this.config.model,
        maxTokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature || this.config.temperature,
        promptLen: request.prompt?.length || 0,
        hasContext: !!request.context
      });
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
      console.debug('[AI][Text] Completed', {
        provider: response.provider,
        model: response.model,
        textLen: response.text?.length || 0,
        totalTokens: response.usage?.totalTokens
      });
      return response;
    } catch (error) {
      this.usageStats.errorRate++;
      console.error('[AI][Text] Failed', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        provider: (error as any)?.provider || this.config.provider,
        retryable: (error as any)?.retryable
      });
      throw error;
    }
  }

  // Versão segura com fallback local quando houver falha do provider
  async generateTextSafe(request: AITextRequest): Promise<AITextResponse> {
    try {
      return await this.generateText(request);
    } catch (error: any) {
      console.warn('[AI][TextSafe] Fallback engaged', {
        code: error?.code,
        message: error?.message?.slice?.(0, 200) || String(error?.message || error),
        provider: error?.provider || this.config.provider
      });
      const text = this.buildFallbackText(request);
      return {
        text,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: this.config.model,
        provider: this.config.provider
      } as AITextResponse;
    }
  }

  private buildFallbackText(request: AITextRequest): string {
    const sys = (request.systemMessage || '').toLowerCase();
    const prompt = request.prompt || '';
    // Heurísticas simples para diferentes consumidores de texto
    if (sys.includes('narrador') || sys.includes('narrative') || prompt.toLowerCase().includes('narre')) {
      return 'O vento sussurra entre ruínas antigas enquanto o herói avança com determinação. Obstáculos surgem, mas cada passo revela novas oportunidades e perigos. Continue explorando: o destino se escreve com suas escolhas.';
    }
    if (sys.includes('missão') || prompt.toLowerCase().includes('missão')) {
      return 'Missão: Investigar atividades estranhas em um vilarejo próximo. Objetivo: conversar com moradores e coletar pistas. Recompensa: experiência e ouro modestos. Dificuldade: normal.';
    }
    if (sys.includes('diálogo') || prompt.toLowerCase().includes('diálogo')) {
      return 'NPC: "Vi você pela estrada. Cuidado, viajante—os bosques escondem mais do que sombras. Precisa de ajuda?"';
    }
    // Fallback genérico
    const trimmed = prompt.trim();
    return trimmed.length > 0
      ? `Resumo: ${trimmed.slice(0, 200)} ...`
      : 'Texto não disponível no momento. Continue a aventura; conteúdo será carregado quando o serviço retornar.';
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
    const cacheEnabled = import.meta.env.VITE_AI_CACHE_ENABLED !== 'false';
    if (cacheEnabled) {
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
      if (cacheEnabled) {
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
