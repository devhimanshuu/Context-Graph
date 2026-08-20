import { Inject, Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type { EntityId } from '@contextgraph/types'
import type { ChunkingConfiguration, TextChunk, ChunkMetadata } from '../domain/retrieval.types'
import type { IChunker, IContentHasher } from '../domain/retrieval.interfaces'

/**
 * Content Hasher — creates deterministic content hashes.
 *
 * Used for:
 * - Detecting unchanged content (skip re-embedding)
 * - Chunk identity
 * - Cache keys
 */
@Injectable()
export class ContentHasher implements IContentHasher {
  hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16)
  }

  hashChunk(chunk: TextChunk): string {
    const hasher = crypto.createHash('sha256')
    hasher.update(chunk.nodeId)
    hasher.update(String(chunk.chunkIndex))
    hasher.update(chunk.content)
    return hasher.digest('hex').slice(0, 16)
  }
}

/**
 * Chunker Service — splits text into semantically meaningful chunks.
 *
 * Features:
 * - Configurable chunk size and overlap
 * - Sentence boundary preservation
 * - Paragraph boundary preservation
 * - Metadata preservation
 * - Deterministic chunk IDs based on content
 *
 * Chunking Strategy:
 * 1. Split by paragraphs (if preserveParagraphBoundaries)
 * 2. Split by sentences (if preserveSentenceBoundaries)
 * 3. Split by word boundaries
 * 4. Apply overlap between chunks
 */
@Injectable()
export class ChunkerService implements IChunker {
  private readonly defaultConfig: ChunkingConfiguration = {
    maxChunkSize: 1000,
    overlapSize: 200,
    preserveSentenceBoundaries: true,
    preserveParagraphBoundaries: true,
  }

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  chunk(
    content: string,
    nodeId: EntityId,
    metadata: ChunkMetadata,
    config?: Partial<ChunkingConfiguration>,
  ): readonly TextChunk[] {
    const finalConfig = { ...this.defaultConfig, ...config }

    this.logger.debug('Chunking content', {
      nodeId,
      contentLength: content.length,
      maxChunkSize: finalConfig.maxChunkSize,
    })

    if (content.length === 0) {
      return []
    }

    const chunks: TextChunk[] = []
    let remaining = content
    let chunkIndex = 0
    let startOffset = 0

    while (remaining.length > 0) {
      const { chunkText, consumedLength } = this.extractChunk(remaining, finalConfig)

      if (chunkText.length === 0) {
        // Safety: if we can't extract any text, take what's left
        const chunk = this.createChunk(
          remaining,
          nodeId,
          metadata,
          chunkIndex,
          startOffset,
          startOffset + remaining.length,
        )
        chunks.push(chunk)
        break
      }

      const chunk = this.createChunk(
        chunkText,
        nodeId,
        metadata,
        chunkIndex,
        startOffset,
        startOffset + consumedLength,
      )
      chunks.push(chunk)

      // Move forward with overlap
      const advanceBy = Math.max(1, consumedLength - finalConfig.overlapSize)
      remaining = remaining.slice(advanceBy)
      startOffset += advanceBy
      chunkIndex++
    }

    // Update total chunks in all chunks
    const totalChunks = chunks.length
    const finalChunks = chunks.map((chunk) => ({
      ...chunk,
      totalChunks,
    }))

    this.logger.debug('Content chunked', {
      nodeId,
      chunkCount: finalChunks.length,
    })

    return finalChunks
  }

  getConfiguration(): ChunkingConfiguration {
    return this.defaultConfig
  }

  private extractChunk(
    text: string,
    config: ChunkingConfiguration,
  ): { chunkText: string; consumedLength: number } {
    if (text.length <= config.maxChunkSize) {
      return { chunkText: text, consumedLength: text.length }
    }

    // Try to split at paragraph boundary
    if (config.preserveParagraphBoundaries) {
      const paragraphBreak = this.findParagraphBreak(text, config.maxChunkSize)
      if (paragraphBreak > 0) {
        return {
          chunkText: text.slice(0, paragraphBreak),
          consumedLength: paragraphBreak,
        }
      }
    }

    // Try to split at sentence boundary
    if (config.preserveSentenceBoundaries) {
      const sentenceBreak = this.findSentenceBreak(text, config.maxChunkSize)
      if (sentenceBreak > 0) {
        return {
          chunkText: text.slice(0, sentenceBreak),
          consumedLength: sentenceBreak,
        }
      }
    }

    // Fall back to word boundary
    const wordBreak = this.findWordBreak(text, config.maxChunkSize)
    return {
      chunkText: text.slice(0, wordBreak),
      consumedLength: wordBreak,
    }
  }

  private findParagraphBreak(text: string, maxLength: number): number {
    const truncated = text.slice(0, maxLength)
    const lastParagraph = truncated.lastIndexOf('\n\n')
    if (lastParagraph > maxLength * 0.5) {
      return lastParagraph + 2
    }
    return 0
  }

  private findSentenceBreak(text: string, maxLength: number): number {
    const truncated = text.slice(0, maxLength)
    // Look for sentence endings
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n']
    let lastBreak = 0

    for (const ender of sentenceEnders) {
      const index = truncated.lastIndexOf(ender)
      if (index > lastBreak && index > maxLength * 0.5) {
        lastBreak = index + ender.length
      }
    }

    return lastBreak
  }

  private findWordBreak(text: string, maxLength: number): number {
    const truncated = text.slice(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.5) {
      return lastSpace + 1
    }
    return maxLength
  }

  private createChunk(
    content: string,
    nodeId: EntityId,
    metadata: ChunkMetadata,
    chunkIndex: number,
    startOffset: number,
    endOffset: number,
  ): TextChunk {
    const chunkId = this.generateChunkId(nodeId, chunkIndex, content)

    return {
      chunkId,
      nodeId,
      content,
      chunkIndex,
      totalChunks: 0, // Will be updated later
      startOffset,
      endOffset,
      contentHash: crypto.createHash('sha256').update(content).digest('hex').slice(0, 16),
      metadata: { ...metadata },
    }
  }

  private generateChunkId(nodeId: EntityId, chunkIndex: number, content: string): string {
    // Deterministic chunk ID based on node, index, and content hash
    const hasher = crypto.createHash('sha256')
    hasher.update(nodeId)
    hasher.update(String(chunkIndex))
    hasher.update(content)
    return hasher.digest('hex').slice(0, 16)
  }
}
