import { Injectable } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { ContentType, ContentTypeExtensions } from '../domain/ingestion.types'
import type { FileValidationResult, FileMetadata } from '../domain/ingestion.types'
import { IFileValidator } from '../domain/ingestion.interfaces'

/** Default file size limits. */
const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const DEFAULT_MIN_FILE_SIZE = 1 // 1 byte

/** Default allowed content types. */
const DEFAULT_ALLOWED_CONTENT_TYPES = [
  ContentType.PDF,
  ContentType.DOCX,
  ContentType.TXT,
  ContentType.MARKDOWN,
  ContentType.HTML,
  ContentType.JSON,
]

@Injectable()
export class FileValidatorService implements IFileValidator {
  async validate(
    filename: string,
    content: Buffer,
    contentType: string,
    options?: {
      maxFileSize?: number
      allowedContentTypes?: readonly string[]
    },
  ): Promise<FileValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    const maxFileSize = options?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
    const allowedContentTypes = options?.allowedContentTypes ?? DEFAULT_ALLOWED_CONTENT_TYPES

    // Calculate checksum
    const checksum = createHash('sha256').update(content).digest('hex')

    // Get file extension
    const extension = this.getExtension(filename)

    // Determine content type from extension if not provided
    const detectedContentType = this.detectContentType(filename, contentType)

    // Validate filename
    if (!filename || filename.trim().length === 0) {
      errors.push('Filename is required')
    }

    if (filename.length > 255) {
      errors.push('Filename is too long (max 255 characters)')
    }

    // Check for path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      errors.push('Filename contains invalid characters')
    }

    // Validate file size
    if (content.length < DEFAULT_MIN_FILE_SIZE) {
      errors.push('File is empty')
    }

    if (content.length > maxFileSize) {
      errors.push(`File size exceeds limit (${this.formatSize(maxFileSize)})`)
    }

    // Validate content type
    if (!detectedContentType) {
      errors.push(`Unsupported file type: ${extension || 'unknown'}`)
    } else if (!allowedContentTypes.includes(detectedContentType as ContentType)) {
      errors.push(`Content type not allowed: ${detectedContentType}`)
    }

    // Validate extension matches content type
    if (detectedContentType && extension) {
      const expectedExtension = this.getExtensionForContentType(detectedContentType)
      if (expectedExtension && extension !== expectedExtension) {
        warnings.push(
          `File extension "${extension}" doesn't match content type "${detectedContentType}"`,
        )
      }
    }

    // Check for suspicious file patterns
    if (this.hasSuspiciousPattern(content)) {
      warnings.push('File contains potentially suspicious patterns')
    }

    const metadata: FileMetadata = {
      filename,
      contentType: detectedContentType as ContentType,
      size: content.length,
      extension,
      checksum,
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata,
    }
  }

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1) return ''
    return filename.slice(lastDot).toLowerCase()
  }

  private detectContentType(filename: string, providedContentType: string): string | null {
    // First try to detect from extension
    const extension = this.getExtension(filename)
    if (extension && ContentTypeExtensions[extension]) {
      return ContentTypeExtensions[extension]
    }

    // Fall back to provided content type
    if (providedContentType) {
      const parts = providedContentType.split(';')
      const normalized = (parts[0] ?? '').trim().toLowerCase()
      if (normalized && DEFAULT_ALLOWED_CONTENT_TYPES.includes(normalized as ContentType)) {
        return normalized
      }
    }

    return null
  }

  private getExtensionForContentType(contentType: string): string | null {
    for (const [ext, type] of Object.entries(ContentTypeExtensions)) {
      if (type === contentType) return ext
    }
    return null
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  private hasSuspiciousPattern(content: Buffer): boolean {
    const text = content.toString('utf-8').toLowerCase()

    // Check for executable patterns
    const suspiciousPatterns = [
      '<script',
      'javascript:',
      'eval(',
      'document.cookie',
      'window.location',
    ]

    return suspiciousPatterns.some((pattern) => text.includes(pattern))
  }
}
