import { Injectable, Logger } from '@nestjs/common'
import type { ExtractedDocument, ContentType } from '../domain/ingestion.types'
import { IMetadataExtractor } from '../domain/ingestion.interfaces'

/**
 * Metadata Extractor Service — extracts deterministic metadata from documents.
 *
 * Extracts:
 * - Title
 * - Author (if available)
 * - Document type
 * - Tags
 * - Dates
 * - Language
 * - Word count
 * - Section names
 *
 * Does NOT use LLM for extraction (deterministic only).
 */
@Injectable()
export class MetadataExtractorService implements IMetadataExtractor {
  private readonly logger = new Logger(MetadataExtractorService.name)

  async extract(
    extracted: ExtractedDocument,
    filename: string,
    contentType: ContentType,
  ): Promise<Record<string, unknown>> {
    this.logger.debug('Extracting metadata', {
      filename,
      contentType,
      textLength: extracted.text.length,
    })

    const metadata: Record<string, unknown> = {
      filename,
      contentType,
      extractedAt: new Date().toISOString(),
    }

    // Extract title
    const title = this.extractTitle(extracted, filename)
    if (title) {
      metadata.title = title
    }

    // Extract author
    const author = this.extractAuthor(extracted)
    if (author) {
      metadata.author = author
    }

    // Extract document type
    const documentType = this.extractDocumentType(extracted, filename, contentType)
    metadata.documentType = documentType

    // Extract tags
    const tags = this.extractTags(extracted, filename)
    metadata.tags = tags

    // Extract dates
    const dates = this.extractDates(extracted)
    if (dates.length > 0) {
      metadata.dates = dates
    }

    // Calculate word count
    const wordCount = this.calculateWordCount(extracted.text)
    metadata.wordCount = wordCount

    // Calculate character count
    metadata.characterCount = extracted.text.length

    // Extract language
    const language = this.detectLanguage(extracted.text)
    metadata.language = language

    // Extract section names
    const sectionNames = extracted.headings
    if (sectionNames.length > 0) {
      metadata.sectionNames = sectionNames
    }

    // Extract page count if available
    if (extracted.pageInfo && extracted.pageInfo.length > 0) {
      metadata.pageCount = extracted.pageInfo.length
    }

    this.logger.debug('Metadata extraction complete', {
      filename,
      metadataKeys: Object.keys(metadata),
    })

    return metadata
  }

  private extractTitle(extracted: ExtractedDocument, filename: string): string | null {
    // Use extracted title if available
    if (extracted.title && extracted.title !== 'Untitled') {
      return extracted.title
    }

    // Try to extract from first heading
    if (extracted.headings.length > 0) {
      return extracted.headings[0] ?? null
    }

    // Fall back to filename
    return this.filenameToTitle(filename)
  }

  private extractAuthor(extracted: ExtractedDocument): string | null {
    // Look for common author patterns in text
    const authorPatterns = [
      /(?:by|author|written by|authored by)[:\s]+([^\n]+)/i,
      /(?:author|creator)[:\s]+([^\n]+)/i,
    ]

    for (const pattern of authorPatterns) {
      const match = extracted.text.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }

  private extractDocumentType(
    extracted: ExtractedDocument,
    filename: string,
    _contentType: ContentType,
  ): string {
    // Determine document type from content and filename
    const text = extracted.text.toLowerCase()
    const fname = filename.toLowerCase()

    // Check for policy documents
    if (text.includes('policy') || text.includes('policies') || fname.includes('policy')) {
      return 'POLICY'
    }

    // Check for procedure documents
    if (
      text.includes('procedure') ||
      text.includes('step-by-step') ||
      fname.includes('procedure')
    ) {
      return 'PROCEDURE'
    }

    // Check for guidelines
    if (text.includes('guideline') || text.includes('guidelines') || fname.includes('guideline')) {
      return 'GUIDELINE'
    }

    // Check for reports
    if (text.includes('report') || fname.includes('report')) {
      return 'REPORT'
    }

    // Check for specifications
    if (text.includes('specification') || text.includes('spec') || fname.includes('spec')) {
      return 'SPECIFICATION'
    }

    // Check for documentation
    if (text.includes('documentation') || fname.includes('doc')) {
      return 'DOCUMENTATION'
    }

    // Default to document
    return 'DOCUMENT'
  }

  private extractTags(extracted: ExtractedDocument, filename: string): string[] {
    const tags: string[] = []
    const text = extracted.text.toLowerCase()
    const fname = filename.toLowerCase()

    // Common tags based on content
    const tagPatterns: [RegExp, string][] = [
      [/compliance|regulatory|regulation/gi, 'compliance'],
      [/security|secure|protection/gi, 'security'],
      [/privacy|confidential|private/gi, 'privacy'],
      [/safety|safe|risk/gi, 'safety'],
      [/quality|standard/gi, 'quality'],
      [/training|education/gi, 'training'],
      [/technical|technical/gi, 'technical'],
      [/legal|law|legal/gi, 'legal'],
      [/financial|finance|accounting/gi, 'financial'],
      [/medical|clinical|healthcare/gi, 'medical'],
    ]

    for (const [pattern, tag] of tagPatterns) {
      if (pattern.test(text) || pattern.test(fname)) {
        tags.push(tag)
      }
    }

    return [...new Set(tags)] // Remove duplicates
  }

  private extractDates(extracted: ExtractedDocument): Array<{ type: string; value: string }> {
    const dates: Array<{ type: string; value: string }> = []
    const text = extracted.text

    // Common date patterns
    const datePatterns: [RegExp, string][] = [
      [
        /(?:effective|start|beginning)(?:\s+date)?[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi,
        'effective',
      ],
      [
        /(?:expiration|end|expiry)(?:\s+date)?[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi,
        'expiration',
      ],
      [/(?:updated|modified|revised)(?:\s+on)?[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi, 'updated'],
      [/(?:created|published)(?:\s+on)?[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/gi, 'created'],
    ]

    for (const [pattern, type] of datePatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          dates.push({ type, value: match[1] })
        }
      }
    }

    return dates
  }

  private calculateWordCount(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'for']
    const spanishWords = ['el', 'la', 'los', 'las', 'de', 'en', 'un', 'una', 'que', 'por']
    const frenchWords = ['le', 'la', 'les', 'de', 'des', 'un', 'une', 'et', 'est', 'en']

    const textLower = text.toLowerCase()
    const words = textLower.split(/\s+/)

    const countMatches = (wordList: string[]) => {
      return words.filter((word) => wordList.includes(word)).length
    }

    const englishCount = countMatches(englishWords)
    const spanishCount = countMatches(spanishWords)
    const frenchCount = countMatches(frenchWords)

    if (englishCount > spanishCount && englishCount > frenchCount) {
      return 'en'
    } else if (spanishCount > frenchCount) {
      return 'es'
    } else if (frenchCount > 0) {
      return 'fr'
    }

    return 'en' // Default to English
  }

  private filenameToTitle(filename: string): string {
    // Remove extension
    const name = filename.replace(/\.[^/.]+$/, '')

    // Replace underscores and hyphens with spaces
    const withSpaces = name.replace(/[_-]/g, ' ')

    // Capitalize first letter of each word
    return withSpaces
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
}
