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

/**
 * Ollama Adapter — local model support.
 *
 * Ollama provides local LLM inference for:
 * - Development
 * - Testing
 * - Privacy-sensitive deployments
 * - No API key required
 *
 * Key features:
 * - Local inference (no data leaves the machine)
 * - OpenAI-compatible API
 * - Supports llama, mistral, gemma, phi models
 * - No SDK dependency (uses native fetch)
 */
@Injectable()
export class OllamaAdapter extends ModelGateway {
  private readonly baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  private readonly defaultModel = 'llama3.2'

  constructor(@Inject(LOGGER) logger: ILogger) {
    super(logger)
  }

  async generate(request: ModelRequest): Promise<GenerationResult> {
    const startTime = Date.now()
    const model = request.configuration.model || this.defaultModel

    this.logger.debug('Ollama generation request', {
      model,
      requestId: request.requestId,
    })

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          stream: false,
          options: {
            temperature: request.configuration.temperature,
            num_predict: request.configuration.maxOutputTokens,
          },
        }),
        signal: AbortSignal.timeout(request.configuration.timeout),
      })

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error('Ollama API error', {
          status: response.status,
          error: errorText,
          requestId: request.requestId,
        })
        throw new Error(`Ollama API error: ${response.status}`)
      }

      interface OllamaResponse {
        message?: { content?: string }
        prompt_eval_count?: number
        eval_count?: number
      }
      const data = (await response.json()) as OllamaResponse
      const latencyMs = Date.now() - startTime

      const text = data.message?.content ?? ''
      const usage = {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
        estimatedCost: 0, // Local models have no API cost
        provider: 'OLLAMA' as const,
        model,
      }

      this.logger.debug('Ollama generation complete', {
        model,
        latencyMs,
        tokens: usage.totalTokens,
        requestId: request.requestId,
      })

      return this.createResult(
        text,
        model,
        'OLLAMA',
        usage,
        'STOP',
        latencyMs,
        request.requestId,
        request.contextHash,
        request.contextHash,
      )
    } catch (error) {
      this.logger.error('Ollama generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: request.requestId,
      })
      throw error
    }
  }

  async generateStream(request: StreamRequest): Promise<StreamResult> {
    const startTime = Date.now()
    const model = request.configuration.model || this.defaultModel

    this.logger.debug('Ollama streaming request', {
      model,
      requestId: request.requestId,
    })

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          stream: true,
          options: {
            temperature: request.configuration.temperature,
            num_predict: request.configuration.maxOutputTokens,
          },
        }),
        signal: AbortSignal.timeout(request.configuration.timeout),
      })

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error('Ollama streaming error', {
          status: response.status,
          error: errorText,
          requestId: request.requestId,
        })
        throw new Error(`Ollama API error: ${response.status}`)
      }

      let fullText = ''
      let inputTokens = 0
      let outputTokens = 0

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body for streaming')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line) as {
                  message?: { content?: string }
                  prompt_eval_count?: number
                  eval_count?: number
                  done?: boolean
                }

                if (chunk.message?.content) {
                  fullText += chunk.message.content
                  request.onChunk({
                    delta: chunk.message.content,
                    finishReason: null,
                    usage: null,
                    index: 0,
                  })
                }

                if (chunk.prompt_eval_count) inputTokens = chunk.prompt_eval_count
                if (chunk.eval_count) outputTokens = chunk.eval_count
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      const latencyMs = Date.now() - startTime
      const usage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimatedCost: 0, // Local models have no API cost
        provider: 'OLLAMA' as const,
        model,
      }

      this.logger.debug('Ollama streaming complete', {
        model,
        latencyMs,
        tokens: usage.totalTokens,
        requestId: request.requestId,
      })

      return this.createStreamResult(fullText, usage, 'STOP', latencyMs)
    } catch (error) {
      this.logger.error('Ollama streaming failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: request.requestId,
      })
      throw error
    }
  }

  getProvider(): ModelProvider {
    return 'OLLAMA'
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
