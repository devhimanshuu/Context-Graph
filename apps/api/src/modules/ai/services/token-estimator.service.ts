import { Injectable } from '@nestjs/common'
import type { ContextItem } from '../domain/ai.types'
import type { ITokenEstimator } from '../domain/ai.interfaces'

/**
 * Generic Token Estimator — provider-independent approximation.
 *
 * Uses character-based estimation as a conservative fallback:
 * - ~4 characters per token (English average)
 * - Adds overhead for special tokens and formatting
 *
 * Architecture allows future provider-specific tokenizers:
 * - OpenAITokenEstimator (tiktoken)
 * - AnthropicTokenEstimator
 * - GenericTokenEstimator (current implementation)
 *
 * IMPORTANT: This is an ESTIMATE. Actual token counts vary by provider
 * and content. Never rely on this for billing — only for budget planning.
 */
@Injectable()
export class GenericTokenEstimator implements ITokenEstimator {
  /** Average characters per token for English text. */
  private readonly CHARS_PER_TOKEN = 4
  /** Overhead per message/item (role, separators, etc.). */
  private readonly ITEM_OVERHEAD_TOKENS = 4
  /** Overhead for system instructions. */
  private readonly SYSTEM_OVERHEAD_TOKENS = 10

  estimateTokens(text: string): number {
    if (text.length === 0) return 0
    return Math.ceil(text.length / this.CHARS_PER_TOKEN)
  }

  estimateTokensForItems(items: readonly ContextItem[]): number {
    let total = this.SYSTEM_OVERHEAD_TOKENS
    for (const item of items) {
      total += this.ITEM_OVERHEAD_TOKENS
      total += this.estimateTokens(item.title)
      total += this.estimateTokens(item.content)
    }
    return total
  }

  getProvider(): string {
    return 'generic'
  }
}

/**
 * OpenAI-optimized token estimator.
 * Uses a more accurate estimation for OpenAI models.
 */
@Injectable()
export class OpenAITokenEstimator implements ITokenEstimator {
  /** OpenAI models average ~3.5 chars per token for English. */
  private readonly CHARS_PER_TOKEN = 3.5
  private readonly ITEM_OVERHEAD_TOKENS = 4
  private readonly SYSTEM_OVERHEAD_TOKENS = 10

  estimateTokens(text: string): number {
    if (text.length === 0) return 0
    return Math.ceil(text.length / this.CHARS_PER_TOKEN)
  }

  estimateTokensForItems(items: readonly ContextItem[]): number {
    let total = this.SYSTEM_OVERHEAD_TOKENS
    for (const item of items) {
      total += this.ITEM_OVERHEAD_TOKENS
      total += this.estimateTokens(item.title)
      total += this.estimateTokens(item.content)
    }
    return total
  }

  getProvider(): string {
    return 'openai'
  }
}

/**
 * Anthropic-optimized token estimator.
 * Anthropic models average ~3.3 chars per token.
 */
@Injectable()
export class AnthropicTokenEstimator implements ITokenEstimator {
  private readonly CHARS_PER_TOKEN = 3.3
  private readonly ITEM_OVERHEAD_TOKENS = 4
  private readonly SYSTEM_OVERHEAD_TOKENS = 10

  estimateTokens(text: string): number {
    if (text.length === 0) return 0
    return Math.ceil(text.length / this.CHARS_PER_TOKEN)
  }

  estimateTokensForItems(items: readonly ContextItem[]): number {
    let total = this.SYSTEM_OVERHEAD_TOKENS
    for (const item of items) {
      total += this.ITEM_OVERHEAD_TOKENS
      total += this.estimateTokens(item.title)
      total += this.estimateTokens(item.content)
    }
    return total
  }

  getProvider(): string {
    return 'anthropic'
  }
}
