import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IGraphService } from './graph.service'
import { GraphEdgeResponseDto, ReachabilityResponseDto } from './graph.dto'
import { reachabilityQuerySchema, type ReachabilityQueryInput } from './graph.validation'

@ApiBearerAuth()
@ApiTags('Graph')
@Controller()
export class GraphController {
  constructor(@Inject(IGraphService) private readonly graphService: IGraphService) {}

  @Get('workspaces/:workspaceId/edges')
  @ApiOperation({ summary: 'List graph edges in a workspace (org-scoped)' })
  @ApiOkResponse({ type: GraphEdgeResponseDto, isArray: true })
  edges(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new UuidParamPipe()) workspaceId: string,
  ) {
    return this.graphService.getWorkspaceEdges(user.organizationId, workspaceId)
  }

  @Post('workspaces/:workspaceId/reachability')
  @ApiOperation({ summary: 'Compute reachable nodes from an entry node (BFS lands in Phase 6)' })
  @ApiOkResponse({ type: ReachabilityResponseDto })
  reachability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', new UuidParamPipe()) workspaceId: string,
    @Body(new ZodValidationPipe(reachabilityQuerySchema)) body: ReachabilityQueryInput,
  ) {
    return this.graphService.reachableNodes(user.organizationId, workspaceId, body)
  }
}
