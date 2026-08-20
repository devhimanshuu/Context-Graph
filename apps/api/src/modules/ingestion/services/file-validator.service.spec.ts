import { describe, it, expect, beforeEach } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { FileValidatorService } from './file-validator.service'

describe('FileValidatorService', () => {
  let service: FileValidatorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileValidatorService],
    }).compile()

    service = module.get<FileValidatorService>(FileValidatorService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('validate', () => {
    it('should validate a valid text file', async () => {
      const filename = 'test.txt'
      const content = Buffer.from('Hello, World!')
      const contentType = 'text/plain'

      const result = await service.validate(filename, content, contentType)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.metadata.filename).toBe(filename)
      expect(result.metadata.contentType).toBe('text/plain')
      expect(result.metadata.size).toBe(content.length)
    })

    it('should reject empty files', async () => {
      const filename = 'empty.txt'
      const content = Buffer.from('')
      const contentType = 'text/plain'

      const result = await service.validate(filename, content, contentType)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('File is empty')
    })

    it('should reject files exceeding size limit', async () => {
      const filename = 'large.txt'
      const content = Buffer.alloc(60 * 1024 * 1024) // 60MB
      const contentType = 'text/plain'

      const result = await service.validate(filename, content, contentType)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('File size exceeds limit'))).toBe(true)
    })

    it('should reject unsupported file types', async () => {
      const filename = 'test.exe'
      const content = Buffer.from('executable content')
      const contentType = 'application/x-executable'

      const result = await service.validate(filename, content, contentType)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Unsupported file type'))).toBe(true)
    })

    it('should validate PDF files', async () => {
      const filename = 'document.pdf'
      const content = Buffer.from('%PDF-1.4 test content')
      const contentType = 'application/pdf'

      const result = await service.validate(filename, content, contentType)

      expect(result.valid).toBe(true)
      expect(result.metadata.contentType).toBe('application/pdf')
    })

    it('should validate DOCX files', async () => {
      const filename = 'document.docx'
      const content = Buffer.from('PK test content') // DOCX is a ZIP file
      const contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

      const result = await service.validate(filename, content, contentType)

      expect(result.valid).toBe(true)
      expect(result.metadata.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )
    })

    it('should detect path traversal in filename', async () => {
      const filename = '../../../etc/passwd'
      const content = Buffer.from('sensitive data')
      const contentType = 'text/plain'

      const result = await service.validate(filename, content, contentType)

      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('invalid characters'))).toBe(true)
    })

    it('should detect suspicious patterns', async () => {
      const filename = 'malicious.html'
      const content = Buffer.from('<script>alert("xss")</script>')
      const contentType = 'text/html'

      const result = await service.validate(filename, content, contentType)

      expect(result.warnings.some((w) => w.includes('suspicious patterns'))).toBe(true)
    })

    it('should calculate correct checksum', async () => {
      const filename = 'test.txt'
      const content = Buffer.from('Hello, World!')
      const contentType = 'text/plain'

      const result = await service.validate(filename, content, contentType)

      expect(result.metadata.checksum).toBeDefined()
      expect(result.metadata.checksum.length).toBe(64) // SHA-256 hex length
    })
  })
})
