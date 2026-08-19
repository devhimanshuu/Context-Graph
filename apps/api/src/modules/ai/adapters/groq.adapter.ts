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

/** Free models available on Groq. */
const GROQ_FREE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'llama3-groq-8b-8192-tool-use-preview',
  'llama3-groq-70b-8192-tool-use-preview',
] as const

/**
 * Groq Adapter — OpenAI-compatible API for fast inference.
 *
 * Groq provides fast LLM inference with an OpenAI-compatible API.
 * This adapter uses the native fetch API (no SDK dependency).
 *
 * Key features:
 * - OpenAI-compatible endpoint
 * - Fast inference (Groq hardware acceleration)
 * - No SDK dependency (uses native fetch)
 * - Supports llama, mixtral, gemma models
 * - Automatic fallback through free model list
 */
@Injectable()
export class GroqAdapter extends ModelGateway {
  private readonly baseUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1'
  private readonly apiKey = process.env.GROQ_API_KEY || ''
  private readonly defaultModel = 'llama-3.3-70b-versatile'
  private readonly modelFailureCounts = new Map<string, number>()

  constructor(@Inject(LOGGER) logger: ILogger) {
    super(logger)
  }

  /**
   * Get next available free model for fallback.
   */
  private getNextFallbackModel(failedModel: string): string | null {
    const currentIndex = GROQ_FREE_MODELS.indexOf(failedModel as (typeof GROQ_FREE_MODELS)[number])

    if (currentIndex === -1) {
      return GROQ_FREE_MODELS[0] ?? null
    }

    // Try next models in the list
    for (let i = currentIndex + 1; i < GROQ_FREE_MODELS.length; i++) {
      const candidate = GROQ_FREE_MODELS[i]
      if (candidate && !this.isModelFailing(candidate)) {
        return candidate
      }
    }

    // Wrap around
    for (let i = 0; i < currentIndex; i++) {
      const candidate = GROQ_FREE_MODELS[i]
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
    for (let attempt = 0; attempt < GROQ_FREE_MODELS.length; attempt++) {
      this.logger.debug('Groq generation request', {
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
          this.logger.warn('Groq API error, trying next model', {
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
          throw new Error(`Groq API error: ${response.status}`)
        }

        interface GroqResponse {
          choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
        }
        const data = (await response.json()) as GroqResponse
        const latencyMs = Date.now() - startTime

        this.recordModelSuccess(model)

        const text = data.choices?.[0]?.message?.content ?? ''
        const usage = {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
          estimatedCost: 0, // Groq has free tier
          provider: 'GROQ' as const,
          model,
        }

        this.logger.debug('Groq generation complete', {
          model,
          latencyMs,
          tokens: usage.totalTokens,
          requestId: request.requestId,
        })

        return this.createResult(
          text,
          model,
          'GROQ',
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

    this.logger.error('Groq generation failed on all models', {
      error: lastError?.message,
      requestId: request.requestId,
    })
    throw lastError ?? new Error('All Groq models failed')
  }

  async generateStream(request: StreamRequest): Promise<StreamResult> {
    const startTime = Date.now()
    let model = request.configuration.model || this.defaultModel
    let lastError: Error | null = null

    // Try primary model, then fallbacks
    for (let attempt = 0; attempt < GROQ_FREE_MODELS.length; attempt++) {
      this.logger.debug('Groq streaming request', {
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
          this.logger.warn('Groq streaming error, trying next model', {
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
          throw new Error(`Groq API error: ${response.status}`)
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
          estimatedCost: 0, // Groq has free tier
          provider: 'GROQ' as const,
          model,
        }

        this.recordModelSuccess(model)

        this.logger.debug('Groq streaming complete', {
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

    this.logger.error('Groq streaming failed on all models', {
      error: lastError?.message,
      requestId: request.requestId,
    })
    throw lastError ?? new Error('All Groq models failed')
  }

  getProvider(): ModelProvider {
    return 'GROQ'
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
}
