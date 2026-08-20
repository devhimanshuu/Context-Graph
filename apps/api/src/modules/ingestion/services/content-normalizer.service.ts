import { Injectable, Logger } from '@nestjs/common'
import type {
  ExtractedDocument,
  NormalizedContent,
  NormalizationChange,
  DocumentSection,
} from '../domain/ingestion.types'
import { IContentNormalizer } from '../domain/ingestion.interfaces'

/**
 * Content Normalizer Service — normalizes extracted content for consistent processing.
 *
 * Normalization includes:
 * - Whitespace normalization
 * - Unicode normalization
 * - Line break normalization
 * - Removal of repeated headers/footers
 * - Cleaning extraction artifacts
 *
 * The goal is normalization, NOT summarization. Content meaning is preserved.
 */
@Injectable()
export class ContentNormalizerService implements IContentNormalizer {
  private readonly logger = new Logger(ContentNormalizerService.name)

  async normalize(extracted: ExtractedDocument): Promise<NormalizedContent> {
    this.logger.debug('Normalizing content', {
      title: extracted.title,
      textLength: extracted.text.length,
      sectionCount: extracted.sections.length,
    })

    const changes: NormalizationChange[] = []
    let normalizedText = extracted.text

    // 1. Normalize Unicode
    const { text: unicodeNormalized, changes: unicodeChanges } =
      this.normalizeUnicode(normalizedText)
    normalizedText = unicodeNormalized
    changes.push(...unicodeChanges)

    // 2. Normalize whitespace
    const { text: whitespaceNormalized, changes: whitespaceChanges } =
      this.normalizeWhitespace(normalizedText)
    normalizedText = whitespaceNormalized
    changes.push(...whitespaceChanges)

    // 3. Normalize line breaks
    const { text: lineBreakNormalized, changes: lineBreakChanges } =
      this.normalizeLineBreaks(normalizedText)
    normalizedText = lineBreakNormalized
    changes.push(...lineBreakChanges)

    // 4. Remove repeated headers/footers
    const { text: headerFooterRemoved, changes: headerFooterChanges } =
      this.removeRepeatedHeadersFooters(normalizedText)
    normalizedText = headerFooterRemoved
    changes.push(...headerFooterChanges)

    // 5. Clean extraction artifacts
    const { text: artifactsCleaned, changes: artifactChanges } =
      this.cleanExtractionArtifacts(normalizedText)
    normalizedText = artifactsCleaned
    changes.push(...artifactChanges)

    // 6. Normalize sections
    const normalizedSections = this.normalizeSections(extracted.sections)

    this.logger.debug('Normalization complete', {
      originalLength: extracted.text.length,
      normalizedLength: normalizedText.length,
      changesCount: changes.length,
    })

    return {
      text: normalizedText,
      sections: normalizedSections,
      normalizedAt: new Date().toISOString(),
      changes,
    }
  }

  private normalizeUnicode(text: string): { text: string; changes: NormalizationChange[] } {
    const changes: NormalizationChange[] = []
    let normalized = text

    // Normalize to NFC (Canonical Decomposition, followed by Canonical Composition)
    const nfcNormalized = normalized.normalize('NFC')
    if (nfcNormalized !== normalized) {
      changes.push({
        type: 'UNICODE_NORMALIZATION',
        description: 'Normalized Unicode to NFC form',
      })
      normalized = nfcNormalized
    }

    // Replace common unicode lookalikes with ASCII equivalents
    const unicodeReplacements: [RegExp, string][] = [
      [/\u2018|\u2019|\u201A|\u201B|\u2032|\u2035/g, "'"], // Smart single quotes
      [/\u201C|\u201D|\u201E|\u201F|\u2033|\u2036/g, '"'], // Smart double quotes
      [/\u2013|\u2014|\u2015/g, '-'], // En/em dashes
      [/\u2026/g, '...'], // Ellipsis
      [/\u00A0/g, ' '], // Non-breaking space
      [
        /\u2000|\u2001|\u2002|\u2003|\u2004|\u2005|\u2006|\u2007|\u2008|\u2009|\u200A|\u200B|\u200C|\u200D|\u200E|\u200F/g,
        '',
      ], // Various spaces
    ]

    for (const [pattern, replacement] of unicodeReplacements) {
      if (pattern.test(normalized)) {
        normalized = normalized.replace(pattern, replacement)
        changes.push({
          type: 'UNICODE_REPLACEMENT',
          description: `Replaced unicode characters with ASCII equivalents`,
        })
      }
    }

    return { text: normalized, changes }
  }

