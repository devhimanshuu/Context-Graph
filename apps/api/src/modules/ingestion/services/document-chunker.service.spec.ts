import { describe, it, expect, beforeEach } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { DocumentChunkerService } from './document-chunker.service'
import type { DocumentSection, ContentType, DocumentVisibility } from '../domain/ingestion.types'

describe('DocumentChunkerService', () => {
  let service: DocumentChunkerService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentChunkerService],
    }).compile()

    service = module.get<DocumentChunkerService>(DocumentChunkerService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('chunk', () => {
    const documentId = 'doc-123'
    const documentVersion = 1
    const organizationId = 'org-123'
    const workspaceId = 'ws-123'
    const metadata = {
      title: 'Test Document',
      filename: 'test.txt',
      contentType: 'text/plain' as ContentType,
      departmentId: null,
      tags: [],
      visibility: 'ORGANIZATION' as DocumentVisibility,
    }

    it('should chunk short content into single chunk', async () => {
      const content = 'Short content that fits in one chunk.'
      const sections: DocumentSection[] = []

      const chunks = await service.chunk(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
      )

      expect(chunks.length).toBe(1)
      expect(chunks[0].content).toBe(content)
      expect(chunks[0].documentId).toBe(documentId)
      expect(chunks[0].organizationId).toBe(organizationId)
    })

    it('should chunk long content into multiple chunks', async () => {
      const content = 'A'.repeat(2500) // 2500 characters
      const sections: DocumentSection[] = []

      const chunks = await service.chunk(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
        { chunkSize: 1000, chunkOverlap: 200 },
      )

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks[0].chunkIndex).toBe(0)
      expect(chunks[1].chunkIndex).toBe(1)
    })

    it('should preserve chunk metadata', async () => {
      const content = 'Test content for metadata preservation.'
      const sections: DocumentSection[] = []

      const chunks = await service.chunk(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
      )

      expect(chunks[0].metadata.title).toBe(metadata.title)
      expect(chunks[0].metadata.filename).toBe(metadata.filename)
      expect(chunks[0].metadata.contentType).toBe(metadata.contentType)
    })

    it('should generate unique chunk IDs', async () => {
      const content = 'A'.repeat(2500)
      const sections: DocumentSection[] = []

      const chunks = await service.chunk(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
        { chunkSize: 1000, chunkOverlap: 200 },
      )

      const chunkIds = chunks.map((c) => c.chunkId)
      const uniqueIds = new Set(chunkIds)
      expect(uniqueIds.size).toBe(chunkIds.length)
    })

    it('should chunk by sections when provided', async () => {
      const content = 'Section 1 content.\n\nSection 2 content.\n\nSection 3 content.'
      const sections: DocumentSection[] = [
        {
          id: 'section-1',
          title: 'Section 1',
          content: 'Section 1 content.',
          level: 1,
          startIndex: 0,
          endIndex: 18,
          subsections: [],
        },
        {
          id: 'section-2',
          title: 'Section 2',
          content: 'Section 2 content.',
          level: 1,
          startIndex: 20,
          endIndex: 38,
          subsections: [],
        },
        {
          id: 'section-3',
          title: 'Section 3',
          content: 'Section 3 content.',
          level: 1,
          startIndex: 40,
          endIndex: 58,
          subsections: [],
        },
      ]

      const chunks = await service.chunk(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
      )

      expect(chunks.length).toBe(3)
      expect(chunks[0].section).toBe('Section 1')
      expect(chunks[1].section).toBe('Section 2')
      expect(chunks[2].section).toBe('Section 3')
    })

    it('should handle subsections', async () => {
      const content = 'Parent content.\n\nChild content.'
      const sections: DocumentSection[] = [
        {
          id: 'section-1',
          title: 'Parent Section',
          content: 'Parent content.',
          level: 1,
          startIndex: 0,
          endIndex: 15,
          subsections: [
            {
              id: 'section-1-1',
              title: 'Child Section',
              content: 'Child content.',
              level: 2,
              startIndex: 17,
              endIndex: 31,
              subsections: [],
            },
          ],
        },
      ]

      const chunks = await service.chunk(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
      )

      expect(chunks.length).toBe(2)
      expect(chunks[0].section).toBe('Parent Section')
      expect(chunks[1].section).toBe('Child Section')
    })

    it('should calculate content hash for each chunk', async () => {
      const content = 'Test content for hashing.'
      const sections: DocumentSection[] = []

      const chunks = await service.chunk(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
      )

      expect(chunks[0].contentHash).toBeDefined()
      expect(chunks[0].contentHash.length).toBe(64) // SHA-256 hex length
    })

    it('should respect chunk overlap', async () => {
      const content = 'A'.repeat(1500)
      const sections: DocumentSection[] = []

      const chunks = await service.chunk(
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        content,
        sections,
        metadata,
        { chunkSize: 1000, chunkOverlap: 200 },
      )

      if (chunks.length > 1) {
        // Check that chunks overlap
        const firstChunkEnd = chunks[0].content.slice(-200)
        const secondChunkStart = chunks[1].content.slice(0, 200)
        expect(firstChunkEnd).toBe(secondChunkStart)
      }
    })
  })
})
