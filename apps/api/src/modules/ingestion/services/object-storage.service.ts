import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile, stat, unlink, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import type { EntityId } from '@contextgraph/types'
import type { StorageMetadata, UploadResult } from '../domain/ingestion.types'
import { IObjectStorage } from '../domain/ingestion.interfaces'

/** Base storage path for local development. */
const DEFAULT_STORAGE_PATH = './storage/documents'

/**
 * Local Object Storage — file system implementation for development/testing.
 *
 * Production deployments should use S3ObjectStorage or similar.
 */
@Injectable()
export class LocalObjectStorage implements IObjectStorage {
  private readonly logger = new Logger(LocalObjectStorage.name)
  private readonly basePath: string

  constructor() {
    this.basePath = process.env.STORAGE_PATH ?? DEFAULT_STORAGE_PATH
  }

  async upload(
    organizationId: EntityId,
    documentId: EntityId,
    filename: string,
    content: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    // Create organization-aware path
    const storagePath = this.buildStoragePath(organizationId, documentId, filename)
    const fullPath = join(this.basePath, storagePath)

    this.logger.debug('Uploading file', {
      organizationId,
      documentId,
      filename,
      size: content.length,
      storagePath,
    })

    // Ensure directory exists
    await mkdir(dirname(fullPath), { recursive: true })

    // Write file
    await writeFile(fullPath, content)

    // Calculate checksum
    const checksum = createHash('sha256').update(content).digest('hex')

    const metadata: StorageMetadata = {
      bucket: 'local',
      key: storagePath,
      size: content.length,
      contentType,
      checksum,
      lastModified: new Date().toISOString(),
    }

    return {
      storagePath,
      metadata,
    }
  }

  async download(storagePath: string): Promise<Buffer> {
    const fullPath = join(this.basePath, storagePath)

    this.logger.debug('Downloading file', { storagePath })

    return readFile(fullPath)
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = join(this.basePath, storagePath)

    this.logger.debug('Deleting file', { storagePath })

    try {
      await unlink(fullPath)
    } catch {
      // File might not exist, which is fine
      this.logger.debug('File not found for deletion', { storagePath })
    }
  }

  async getMetadata(storagePath: string): Promise<StorageMetadata> {
    const fullPath = join(this.basePath, storagePath)

    const fileStat = await stat(fullPath)
    const content = await readFile(fullPath)
    const checksum = createHash('sha256').update(content).digest('hex')

    return {
      bucket: 'local',
      key: storagePath,
      size: fileStat.size,
      contentType: 'application/octet-stream',
      checksum,
      lastModified: fileStat.mtime.toISOString(),
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    const fullPath = join(this.basePath, storagePath)

    try {
      await access(fullPath)
      return true
    } catch {
      return false
    }
  }

  private buildStoragePath(
    organizationId: EntityId,
    documentId: EntityId,
    filename: string,
  ): string {
    // Sanitize filename
    const sanitizedFilename = this.sanitizeFilename(filename)
    return join(organizationId, 'documents', documentId, 'original', sanitizedFilename)
  }

  private sanitizeFilename(filename: string): string {
    // Remove path components
    const baseName = filename.split(/[/\\]/).pop() ?? filename

    // Replace potentially dangerous characters
    return baseName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase()
  }
}

/**
 * S3 Object Storage — AWS S3 implementation for production.
 *
 * TODO: Implement when AWS SDK is available.
 */
@Injectable()
export class S3ObjectStorage implements IObjectStorage {
  private readonly logger = new Logger(S3ObjectStorage.name)

  async upload(
    _organizationId: EntityId,
    _documentId: EntityId,
    _filename: string,
    _content: Buffer,
    _contentType: string,
  ): Promise<UploadResult> {
    // TODO: Implement S3 upload
    this.logger.warn('S3 storage not implemented')
    throw new Error('S3 storage not implemented')
  }

  async download(_storagePath: string): Promise<Buffer> {
    // TODO: Implement S3 download
    this.logger.warn('S3 storage not implemented')
    throw new Error('S3 storage not implemented')
  }

  async delete(_storagePath: string): Promise<void> {
    // TODO: Implement S3 delete
    this.logger.warn('S3 storage not implemented')
    throw new Error('S3 storage not implemented')
  }

  async getMetadata(_storagePath: string): Promise<StorageMetadata> {
    // TODO: Implement S3 metadata
    this.logger.warn('S3 storage not implemented')
    throw new Error('S3 storage not implemented')
  }

  async exists(_storagePath: string): Promise<boolean> {
    // TODO: Implement S3 exists
    this.logger.warn('S3 storage not implemented')
    throw new Error('S3 storage not implemented')
  }
}
