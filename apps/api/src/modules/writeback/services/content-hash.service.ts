/* Content Hash Service — deterministic hashing for proposal deduplication.

Computes a SHA-256 hash from normalized content + structural metadata.
Supports idempotency and duplicate detection without storing raw content
for comparison. */

import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { IContentHashService } from '../domain/writeback.interfaces'

@Injectable()
export class ContentHashService implements IContentHashService {
  /**
   * Compute a deterministic SHA-256 content hash from normalized proposal inputs.
   * The hash is stable across whitespace variations, Unicode normalization,
   * and metadata key ordering.
   */
  computeHash(nodeType: string, title: string, content: string, classification: string): string {
    // Normalize: trim, collapse whitespace, NFC unicode normalization.
    const normalizedTitle = this.normalizeText(title)
    const normalizedContent = this.normalizeText(content)
    const normalizedType = nodeType.toUpperCase().trim()
    const normalizedClassification = classification.toUpperCase().trim()

    // Deterministic canonical form.
    const canonical = [
      `type:${normalizedType}`,
      `title:${normalizedTitle}`,
      `content:${normalizedContent}`,
      `classification:${normalizedClassification}`,
    ].join('|')

    return createHash('sha256').update(canonical, 'utf8').digest('hex')
  }

  /** Normalize text for stable hashing: trim, collapse whitespace, NFC. */
  private normalizeText(text: string): string {
    return text.normalize('NFC').trim().replace(/\s+/g, ' ')
  }
}
