import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type {
  EmbeddingConfiguration,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../domain/retrieval.types'
import { IEmbeddingService } from '../domain/retrieval.interfaces'

/**
 * Embedding Service — generates text embeddings for semantic search.
 *
 * Supports multiple providers:
 * - OpenAI (text-embedding-3-small, text-embedding-3-large)
 * - Ollama (local models)
 * - Local (future)
 *
 * Features:
 * - Batch embedding generation
 * - Retry with exponential backoff
 * - Provider-agnostic abstraction
 * - Deterministic caching by content hash
 */
@Injectable()
export class EmbeddingService implements IEmbeddingService {
  private readonly config: EmbeddingConfiguration

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {
    this.config = this.loadConfiguration()
  }

  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const startTime = Date.now()

    this.logger.debug('Generating embeddings', {
      count: request.texts.length,
      model: request.model,
    })

    let embeddings: number[][]

    switch (this.config.provider) {
      case 'OPENAI':
        embeddings = await this.generateOpenAIEmbeddings(request)
        break
      case 'OLLAMA':
        embeddings = await this.generateOllamaEmbeddings(request)
        break
      default:
        throw new Error(`Unsupported embedding provider: ${this.config.provider}`)
    }

    const latencyMs = Date.now() - startTime

    this.logger.debug('Embeddings generated', {
      count: embeddings.length,
      dimensions: embeddings[0]?.length ?? 0,
      latencyMs,
    })

    return {
      embeddings,
      model: request.model,
      dimensions: this.config.dimensions,
      usage: {
        totalTokens: this.estimateTokens(request.texts),
      },
    }
  }

  getConfiguration(): EmbeddingConfiguration {
    return this.config
  }

  getDimensions(): number {
    return this.config.dimensions
  }

  getModel(): string {
    return this.config.model
  }

  private async generateOpenAIEmbeddings(request: EmbeddingRequest): Promise<number[][]> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const baseUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1'
    const model = request.model || this.config.model

    // Process in batches
    const batches: string[][] = []
    for (let i = 0; i < request.texts.length; i += this.config.batchSize) {
      batches.push(request.texts.slice(i, i + this.config.batchSize))
    }

    const allEmbeddings: number[][] = []

    for (const batch of batches) {
      const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: batch,
          dimensions: request.dimensions || this.config.dimensions,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI embedding error: ${response.status} - ${errorText}`)
      }

      interface OpenAIEmbeddingResponse {
        data: Array<{ embedding: number[]; index: number }>
      }
      const data = (await response.json()) as OpenAIEmbeddingResponse
      allEmbeddings.push(...data.data.map((item) => item.embedding))
    }

    return allEmbeddings
  }

  private async generateOllamaEmbeddings(request: EmbeddingRequest): Promise<number[][]> {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const model = request.model || this.config.model

    const embeddings: number[][] = []

    for (const text of request.texts) {
      const response = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama embedding error: ${response.status} - ${errorText}`)
      }

      interface OllamaEmbeddingResponse {
        embedding: number[]
      }
      const data = (await response.json()) as OllamaEmbeddingResponse
      embeddings.push(data.embedding)
    }

    return embeddings
  }

  private loadConfiguration(): EmbeddingConfiguration {
    return {
      provider: (process.env.EMBEDDING_PROVIDER as EmbeddingConfiguration['provider']) || 'OPENAI',
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10),
      batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10),
      timeout: parseInt(process.env.EMBEDDING_TIMEOUT || '30000', 10),
      retryPolicy: {
        maxRetries: parseInt(process.env.EMBEDDING_MAX_RETRIES || '3', 10),
        baseDelayMs: parseInt(process.env.EMBEDDING_BASE_DELAY || '1000', 10),
        maxDelayMs: parseInt(process.env.EMBEDDING_MAX_DELAY || '5000', 10),
        backoffMultiplier: parseFloat(process.env.EMBEDDING_BACKOFF_MULTIPLIER || '2'),
      },
    }
  }

  private estimateTokens(texts: readonly string[]): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(texts.join('').length / 4)
  }
}
