import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type {
  ModelConfiguration,
  ModelProvider,
  CircuitState,
  AiChatRequest,
} from '../domain/ai.types'
import type { IModelRouter, IModelGateway } from '../domain/ai.interfaces'

/** Free models available on Groq. */
const GROQ_FREE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'llama3-groq-8b-8192-tool-use-preview',
  'llama3-groq-70b-8192-tool-use-preview',
] as const

/** Free models available on OpenRouter. */
const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
] as const

/** Default model configurations by provider. */
const DEFAULT_CONFIGS: Record<ModelProvider, ModelConfiguration> = {
  GROQ: {
    provider: 'GROQ',
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    maxOutputTokens: 4096,
    timeout: 30000,
    retryPolicy: { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2 },
    isLocal: false,
  },
  OPENROUTER: {
    provider: 'OPENROUTER',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    temperature: 0.7,
    maxOutputTokens: 4096,
    timeout: 30000,
    retryPolicy: { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2 },
    isLocal: false,
  },
  OLLAMA: {
    provider: 'OLLAMA',
    model: 'llama3.2',
    temperature: 0.7,
    maxOutputTokens: 4096,
    timeout: 60000,
    retryPolicy: { maxRetries: 1, baseDelayMs: 1000, maxDelayMs: 3000, backoffMultiplier: 2 },
    isLocal: true,
  },
  OPENAI: {
    provider: 'OPENAI',
    model: 'gpt-4o',
    temperature: 0.7,
    maxOutputTokens: 4096,
    timeout: 30000,
    retryPolicy: { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2 },
    isLocal: false,
  },
  ANTHROPIC: {
    provider: 'ANTHROPIC',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    maxOutputTokens: 4096,
    timeout: 30000,
    retryPolicy: { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2 },
    isLocal: false,
  },
}

/**
 * Model Router — routes requests to appropriate providers.
 *
 * Features:
 * - Configuration-based routing
 * - Provider fallback
 * - Circuit breaker integration
 * - Provider availability checking
 *
 * Routing strategy (current):
 * 1. Use configured provider if available
 * 2. Fallback to next available provider
 * 3. Last resort: local Ollama
 */
@Injectable()
export class ModelRouter implements IModelRouter {
  private readonly primaryProvider: ModelProvider
  private readonly fallbackProviders: ModelProvider[]
  private readonly circuitBreakers = new Map<ModelProvider, CircuitState>()
  private readonly failureCounts = new Map<ModelProvider, number>()
  private readonly modelFailureCounts = new Map<string, number>()

  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject('MODEL_GATEWAYS') private readonly gateways: Map<ModelProvider, IModelGateway>,
  ) {
    this.primaryProvider = (process.env.AI_PRIMARY_PROVIDER as ModelProvider) || 'GROQ'
    this.fallbackProviders = this.parseFallbackProviders()

    // Initialize circuit breakers
    for (const provider of [this.primaryProvider, ...this.fallbackProviders]) {
      this.circuitBreakers.set(provider, 'CLOSED')
      this.failureCounts.set(provider, 0)
    }
  }

  async route(request: AiChatRequest): Promise<ModelConfiguration> {
    // Try primary provider
    if (await this.canUseProvider(this.primaryProvider)) {
      this.logger.debug('Routing to primary provider', { provider: this.primaryProvider })
      return this.getConfig(this.primaryProvider, request)
    }

    // Try fallback providers
    for (const provider of this.fallbackProviders) {
      if (await this.canUseProvider(provider)) {
        this.logger.debug('Routing to fallback provider', { provider })
        return this.getConfig(provider, request)
      }
    }

    // Last resort: Ollama (local)
    this.logger.warn('All providers unavailable, falling back to Ollama')
    return this.getConfig('OLLAMA', request)
  }

  /**
   * Get fallback model for a provider when the primary model fails.
   * Returns the next available free model in the fallback chain.
   */
  getFallbackModel(provider: ModelProvider, failedModel: string): string | null {
    const models: readonly string[] =
      provider === 'GROQ' ? GROQ_FREE_MODELS : OPENROUTER_FREE_MODELS
    const currentIndex = models.indexOf(failedModel)

    if (currentIndex === -1) {
      // Model not in our list, try first model
      return models[0] ?? null
    }

    // Try next model in the list
    for (let i = currentIndex + 1; i < models.length; i++) {
      const candidate = models[i]
      if (candidate && !this.isModelFailing(candidate)) {
        return candidate
      }
    }

    // Wrap around and try from the beginning
    for (let i = 0; i < currentIndex; i++) {
      const candidate = models[i]
      if (candidate && !this.isModelFailing(candidate)) {
        return candidate
      }
    }

    return null // All models failing
  }

  /**
   * Record model failure for fallback tracking.
   */
  recordModelFailure(model: string): void {
    const count = (this.modelFailureCounts.get(model) ?? 0) + 1
    this.modelFailureCounts.set(model, count)

    if (count >= 3) {
      this.logger.warn('Model marked as failing', { model, failures: count })
    }
  }

  /**
   * Reset model failure count on success.
   */
  recordModelSuccess(model: string): void {
    this.modelFailureCounts.set(model, 0)
  }

  private isModelFailing(model: string): boolean {
    return (this.modelFailureCounts.get(model) ?? 0) >= 3
  }

  getPrimaryProvider(): ModelProvider {
    return this.primaryProvider
  }

  getFallbackProviders(): readonly ModelProvider[] {
    return this.fallbackProviders
  }

  private async canUseProvider(provider: ModelProvider): Promise<boolean> {
    const circuitState = this.circuitBreakers.get(provider)
    if (circuitState === 'OPEN') {
      return false
    }

    const gateway = this.gateways.get(provider)
    if (!gateway) {
      return false
    }

    try {
      return await gateway.isAvailable()
    } catch {
      return false
    }
  }

  private getConfig(provider: ModelProvider, request: AiChatRequest): ModelConfiguration {
    const base = DEFAULT_CONFIGS[provider]
    const overrides = request.configuration

    return {
      ...base,
      ...overrides,
      provider,
      model: overrides.model ?? base.model,
      temperature: overrides.temperature ?? base.temperature,
      maxOutputTokens: overrides.maxOutputTokens ?? base.maxOutputTokens,
    }
  }

  private parseFallbackProviders(): ModelProvider[] {
    const env = process.env.AI_FALLBACK_PROVIDERS || 'OPENROUTER,OLLAMA'
    return env
      .split(',')
      .map((p) => p.trim() as ModelProvider)
      .filter((p) => p !== this.primaryProvider)
  }

  recordSuccess(provider: ModelProvider): void {
    this.failureCounts.set(provider, 0)
    this.circuitBreakers.set(provider, 'CLOSED')
  }

  recordFailure(provider: ModelProvider): void {
    const count = (this.failureCounts.get(provider) ?? 0) + 1
    this.failureCounts.set(provider, count)

    if (count >= 3) {
      this.circuitBreakers.set(provider, 'OPEN')
      this.logger.warn('Circuit breaker opened', { provider, failures: count })

      // Auto-recover after 30 seconds
      setTimeout(() => {
        this.circuitBreakers.set(provider, 'HALF_OPEN')
        this.logger.info('Circuit breaker half-open', { provider })
      }, 30000)
    }
  }
}
