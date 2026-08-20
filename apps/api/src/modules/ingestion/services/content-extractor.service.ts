import { Injectable, Logger } from '@nestjs/common'
import type { ExtractedDocument, DocumentSection, SourceMetadata } from '../domain/ingestion.types'
import { ContentType } from '../domain/ingestion.types'
import { IContentExtractor } from '../domain/ingestion.interfaces'

/**
 * Content Extractor Service — extracts text content from various document formats.
 *
 * Supports:
 * - Plain text
 * - Markdown
 * - HTML
 * - PDF (simplified)
 * - DOCX (simplified)
 *
 * NOTE: For production, use dedicated libraries like pdf-parse, mammoth, etc.
 */
@Injectable()
export class ContentExtractorService implements IContentExtractor {
  private readonly logger = new Logger(ContentExtractorService.name)

  async extract(
    content: Buffer | string,
    contentType: ContentType,
    metadata?: Record<string, unknown>,
  ): Promise<ExtractedDocument> {
    const contentSize = Buffer.isBuffer(content) ? content.length : content.length
    this.logger.debug('Extracting content', { contentType, size: contentSize })

    const textContent = Buffer.isBuffer(content) ? content.toString('utf-8') : content
    const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
    const warnings: string[] = []

    try {
      switch (contentType) {
        case ContentType.TXT:
          return this.extractText(textContent, metadata)
        case ContentType.MARKDOWN:
          return this.extractMarkdown(textContent, metadata)
        case ContentType.HTML:
          return this.extractHtml(textContent, metadata)
        case ContentType.PDF:
          return this.extractPdf(contentBuffer, metadata)
        case ContentType.DOCX:
          return this.extractDocx(contentBuffer, metadata)
        case ContentType.JSON:
          return this.extractJson(textContent, metadata)
        default:
          throw new Error(`Unsupported content type: ${contentType}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error('Extraction failed', { contentType, error: message })
      warnings.push(`Extraction warning: ${message}`)

      // Return partial content if possible
      return {
        text: textContent.slice(0, 10000),
        title: (metadata?.title as string) ?? 'Untitled',
        sections: [],
        headings: [],
        sourceMetadata: this.createSourceMetadata(contentType, contentSize),
        warnings,
      }
    }
  }

  supportedContentTypes(): readonly ContentType[] {
    return [
      ContentType.TXT,
      ContentType.MARKDOWN,
      ContentType.HTML,
      ContentType.PDF,
      ContentType.DOCX,
      ContentType.JSON,
    ]
  }

  private extractText(content: string, metadata?: Record<string, unknown>): ExtractedDocument {
    const title = this.extractTitleFromContent(content) ?? (metadata?.title as string) ?? 'Untitled'
    const sections = this.splitIntoSections(content)
    const headings = this.extractHeadings(content)

    return {
      text: content,
      title,
      sections,
      headings,
      sourceMetadata: this.createSourceMetadata(ContentType.TXT, content.length),
      warnings: [],
    }
  }

  private extractMarkdown(content: string, metadata?: Record<string, unknown>): ExtractedDocument {
    // Extract title from first heading or metadata
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch?.[1] ?? (metadata?.title as string) ?? 'Untitled'

    // Extract headings
    const headings: string[] = []
    const headingRegex = /^#{1,6}\s+(.+)$/gm
    let match: RegExpExecArray | null
    while ((match = headingRegex.exec(content)) !== null) {
      if (match[1]) {
        headings.push(match[1])
      }
    }

    // Split into sections based on headings
    const sections = this.splitMarkdownIntoSections(content)

    // Clean markdown syntax for plain text
    const cleanText = this.cleanMarkdownSyntax(content)

    return {
      text: cleanText,
      title,
      sections,
      headings,
      sourceMetadata: this.createSourceMetadata(ContentType.MARKDOWN, content.length),
      warnings: [],
    }
  }

  private extractHtml(content: string, metadata?: Record<string, unknown>): ExtractedDocument {
    // Extract title from <title> tag or metadata
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1] ?? (metadata?.title as string) ?? 'Untitled'

    // Extract headings
    const headings: string[] = []
    const headingRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi
    let match: RegExpExecArray | null
    while ((match = headingRegex.exec(content)) !== null) {
      if (match[1]) {
        headings.push(match[1])
      }
    }

    // Strip HTML tags for plain text
    const plainText = this.stripHtmlTags(content)

    // Split into sections
    const sections = this.splitIntoSections(plainText)

    return {
      text: plainText,
      title,
      sections,
      headings,
      sourceMetadata: this.createSourceMetadata(ContentType.HTML, content.length),
      warnings: [],
    }
  }

  private extractPdf(content: Buffer, metadata?: Record<string, unknown>): ExtractedDocument {
    // NOTE: This is a simplified PDF extraction.
    // For production, use pdf-parse or similar library.

    this.logger.warn('PDF extraction is simplified - use pdf-parse for production')

    // Try to extract text from PDF buffer (basic heuristic)
    const text = this.extractTextFromPdfBuffer(content)

    return {
      text,
      title: (metadata?.title as string) ?? 'Untitled PDF',
      sections: this.splitIntoSections(text),
      headings: [],
      pageInfo: [],
      sourceMetadata: this.createSourceMetadata(ContentType.PDF, content.length ?? 0),
      warnings: ['PDF extraction is simplified - content may be incomplete'],
    }
  }

  private extractDocx(content: Buffer, metadata?: Record<string, unknown>): ExtractedDocument {
    // NOTE: This is a simplified DOCX extraction.
    // For production, use mammoth or similar library.

    this.logger.warn('DOCX extraction is simplified - use mammoth for production')

    // Try to extract text from DOCX buffer (basic heuristic)
    const text = this.extractTextFromDocxBuffer(content)

    return {
      text,
      title: (metadata?.title as string) ?? 'Untitled Document',
      sections: this.splitIntoSections(text),
      headings: [],
      sourceMetadata: this.createSourceMetadata(ContentType.DOCX, content.length ?? 0),
      warnings: ['DOCX extraction is simplified - content may be incomplete'],
    }
  }

  private extractJson(content: string, metadata?: Record<string, unknown>): ExtractedDocument {
    try {
      const json = JSON.parse(content)
      const text = JSON.stringify(json, null, 2)

      return {
        text,
        title: (metadata?.title as string) ?? json.title ?? 'JSON Document',
        sections: this.splitIntoSections(text),
        headings: [],
        sourceMetadata: this.createSourceMetadata(ContentType.JSON, content.length),
        warnings: [],
      }
    } catch {
      return {
        text: content,
        title: (metadata?.title as string) ?? 'Invalid JSON',
        sections: [],
        headings: [],
        sourceMetadata: this.createSourceMetadata(ContentType.JSON, content.length),
        warnings: ['Invalid JSON format'],
      }
    }
  }

  private extractTitleFromContent(content: string): string | null {
    // Try to find title from first line or heading
    const lines = content.split('\n').filter((line) => line.trim().length > 0)
    if (lines.length > 0) {
      const firstLine = lines[0]
      if (firstLine) {
        const trimmed = firstLine.trim()
        // Check if it looks like a title (not too long, not a sentence)
        if (trimmed.length < 100 && !trimmed.endsWith('.')) {
          return trimmed
        }
      }
    }
    return null
  }

  private splitIntoSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = []
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

    paragraphs.forEach((paragraph, index) => {
      const trimmed = paragraph.trim()
      if (trimmed.length > 0) {
        sections.push({
          id: `section-${index}`,
          title: trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : ''),
          content: trimmed,
          level: 1,
          startIndex: content.indexOf(paragraph),
          endIndex: content.indexOf(paragraph) + paragraph.length,
          subsections: [],
        })
      }
    })

    return sections
  }

  private extractHeadings(content: string): string[] {
    const headings: string[] = []

    // Check for markdown headings
    const markdownHeadings = content.match(/^#{1,6}\s+(.+)$/gm)
    if (markdownHeadings) {
      headings.push(...markdownHeadings.map((h) => h.replace(/^#{1,6}\s+/, '')))
    }

    // Check for underlined headings (=== or ---)
    const lines = content.split('\n')
    for (let i = 0; i < lines.length - 1; i++) {
      const nextLine = lines[i + 1]
      const currentLine = lines[i]
      if (currentLine && nextLine && (/^={3,}$/.test(nextLine) || /^-{3,}$/.test(nextLine))) {
        headings.push(currentLine.trim())
      }
    }

    return headings
  }

  private splitMarkdownIntoSections(content: string): DocumentSection[] {
    const sections: DocumentSection[] = []
    const lines = content.split('\n')
    let currentSection: {
      id: string
      title: string
      content: string
      level: number
      startIndex: number
      endIndex: number
      subsections: DocumentSection[]
    } | null = null
    let sectionIndex = 0

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        if (currentSection) {
          sections.push(currentSection as DocumentSection)
        }
        currentSection = {
          id: `section-${sectionIndex++}`,
          title: headingMatch[2],
          content: '',
          level: headingMatch[1].length,
          startIndex: content.indexOf(line),
          endIndex: content.indexOf(line) + line.length,
          subsections: [],
        }
      } else if (currentSection) {
        currentSection.content += line + '\n'
      }
    }

    if (currentSection) {
      sections.push(currentSection as DocumentSection)
    }

    return sections
  }

  private cleanMarkdownSyntax(content: string): string {
    return content
      .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
      .replace(/^[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/^>\s+/gm, '') // Remove blockquote markers
      .replace(/---+/g, '') // Remove horizontal rules
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
  }

  private stripHtmlTags(content: string): string {
    return content
      .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
      .replace(/<style[\s\S]*?<\/style>/gi, '') // Remove style tags
      .replace(/<[^>]+>/g, ' ') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&') // Replace &amp;
      .replace(/&lt;/g, '<') // Replace &lt;
      .replace(/&gt;/g, '>') // Replace &gt;
      .replace(/&quot;/g, '"') // Replace &quot;
      .replace(/&#39;/g, "'") // Replace &#39;
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim()
  }

  private extractTextFromPdfBuffer(content: Buffer): string {
    // Simplified PDF text extraction
    // Look for text streams in PDF content
    const text = content.toString('utf-8')

    // Extract text between BT and ET markers (PDF text objects)
    const textMatches = text.match(/BT[\s\S]*?ET/g) ?? []
    let extractedText = ''

    for (const match of textMatches) {
      // Extract text from TJ and Tj operators
      const tjMatches = match.match(/\(([^)]+)\)\s*Tj/g) ?? []
      for (const tj of tjMatches) {
        const textContent = tj.match(/\(([^)]+)\)/)?.[1]
        if (textContent) {
          extractedText += textContent + ' '
        }
      }
    }

    return extractedText.trim() || 'Unable to extract text from PDF'
  }

  private extractTextFromDocxBuffer(content: Buffer): string {
    // Simplified DOCX text extraction
    // DOCX is a ZIP file containing XML
    const text = content.toString('utf-8')

    // Look for text content in XML
    const textMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) ?? []
    let extractedText = ''

    for (const match of textMatches) {
      const textContent = match.match(/<w:t[^>]*>([^<]+)<\/w:t>/)?.[1]
      if (textContent) {
        extractedText += textContent + ' '
      }
    }

    return extractedText.trim() || 'Unable to extract text from DOCX'
  }

  private createSourceMetadata(contentType: ContentType, size: number): SourceMetadata {
    return {
      filename: '',
      contentType,
      size,
      checksum: '',
      extractedAt: new Date().toISOString(),
      extractionMethod: 'contextgraph-extractor-v1',
    }
  }
}
