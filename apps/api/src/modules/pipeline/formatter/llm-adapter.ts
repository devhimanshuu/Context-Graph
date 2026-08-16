import type { Timestamp } from '@contextgraph/types'

/** Provider identifiers supported by the future adapter layer. */
export const LLMProvider = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  OLLAMA: 'ollama',
} as const
export type LLMProvider = (typeof LLMProvider)[keyof typeof LLMProvider]

/** A completion request in provider-independent terms. */
export interface LLMCompletionRequest {
  /** The prompt-ready document produced by the ContextFormatter. */
  readonly prompt: string
  /** System framing for the provider (optional). */
  readonly system?: string
  /** Deterministic temperature for reproducible responses (0..1). */
  readonly temperature: number
  /** Maximum tokens the provider may generate in the reply. */
  readonly maxOutputTokens: number
}

/** A completion response normalized across providers. */
export interface LLMCompletionResponse {
  readonly text: string
  readonly provider: LLMProvider
  /** Provider token usage counters when available. */
  readonly usage: {
    readonly inputTokens: number
    readonly outputTokens: number
    readonly totalTokens: number
  }
  readonly finishedAt: Timestamp
}

/**
 * Provider-independent contract for future LLM integration (Phase 8+).
 *
 * The ContextFormatter NEVER calls this interface — formatting stays
 * deterministic and provider-agnostic. An adapter is the last-mile bridge
 * between a formatted document and a specific model, so a ContextPackage
 * can be consumed by OpenAI / Anthropic / Gemini / Ollama without the
 * pipeline knowing which provider served the reply.
 *
 * Concrete adapters (OpenAILLMAdapter, AnthropicLLMAdapter, ...) are
 * intentionally NOT implemented yet; the stub documents the seam.
 */
export interface ILLMAdapter {
  readonly provider: LLMProvider
  /** Maximum context tokens the underlying model accepts. */
  readonly contextWindowTokens: number
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>
}
