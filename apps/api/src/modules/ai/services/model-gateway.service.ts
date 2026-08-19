import { Injectable } from '@nestjs/common'
import { type ILogger } from '../../../common/interfaces/logger.interface'
import type {
  GenerationResult,
  ModelProvider,
  ModelRequest,
  ModelUsage,
  FinishReason,
  StreamRequest,
  StreamResult,
} from '../domain/ai.types'
import type { IModelGateway } from '../domain/ai.interfaces'

/**
 * Abstract Model Gateway — the single abstraction for LLM communication.
 *
 * The rest of ContextGraph depends on this interface, never on specific SDKs.
 * This enables:
 * - Provider switching without domain changes
 * - Testing with fake gateways
 * - Fallback routing
 * - Circuit breaking
 *
 * Providers must implement this interface for their specific SDK.
 */
@Injectable()
export abstract class ModelGateway implements IModelGateway {
  constructor(protected readonly logger: ILogger) {}

  abstract generate(request: ModelRequest): Promise<GenerationResult>
  abstract generateStream(request: StreamRequest): Promise<StreamResult>
  abstract getProvider(): ModelProvider
  abstract isAvailable(): Promise<boolean>

  protected createUsage(
    inputTokens: number,
    outputTokens: number,
    provider: ModelProvider,
    model: string,
    estimatedCost: number,
  ): ModelUsage {
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost,
      provider,
      model,
    }
  }

  protected createResult(
    text: string,
    model: string,
    provider: ModelProvider,
    usage: ModelUsage,
    finishReason: FinishReason,
    latencyMs: number,
    requestId: string,
    contextVersion: string,
    contextHash: string,
  ): GenerationResult {
    return {
      text,
      model,
      provider,
      usage,
      finishReason,
      latencyMs,
      requestId,
      contextVersion,
      contextHash,
    }
  }

  protected createStreamResult(
    text: string,
    usage: ModelUsage,
    finishReason: FinishReason,
    latencyMs: number,
  ): StreamResult {
    return {
      text,
      usage,
      finishReason,
      latencyMs,
    }
  }

  /**
   * Parse SSE (Server-Sent Events) stream from OpenAI-compatible APIs.
   * Yields parsed chunks from the stream.
   */
  protected async *parseSSEStream(
    response: Response,
  ): AsyncGenerator<{ data: Record<string, unknown> }, void, unknown> {
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') return
            try {
              yield { data: JSON.parse(data) as Record<string, unknown> }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
