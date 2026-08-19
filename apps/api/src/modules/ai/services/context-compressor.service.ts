import { Injectable } from '@nestjs/common'
import type { CompressionMode, CompressionResult } from '../domain/ai.types'
import type { IContextCompressor } from '../domain/ai.interfaces'

/**
 * Context Compressor — handles content compression based on hints.
 *
 * Architecture supports multiple compression modes:
 * - FULL: Include content verbatim
 * - REFERENCE_ONLY: Include only title + id
 * - SUMMARY: Future — deterministic extractive summary
 * - COMPRESSED: Future — truncation with ellipsis
 *
 * Current implementation supports:
 * - FULL: No compression, returns original content
 * - REFERENCE_ONLY: Returns title and node ID only
 *
 * Future implementations may include:
 * - Deterministic truncation
 * - Extractive summarization (no LLM required)
 * - LLM-based summarization (explicit opt-in)
 */
@Injectable()
export class ContextCompressor implements IContextCompressor {
  private readonly MAX_REFERENCE_LENGTH = 200
  private readonly TRUNCATION_SUFFIX = '...'

  compress(content: string, mode: CompressionMode, maxTokens: number): CompressionResult {
    const originalTokens = this.estimateTokens(content)

    switch (mode) {
      case 'FULL':
        return this.compressFull(content, originalTokens)

      case 'REFERENCE_ONLY':
        return this.compressReference(content, originalTokens)

      case 'SUMMARY':
        // Summary mode falls back to truncated compression for now
        return this.compressTruncated(content, maxTokens, originalTokens)

      case 'COMPRESSED':
        return this.compressTruncated(content, maxTokens, originalTokens)

      default:
        return this.compressFull(content, originalTokens)
    }
  }

  getSupportedModes(): readonly CompressionMode[] {
    return ['FULL', 'REFERENCE_ONLY', 'SUMMARY', 'COMPRESSED']
  }

  private compressFull(content: string, originalTokens: number): CompressionResult {
    return {
      originalTokens,
      compressedTokens: originalTokens,
      content,
      mode: 'FULL',
    }
  }

  private compressReference(content: string, originalTokens: number): CompressionResult {
    // Extract title from content (first line or first sentence)
    const title = this.extractTitle(content)
    const compressed = `[Reference: ${title}]`
    const compressedTokens = this.estimateTokens(compressed)

    return {
      originalTokens,
      compressedTokens,
      content: compressed,
      mode: 'REFERENCE_ONLY',
    }
  }

  private compressTruncated(
    content: string,
    maxTokens: number,
    originalTokens: number,
  ): CompressionResult {
    const maxChars = maxTokens * 4 // Conservative estimate
    if (content.length <= maxChars) {
      return {
        originalTokens,
        compressedTokens: originalTokens,
        content,
        mode: 'COMPRESSED',
      }
    }

    const truncated =
      content.slice(0, maxChars - this.TRUNCATION_SUFFIX.length) + this.TRUNCATION_SUFFIX
    const compressedTokens = this.estimateTokens(truncated)

    return {
      originalTokens,
      compressedTokens,
      content: truncated,
      mode: 'COMPRESSED',
    }
  }

  private extractTitle(content: string): string {
    // Try to extract title from first line
    const firstLine = content.split('\n')[0] ?? ''
    if (firstLine.length <= this.MAX_REFERENCE_LENGTH) {
      return firstLine
    }
    return firstLine.slice(0, this.MAX_REFERENCE_LENGTH) + '...'
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}