  private normalizeWhitespace(text: string): { text: string; changes: NormalizationChange[] } {
    const changes: NormalizationChange[] = []
    let normalized = text

    // Replace multiple spaces with single space (but preserve newlines)
    const spaceNormalized = normalized.replace(/[^\S\n]+/g, ' ')
    if (spaceNormalized !== normalized) {
      changes.push({
        type: 'WHITESPACE_NORMALIZATION',
        description: 'Collapsed multiple spaces into single space',
      })
      normalized = spaceNormalized
    }

    // Remove trailing whitespace from lines
    const trailingWhitespaceRemoved = normalized.replace(/[ \t]+$/gm, '')
    if (trailingWhitespaceRemoved !== normalized) {
      changes.push({
        type: 'TRAILING_WHITESPACE',
        description: 'Removed trailing whitespace from lines',
      })
      normalized = trailingWhitespaceRemoved
    }

    // Remove leading whitespace from lines (except indentation)
    const leadingWhitespaceRemoved = normalized.replace(/^[ \t]+/gm, '')
    if (leadingWhitespaceRemoved !== normalized) {
      changes.push({
        type: 'LEADING_WHITESPACE',
        description: 'Removed leading whitespace from lines',
      })
      normalized = leadingWhitespaceRemoved
    }

    return { text: normalized, changes }
  }

  private normalizeLineBreaks(text: string): { text: string; changes: NormalizationChange[] } {
    const changes: NormalizationChange[] = []
    let normalized = text

    // Normalize line endings to Unix style
    const unixNormalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (unixNormalized !== normalized) {
      changes.push({
        type: 'LINE_ENDING_NORMALIZATION',
        description: 'Normalized line endings to Unix format',
      })
      normalized = unixNormalized
    }

    // Remove excessive blank lines (more than 2 consecutive)
    const excessiveBlankLinesRemoved = normalized.replace(/\n{3,}/g, '\n\n')
    if (excessiveBlankLinesRemoved !== normalized) {
      changes.push({
        type: 'EXCESSIVE_BLANK_LINES',
        description: 'Removed excessive blank lines',
      })
      normalized = excessiveBlankLinesRemoved
    }

    return { text: normalized, changes }
  }

  private removeRepeatedHeadersFooters(text: string): {
    text: string
    changes: NormalizationChange[]
  } {
    const changes: NormalizationChange[] = []
    const lines = text.split('\n')

    // Detect repeated lines at the beginning or end of the document
    const headerLines = this.detectRepeatedLines(lines.slice(0, 10))
    const footerLines = this.detectRepeatedLines(lines.slice(-10))

    let normalized = text

    if (headerLines.length > 0) {
      for (const line of headerLines) {
        normalized = normalized.replace(new RegExp(`^${this.escapeRegex(line)}\\n`, 'gm'), '')
      }
      changes.push({
        type: 'HEADER_REMOVAL',
        description: `Removed ${headerLines.length} repeated header line(s)`,
      })
    }

    if (footerLines.length > 0) {
      for (const line of footerLines) {
        normalized = normalized.replace(new RegExp(`\\n${this.escapeRegex(line)}$`, 'gm'), '')
      }
      changes.push({
        type: 'FOOTER_REMOVAL',
        description: `Removed ${footerLines.length} repeated footer line(s)`,
      })
    }

    return { text: normalized, changes }
  }

  private cleanExtractionArtifacts(text: string): { text: string; changes: NormalizationChange[] } {
    const changes: NormalizationChange[] = []
    let normalized = text

    // Remove common extraction artifacts using string replacement
    normalized = normalized.replace(/\f/g, '\n') // Form feeds
    // eslint-disable-next-line no-control-regex
    normalized = normalized.replace(/\x00/g, '') // Null bytes
    // eslint-disable-next-line no-control-regex
    normalized = normalized.replace(/\x08/g, '') // Backspace
    // eslint-disable-next-line no-control-regex
    normalized = normalized.replace(/\x0B/g, '\n') // Vertical tab
    // eslint-disable-next-line no-control-regex
    normalized = normalized.replace(/\x0C/g, '\n') // Form feed

    changes.push({
      type: 'ARTIFACT_REMOVAL',
      description: 'Removed extraction artifacts',
    })

    // Remove page numbers (common patterns)
    const pageNumberPatterns = [
      /Page \d+ of \d+/gi,
      /^\d+$/gm, // Lines that are just numbers
      /^-\d+-$/gm, // Page numbers with dashes
      /^\d+\s*$/gm, // Page numbers at end of lines
    ]

    for (const pattern of pageNumberPatterns) {
      if (pattern.test(normalized)) {
        normalized = normalized.replace(pattern, '')
        changes.push({
          type: 'PAGE_NUMBER_REMOVAL',
          description: 'Removed page numbers',
        })
      }
    }

    return { text: normalized, changes }
  }

  private normalizeSections(sections: readonly DocumentSection[]): DocumentSection[] {
    return sections.map((section) => ({
      ...section,
      content: this.normalizeText(section.content),
      subsections: this.normalizeSections(section.subsections),
    }))
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\n{3,}/g, '\n\n') // Limit blank lines
      .trim()
  }

  private detectRepeatedLines(lines: readonly string[]): string[] {
    const lineCounts = new Map<string, number>()

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.length > 0) {
        lineCounts.set(trimmed, (lineCounts.get(trimmed) ?? 0) + 1)
      }
    }

    const repeated: string[] = []
    for (const [line, count] of lineCounts) {
      if (count >= 2) {
        repeated.push(line)
      }
    }

    return repeated
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
