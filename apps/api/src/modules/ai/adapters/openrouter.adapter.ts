import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type {
  GenerationResult,
  ModelProvider,
  ModelRequest,
  StreamRequest,
  StreamResult,
} from '../domain/ai.types'
import { ModelGateway } from '../services/model-gateway.service'

/** Free models available on OpenRouter. */
const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
] as const

/**
 * OpenRouter Adapter — multi-provider gateway.
 *
 * OpenRouter provides access to multiple LLM providers through a single API.
 * This adapter uses the native fetch API (no SDK dependency).
 *
 * Key features:
 * - Access to OpenAI, Anthropic, Google, Meta, and more
 * - OpenAI-compatible API
 * - No SDK dependency (uses native fetch)
 * - Pay-per-use pricing
 * - Automatic fallback through free model list
 */
@Injectable()
export class OpenRouterAdapter extends ModelGateway {
  private readonly baseUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1'
  private readonly apiKey = process.env.OPENROUTER_API_KEY || ''
  private readonly defaultModel = 'meta-llama/llama-3.3-70b-instruct:free'
  private readonly modelFailureCounts = new Map<string, number>()

  constructor(@Inject(LOGGER) logger: ILogger) {
    super(logger)
  }

  /**
   * Get next available free model for fallback.
   */
  private getNextFallbackModel(failedModel: string): string | null {
    const currentIndex = OPENROUTER_FREE_MODELS.indexOf(
      failedModel as (typeof OPENROUTER_FREE_MODELS)[number],
    )

    if (currentIndex === -1) {
      return OPENROUTER_FREE_MODELS[0] ?? null
    }

    // Try next models in the list
    for (let i = currentIndex + 1; i < OPENROUTER_FREE_MODELS.length; i++) {
      const candidate = OPENROUTER_FREE_MODELS[i]
      if (candidate && !this.isModelFailing(candidate)) {
        return candidate
      }
    }

    // Wrap around
    for (let i = 0; i < currentIndex; i++) {
      const candidate = OPENROUTER_FREE_MODELS[i]
      if (candidate && !this.isModelFailing(candidate)) {
        return candidate
      }
    }

    return null
  }

  private isModelFailing(model: string): boolean {
    return (this.modelFailureCounts.get(model) ?? 0) >= 3
  }

  private recordModelFailure(model: string): void {
    const count = (this.modelFailureCounts.get(model) ?? 0) + 1
    this.modelFailureCounts.set(model, count)
  }

  private recordModelSuccess(model: string): void {
    this.modelFailureCounts.set(model, 0)
  }

