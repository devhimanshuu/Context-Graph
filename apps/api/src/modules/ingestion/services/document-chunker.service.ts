import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { EntityId } from '@contextgraph/types'
import type { DocumentChunk, ChunkMetadata, DocumentSection } from '../domain/ingestion.types'
import { IDocumentChunker } from '../domain/ingestion.interfaces'

/** Default chunk configuration. */
const DEFAULT_CHUNK_SIZE = 1000
const DEFAULT_CHUNK_OVERLAP = 200

/**
 * Document Chunker Service — splits documents into chunks for indexing.
 *
 * Supports multiple chunking strategies:
 * - Section-based: Uses document structure
 * - Fixed-size: Splits by character count
 * - Hybrid: Combines section and fixed-size
 *
 * Each chunk preserves metadata for retrieval and citations.
 */
@Injectable()
export class DocumentChunkerService implements IDocumentChunker {
  private readonly logger = new Logger(DocumentChunkerService.name)

  async chunk(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    content: string,
    sections: readonly DocumentSection[],
    metadata: ChunkMetadata,
    options?: {
      chunkSize?: number
      chunkOverlap?: number
    },
  ): Promise<readonly DocumentChunk[]> {
    const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE
    const chunkOverlap = options?.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP

    this.logger.debug('Chunking document', {
      documentId,
      contentLength: content.length,
      sectionCount: sections.length,
      chunkSize,
      chunkOverlap,
    })

    let chunks: DocumentChunk[] = []

    // Try section-based chunking first
    if (sections.length > 0) {
      chunks = await this.chunkBySections(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
        chunkSize,
        chunkOverlap,
      )
    }

    // Fall back to fixed-size chunking if section-based produced no chunks
    if (chunks.length === 0) {
      chunks = await this.chunkByFixedSize(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        metadata,
        chunkSize,
        chunkOverlap,
      )
    }

    this.logger.debug('Chunking complete', {
      documentId,
      chunkCount: chunks.length,
    })

    return chunks
  }

  private async chunkBySections(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    content: string,
    sections: readonly DocumentSection[],
    metadata: ChunkMetadata,
    chunkSize: number,
    chunkOverlap: number,
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0

    for (const section of sections) {
      // If section is small enough, use it as a single chunk
      if (section.content.length <= chunkSize) {
        chunks.push(
          this.createChunk(
            documentId,
            documentVersion,
            organizationId,
            workspaceId,
            section.content,
            chunkIndex++,
            0, // startOffset
            section.content.length,
            metadata,
            section.title,
            undefined,
            section.pageNumber,
          ),
        )
      } else {
        // Split large sections into smaller chunks
        const sectionChunks = await this.splitIntoChunks(
          documentId,
          documentVersion,
          organizationId,
          workspaceId,
          section.content,
          chunkSize,
          chunkOverlap,
          metadata,
          section.title,
          chunkIndex,
          section.startIndex,
          section.pageNumber,
        )
        chunks.push(...sectionChunks)
        chunkIndex += sectionChunks.length
      }

      // Process subsections recursively
      if (section.subsections.length > 0) {
        const subsectionChunks = await this.chunkBySections(
          documentId,
          documentVersion,
          organizationId,
          workspaceId,
          section.content,
          section.subsections,
          metadata,
          chunkSize,
          chunkOverlap,
        )
        chunks.push(...subsectionChunks)
        chunkIndex += subsectionChunks.length
      }
    }

    return chunks
  }

  private async chunkByFixedSize(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    content: string,
    metadata: ChunkMetadata,
    chunkSize: number,
    chunkOverlap: number,
  ): Promise<DocumentChunk[]> {
    return this.splitIntoChunks(
      documentId,
      documentVersion,
      organizationId,
      workspaceId,
      content,
      chunkSize,
      chunkOverlap,
      metadata,
      undefined,
      0,
      0,
      undefined,
    )
  }

  private async splitIntoChunks(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    content: string,
    chunkSize: number,
    chunkOverlap: number,
    metadata: ChunkMetadata,
    sectionTitle: string | undefined,
    startIndex: number,
    startOffset: number,
    pageNumber: number | undefined,
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = []
    let currentIndex = 0
    let chunkIndex = startIndex

    while (currentIndex < content.length) {
      // Calculate end position
      let endIndex = Math.min(currentIndex + chunkSize, content.length)

      // Try to break at sentence boundary
      if (endIndex < content.length) {
        const lastSentenceEnd = this.findLastSentenceEnd(content, currentIndex, endIndex)
        if (lastSentenceEnd > currentIndex + chunkSize * 0.5) {
          endIndex = lastSentenceEnd
        }
      }

      // Extract chunk content
      const chunkContent = content.slice(currentIndex, endIndex).trim()

      if (chunkContent.length > 0) {
        chunks.push(
          this.createChunk(
            documentId,
            documentVersion,
            organizationId,
            workspaceId,
            chunkContent,
            chunkIndex++,
            startOffset + currentIndex,
            startOffset + endIndex,
            metadata,
            sectionTitle,
            undefined,
            pageNumber,
          ),
        )
      }

      // Move to next chunk with overlap
      currentIndex = endIndex - chunkOverlap
      if (currentIndex >= endIndex) {
        currentIndex = endIndex
      }
    }

    return chunks
  }

  private createChunk(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    content: string,
    chunkIndex: number,
    startOffset: number,
    endOffset: number,
    metadata: ChunkMetadata,
    section?: string,
    subsection?: string,
    page?: number,
  ): DocumentChunk {
    const chunkId = this.generateChunkId(documentId, chunkIndex, content)
    const contentHash = this.hashContent(content)

    return {
      chunkId,
      documentId,
      documentVersion,
      organizationId,
      workspaceId,
      content,
      chunkIndex,
      totalChunks: 0, // Will be updated after all chunks are created
      startOffset,
      endOffset,
      section,
      subsection,
      page,
      contentHash,
      metadata,
      createdAt: new Date().toISOString(),
    }
  }

  private generateChunkId(documentId: EntityId, chunkIndex: number, content: string): string {
    const hash = createHash('sha256')
      .update(`${documentId}:${chunkIndex}:${content.slice(0, 100)}`)
      .digest('hex')
      .slice(0, 16)
    return `chunk-${hash}`
  }

  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  private findLastSentenceEnd(content: string, start: number, end: number): number {
    const sentenceEnders = ['. ', '! ', '? ', '.\n', '!\n', '?\n']
    let lastEnd = start

    for (const ender of sentenceEnders) {
      const lastIndex = content.lastIndexOf(ender, end)
      if (lastIndex > lastEnd) {
        lastEnd = lastIndex + ender.length
      }
    }

    return lastEnd
  }
}
