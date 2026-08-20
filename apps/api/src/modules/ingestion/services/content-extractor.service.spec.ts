import { describe, it, expect, beforeEach } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { ContentExtractorService } from './content-extractor.service'
import { ContentType } from '../domain/ingestion.types'

describe('ContentExtractorService', () => {
  let service: ContentExtractorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentExtractorService],
    }).compile()

    service = module.get<ContentExtractorService>(ContentExtractorService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('supportedContentTypes', () => {
    it('should return supported content types', () => {
      const types = service.supportedContentTypes()

      expect(types).toContain(ContentType.TXT)
      expect(types).toContain(ContentType.MARKDOWN)
      expect(types).toContain(ContentType.HTML)
      expect(types).toContain(ContentType.PDF)
      expect(types).toContain(ContentType.DOCX)
      expect(types).toContain(ContentType.JSON)
    })
  })

  describe('extract', () => {
    it('should extract plain text', async () => {
      const content = 'Hello, World!\n\nThis is a test document.'
      const extracted = await service.extract(content, ContentType.TXT)

      expect(extracted.text).toBe(content)
      expect(extracted.title).toBeDefined()
      expect(extracted.sections).toBeDefined()
      expect(extracted.warnings).toHaveLength(0)
    })

    it('should extract markdown', async () => {
      const content = '# Title\n\n## Section 1\n\nContent here.\n\n## Section 2\n\nMore content.'
      const extracted = await service.extract(content, ContentType.MARKDOWN)

      expect(extracted.text).toContain('Title')
      expect(extracted.headings).toContain('Title')
      expect(extracted.headings).toContain('Section 1')
      expect(extracted.headings).toContain('Section 2')
      expect(extracted.sections.length).toBeGreaterThan(0)
    })

    it('should extract HTML', async () => {
      const content = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Main Heading</h1>
            <p>This is a paragraph.</p>
            <h2>Sub Heading</h2>
            <p>Another paragraph.</p>
          </body>
        </html>
      `
      const extracted = await service.extract(content, ContentType.HTML)

      expect(extracted.title).toBe('Test Page')
      expect(extracted.headings).toContain('Main Heading')
      expect(extracted.headings).toContain('Sub Heading')
      expect(extracted.text).toContain('This is a paragraph')
    })

    it('should extract JSON', async () => {
      const content = JSON.stringify(
        {
          title: 'JSON Document',
          content: 'Test content',
          metadata: { author: 'Test Author' },
        },
        null,
        2,
      )
      const extracted = await service.extract(content, ContentType.JSON)

      expect(extracted.title).toBe('JSON Document')
      expect(extracted.text).toContain('JSON Document')
      expect(extracted.sections.length).toBeGreaterThan(0)
    })

    it('should handle PDF extraction', async () => {
      // Simplified PDF content for testing
      const content = Buffer.from('%PDF-1.4 Test PDF content')
      const extracted = await service.extract(content, ContentType.PDF)

      expect(extracted).toBeDefined()
      expect(extracted.text).toBeDefined()
      expect(extracted.warnings.length).toBeGreaterThan(0) // Should have simplification warning
    })

    it('should handle DOCX extraction', async () => {
      // Simplified DOCX content for testing
      const content = Buffer.from('PK Test DOCX content')
      const extracted = await service.extract(content, ContentType.DOCX)

      expect(extracted).toBeDefined()
      expect(extracted.text).toBeDefined()
      expect(extracted.warnings.length).toBeGreaterThan(0) // Should have simplification warning
    })

    it('should handle extraction errors gracefully', async () => {
      const content = Buffer.from('invalid content')

      // This should not throw, but return partial content with warnings
      const extracted = await service.extract(content, ContentType.PDF)

      expect(extracted).toBeDefined()
      expect(extracted.text).toBeDefined()
    })

    it('should extract title from content', async () => {
      const content = 'My Document Title\n\nThis is the content.'
      const extracted = await service.extract(content, ContentType.TXT)

      expect(extracted.title).toBe('My Document Title')
    })

    it('should extract headings from markdown', async () => {
      const content = `
# Main Title

Some content

## Section One

More content

### Subsection

Even more content
      `
      const extracted = await service.extract(content, ContentType.MARKDOWN)

      expect(extracted.headings).toContain('Main Title')
      expect(extracted.headings).toContain('Section One')
      expect(extracted.headings).toContain('Subsection')
    })

    it('should create sections from content', async () => {
      const content = `
First paragraph with some content.

Second paragraph with different content.

Third paragraph with more content.
      `
      const extracted = await service.extract(content, ContentType.TXT)

      expect(extracted.sections.length).toBeGreaterThanOrEqual(3)
    })
  })
})
