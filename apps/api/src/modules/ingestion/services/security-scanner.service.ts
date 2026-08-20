import { Injectable, Logger } from '@nestjs/common'
import type { SecurityScanResult } from '../domain/ingestion.types'
import { IFileSecurityScanner } from '../domain/ingestion.interfaces'

/** Known malicious file signatures (simplified for demonstration). */
const MALICIOUS_SIGNATURES = [
  // Executable patterns
  Buffer.from('MZ'), // PE executable
  Buffer.from('\x7fELF'), // ELF executable
  // Script injection patterns
  Buffer.from('<script'),
  Buffer.from('javascript:'),
  Buffer.from('VBScript'),
]

/** Maximum file size for scanning (100MB). */
const MAX_SCAN_SIZE = 100 * 1024 * 1024

/**
 * Security Scanner Service — validates uploaded files for potential threats.
 *
 * NOTE: This is a simplified implementation for development/testing.
 * Production deployments should integrate with a real malware scanner
 * like ClamAV, AWS GuardDuty, or similar.
 */
@Injectable()
export class SecurityScannerService implements IFileSecurityScanner {
  private readonly logger = new Logger(SecurityScannerService.name)

  async scan(filename: string, content: Buffer, contentType: string): Promise<SecurityScanResult> {
    const threats: string[] = []
    const scannedAt = new Date().toISOString()

    this.logger.debug('Scanning file', {
      filename,
      size: content.length,
      contentType,
    })

    // Check file size
    if (content.length > MAX_SCAN_SIZE) {
      threats.push(`File exceeds maximum scan size (${MAX_SCAN_SIZE / (1024 * 1024)}MB)`)
    }

    // Check for null bytes (potential binary injection)
    if (this.containsNullBytes(content)) {
      threats.push('File contains null bytes')
    }

    // Check for malicious signatures
    const signatureThreats = this.checkMaliciousSignatures(content, contentType)
    threats.push(...signatureThreats)

    // Check for polyglot files (files that are valid in multiple formats)
    if (this.isPolyglotFile(content, contentType)) {
      threats.push('File appears to be a polyglot (valid in multiple formats)')
    }

    // Check for zip bombs (for archive-like content)
    if (this.isPotentialZipBomb(content, contentType)) {
      threats.push('File appears to be a potential zip bomb')
    }

    const safe = threats.length === 0

    if (!safe) {
      this.logger.warn('Security threats detected', {
        filename,
        threats,
      })
    }

    return {
      safe,
      threats,
      scanner: 'contextgraph-security-scanner-v1',
      scannedAt,
    }
  }

  private containsNullBytes(content: Buffer): boolean {
    // Check for null bytes in first 8KB (header)
    const headerSize = Math.min(content.length, 8192)
    for (let i = 0; i < headerSize; i++) {
      if (content[i] === 0) {
        return true
      }
    }
    return false
  }

  private checkMaliciousSignatures(content: Buffer, contentType: string): string[] {
    const threats: string[] = []

    // Only check for executable signatures in non-executable content types
    const executableTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/html']

    if (!executableTypes.includes(contentType)) {
      return threats
    }

    for (const signature of MALICIOUS_SIGNATURES) {
      if (content.includes(signature)) {
        threats.push(`File contains potentially malicious signature: ${signature.toString('hex')}`)
      }
    }

    return threats
  }

  private isPolyglotFile(content: Buffer, _contentType: string): boolean {
    // Simple heuristic: check if file starts with multiple format signatures
    const hasPdfHeader = content.slice(0, 5).toString() === '%PDF-'
    const hasJpegHeader = content[0] === 0xff && content[1] === 0xd8
    const hasPngHeader = content.slice(0, 8).toString('hex') === '89504e470d0a1a0a'
    const hasGifHeader =
      content.slice(0, 6).toString() === 'GIF87a' || content.slice(0, 6).toString() === 'GIF89a'

    const formatCount = [hasPdfHeader, hasJpegHeader, hasPngHeader, hasGifHeader].filter(
      Boolean,
    ).length

    return formatCount > 1
  }

  private isPotentialZipBomb(content: Buffer, contentType: string): boolean {
    // Check for ZIP-based formats (DOCX, etc.)
    const zipFormats = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip',
    ]

    if (!zipFormats.includes(contentType)) {
      return false
    }

    // Simple heuristic: very small file with ZIP header
    const hasZipHeader = content[0] === 0x50 && content[1] === 0x4b
    if (hasZipHeader && content.length < 1000) {
      // Could be a zip bomb if it's very small but claims to be a large document
      return true
    }

    return false
  }
}
