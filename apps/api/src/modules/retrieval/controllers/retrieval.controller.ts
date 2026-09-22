import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RetrievalService } from '../services/retrieval.service'
import { SearchRetrievalDto } from '../dto/search-retrieval.dto'

/**
 * Retrieval Controller — exposes retrieval API endpoints.
 *
 * Endpoints:
 * - POST /api/v1/retrieval/search — Execute hybrid retrieval
 *
 * Security:
 * - Requires authentication (JWT via Passport)
 * - Organization-scoped queries
 * - Authorization applied before results returned
 */
@ApiTags('Retrieval')
@ApiBearerAuth()
@Controller('retrieval')
export class RetrievalController {
  private readonly logger = new Logger(RetrievalController.name)

  constructor(private readonly retrievalService: RetrievalService) {}

  /**
   * Execute hybrid retrieval search.
   *
   * Combines graph, semantic, and lexical retrieval
   * with Reciprocal Rank Fusion.
   */
  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute hybrid retrieval search',
    description:
      'Combines graph, semantic, and lexical retrieval with Reciprocal Rank Fusion to find relevant knowledge nodes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Retrieval results with candidates and metrics',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async search(@CurrentUser() user: AuthenticatedUser, @Body() dto: SearchRetrievalDto) {
    this.logger.debug('Retrieval search request', {
      userId: user.id,
      organizationId: user.organizationId,
      mode: dto.mode,
      queryLength: dto.userQuery.length,
    })

    const result = await this.retrievalService.retrieve(user, {
      userQuery: dto.userQuery,
      workspaceId: dto.workspaceId ?? '',
      entryNodeId: dto.entryNodeId,
      topK: {
        graphTopK: dto.graphTopK ?? 20,
        semanticTopK: dto.semanticTopK ?? 20,
        lexicalTopK: dto.lexicalTopK ?? 20,
        finalTopK: dto.finalTopK ?? 50,
      },
      filters: {
        nodeTypes: dto.nodeTypes,
        statuses: dto.statuses,
        complianceTags: dto.complianceTags,
        departments: dto.departments,
      },
      mode: dto.mode ?? 'HYBRID',
      configuration: {
        enableGraph: dto.enableGraph ?? true,
        enableSemantic: dto.enableSemantic ?? true,
        enableLexical: dto.enableLexical ?? true,
        semanticWeight: dto.semanticWeight ?? 1.0,
        graphWeight: dto.graphWeight ?? 1.0,
        lexicalWeight: dto.lexicalWeight ?? 1.0,
        minSimilarity: dto.minSimilarity ?? 0.5,
      },
    })

    return {
      success: true,
      data: result,
    }
  }
}