  async generate(request: ModelRequest): Promise<GenerationResult> {
    const startTime = Date.now()
    let model = request.configuration.model || this.defaultModel
    let lastError: Error | null = null

    // Try primary model, then fallbacks
    for (let attempt = 0; attempt < OPENROUTER_FREE_MODELS.length; attempt++) {
      this.logger.debug('OpenRouter generation request', {
        model,
        attempt,
        requestId: request.requestId,
      })

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://contextgraph.ai',
            'X-Title': 'ContextGraph',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: request.systemPrompt },
              { role: 'user', content: request.userPrompt },
            ],
            temperature: request.configuration.temperature,
            max_tokens: request.configuration.maxOutputTokens,
          }),
          signal: AbortSignal.timeout(request.configuration.timeout),
        })

        if (!response.ok) {
          const errorText = await response.text()
          this.logger.warn('OpenRouter API error, trying next model', {
            model,
            status: response.status,
            error: errorText,
            requestId: request.requestId,
          })
          this.recordModelFailure(model)
          const nextModel = this.getNextFallbackModel(model)
          if (nextModel) {
            model = nextModel
            continue
          }
          throw new Error(`OpenRouter API error: ${response.status}`)
        }

        interface OpenRouterResponse {
          choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
        }
        const data = (await response.json()) as OpenRouterResponse
        const latencyMs = Date.now() - startTime

        this.recordModelSuccess(model)

        const text = data.choices?.[0]?.message?.content ?? ''
        const usage = {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
          estimatedCost: this.estimateCost(
            model,
            data.usage?.prompt_tokens ?? 0,
            data.usage?.completion_tokens ?? 0,
          ),
          provider: 'OPENROUTER' as const,
          model,
        }

        this.logger.debug('OpenRouter generation complete', {
          model,
          latencyMs,
          tokens: usage.totalTokens,
          requestId: request.requestId,
        })

        return this.createResult(
          text,
          model,
          'OPENROUTER',
          usage,
          data.choices?.[0]?.finish_reason === 'stop' ? 'STOP' : 'LENGTH',
          latencyMs,
          request.requestId,
          request.contextHash,
          request.contextHash,
        )
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        this.recordModelFailure(model)
        const nextModel = this.getNextFallbackModel(model)
        if (nextModel) {
          model = nextModel
          continue
        }
        break
      }
    }

    this.logger.error('OpenRouter generation failed on all models', {
      error: lastError?.message,
      requestId: request.requestId,
    })
    throw lastError ?? new Error('All OpenRouter models failed')
  }

  async generateStream(request: StreamRequest): Promise<StreamResult> {
    const startTime = Date.now()
    let model = request.configuration.model || this.defaultModel
    let lastError: Error | null = null

    // Try primary model, then fallbacks
    for (let attempt = 0; attempt < OPENROUTER_FREE_MODELS.length; attempt++) {
      this.logger.debug('OpenRouter streaming request', {
        model,
        attempt,
        requestId: request.requestId,
      })

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://contextgraph.ai',
            'X-Title': 'ContextGraph',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: request.systemPrompt },
              { role: 'user', content: request.userPrompt },
            ],
            temperature: request.configuration.temperature,
            max_tokens: request.configuration.maxOutputTokens,
            stream: true,
          }),
          signal: AbortSignal.timeout(request.configuration.timeout),
        })

        if (!response.ok) {
          const errorText = await response.text()
          this.logger.warn('OpenRouter streaming error, trying next model', {
            model,
            status: response.status,
            error: errorText,
            requestId: request.requestId,
          })
          this.recordModelFailure(model)
          const nextModel = this.getNextFallbackModel(model)
          if (nextModel) {
            model = nextModel
            continue
          }
          throw new Error(`OpenRouter API error: ${response.status}`)
        }

        let fullText = ''
        let finishReason: 'STOP' | 'LENGTH' = 'STOP'
        let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }

        for await (const chunk of this.parseSSEStream(response)) {
          const data = chunk.data
          const choice = (
            data.choices as Array<{ delta?: { content?: string }; finish_reason?: string }>
          )?.[0]

          if (choice?.delta?.content) {
            fullText += choice.delta.content
            request.onChunk({
              delta: choice.delta.content,
              finishReason: null,
              usage: null,
              index: 0,
            })
          }

          if (choice?.finish_reason) {
            finishReason = choice.finish_reason === 'stop' ? 'STOP' : 'LENGTH'
          }

          const chunkUsage = data.usage as
            | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
            | undefined
          if (chunkUsage) {
            usage = {
              inputTokens: chunkUsage.prompt_tokens ?? 0,
              outputTokens: chunkUsage.completion_tokens ?? 0,
              totalTokens: chunkUsage.total_tokens ?? 0,
            }
          }
        }

        const latencyMs = Date.now() - startTime
        const modelUsage = {
          ...usage,
          estimatedCost: this.estimateCost(model, usage.inputTokens, usage.outputTokens),
          provider: 'OPENROUTER' as const,
          model,
        }

        this.recordModelSuccess(model)

        this.logger.debug('OpenRouter streaming complete', {
          model,
          latencyMs,
          tokens: usage.totalTokens,
          requestId: request.requestId,
        })

        return this.createStreamResult(fullText, modelUsage, finishReason, latencyMs)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        this.recordModelFailure(model)
        const nextModel = this.getNextFallbackModel(model)
        if (nextModel) {
          model = nextModel
          continue
        }
        break
      }
    }

    this.logger.error('OpenRouter streaming failed on all models', {
      error: lastError?.message,
      requestId: request.requestId,
    })
    throw lastError ?? new Error('All OpenRouter models failed')
  }

  getProvider(): ModelProvider {
    return 'OPENROUTER'
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Simple cost estimation based on common models
    const costs: Record<string, { input: number; output: number }> = {
      'meta-llama/llama-3.3-70b-instruct': { input: 0.00000035, output: 0.0000004 },
      'openai/gpt-4o': { input: 0.0000025, output: 0.00001 },
      'anthropic/claude-3.5-sonnet': { input: 0.000003, output: 0.000015 },
    }

    const modelCost = costs[model] ?? { input: 0.00000035, output: 0.0000004 }
    return inputTokens * modelCost.input + outputTokens * modelCost.output
  }
}
