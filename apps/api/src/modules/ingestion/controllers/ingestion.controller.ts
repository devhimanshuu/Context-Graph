import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { OrganizationGuard } from '../../../common/guards/organization.guard'
import type { AuthenticatedUser, EntityId } from '@contextgraph/types'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { IngestionService } from '../services/ingestion.service'
import type { DocumentIngestionRequest } from '../domain/ingestion.types'
import { ContentType, DocumentVisibility } from '../domain/ingestion.types'

/**
 * Ingestion Controller — handles document upload and management.
 *
 * Endpoints:
 * - POST /api/v1/ingestion/documents — Upload document
 * - GET /api/v1/ingestion/documents — List documents
 * - GET /api/v1/ingestion/documents/:id — Get document
 * - GET /api/v1/ingestion/documents/:id/status — Get document status
 * - POST /api/v1/ingestion/documents/:id/reprocess — Reprocess document
 * - POST /api/v1/ingestion/documents/:id/archive — Archive document
 * - DELETE /api/v1/ingestion/documents/:id — Delete document
 */
@Controller('ingestion')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('documents')
  async uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      filename: string
      content: string
      contentType: string
      workspaceId: EntityId
      departmentId?: EntityId
      tags?: string[]
      visibility?: DocumentVisibility
    },
  ) {
    const request: DocumentIngestionRequest = {
      organizationId: user.organizationId,
      workspaceId: body.workspaceId,
      userId: user.id,
      filename: body.filename,
      contentType: body.contentType as ContentType,
      content: Buffer.from(body.content, 'base64'),
      departmentId: body.departmentId,
      tags: body.tags,
      visibility: body.visibility,
    }

    return this.ingestionService.ingestDocument(request)
  }

  @Get('documents')
  async listDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('workspaceId') workspaceId?: EntityId,
  ) {
    return this.ingestionService.getDocumentsByOrganization(user.organizationId, workspaceId)
  }

  @Get('documents/:id')
  async getDocument(@CurrentUser() user: AuthenticatedUser, @Param('id') id: EntityId) {
    return this.ingestionService.getDocument(id, user.organizationId)
  }

  @Get('documents/:id/status')
  async getDocumentStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: EntityId) {
    // Verify document exists and user has access
    await this.ingestionService.getDocument(id, user.organizationId)
    return this.ingestionService.getDocumentStatus(id)
  }

  @Post('documents/:id/reprocess')
  async reprocessDocument(@CurrentUser() user: AuthenticatedUser, @Param('id') id: EntityId) {
    return this.ingestionService.reprocessDocument(id, user.organizationId)
  }

  @Post('documents/:id/archive')
  async archiveDocument(@CurrentUser() user: AuthenticatedUser, @Param('id') id: EntityId) {
    await this.ingestionService.archiveDocument(id, user.organizationId)
    return { success: true }
  }

  @Delete('documents/:id')
  async deleteDocument(@CurrentUser() user: AuthenticatedUser, @Param('id') id: EntityId) {
    await this.ingestionService.deleteDocument(id, user.organizationId)
    return { success: true }
  }
}
