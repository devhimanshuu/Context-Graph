import { Body, Controller, Inject, Param, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ReachabilityService } from './services/reachability.service'
import type { GraphTraversalResult } from './domain/traversal'
import { DebugReachabilityResponseDto } from './graph.dto'
import { reachabilityQuerySchema, type ReachabilityQueryInput } from './graph.validation'

/**
 * Debug-only graph surface, isolated under `/debug` and restricted to admins.
 * Unlike the production reachability endpoint, the workspace graph is fully
 * validated before traversal (cycles/broken edges surface as errors) and the
 * response carries the raw engine metadata — no cache is consulted.
 */
@ApiBearerAuth()
@ApiTags('Graph (debug)')
@Roles(Role.ADMIN)
@Controller('debug')
export class GraphDebugController {
  constructor(@Inject(ReachabilityService) private readonly reachability: ReachabilityService) {}

  @Post('workspaces/:workspaceId/reachability')
  @ApiOperation({
    summary: 'Debug reachability — BFS with full graph validation, raw traversal metadata',
  })
  @ApiOkResponse({ type: DebugReachabilityResponseDto })
  async computeReachability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new UuidParamPipe()) workspaceId: string,
    @Body(new ZodValidationPipe(reachabilityQuerySchema)) body: ReachabilityQueryInput,
  ): Promise<DebugReachabilityResponseDto> {
    const result = await this.reachability.computeValidated(user.organizationId, workspaceId, body)
    return this.toDebugDto(result)
  }

  private toDebugDto(result: GraphTraversalResult): DebugReachabilityResponseDto {
    return {
      entryNodeId: result.entryNodeId,
      validatedGraph: true,
      nodeIds: result.nodes.map((node) => node.id),
      distances: Object.fromEntries(result.distances),
      order: Object.fromEntries(result.order),
      nodes: result.nodes.map((node) => ({
        id: node.id,
        distance: node.distance,
        order: node.order,
        parentIds: [...node.parentIds],
      })),
      metadata: {
        visitedNodeCount: result.metadata.visitedNodeCount,
        traversalDepth: result.metadata.traversalDepth,
        edgesExamined: result.metadata.edgesExamined,
        duplicateVisitsPrevented: result.metadata.duplicateVisitsPrevented,
        maxQueueSize: result.metadata.maxQueueSize,
        traversalDurationMs: result.metadata.traversalDurationMs,
        truncated: result.truncated,
      },
    }
  }
}
