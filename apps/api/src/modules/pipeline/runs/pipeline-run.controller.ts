import { Controller, Get, Inject, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { UuidParamPipe } from '../../../common/pipes/uuid-param.pipe'
import { IPipelineRunService } from './pipeline-run.service'
import { PipelineRunResponseDto } from './pipeline-run.dto'
import { pipelineRunListSchema, type PipelineRunListInput } from './pipeline-run.validation'
import { IContextPipelineOrchestrator } from '../orchestrator/context-pipeline-orchestrator'
import { ContextPackageDto } from '../dto/context-package.dto'
import type { PipelineMode } from '../contracts/context-pipeline.contracts'

@ApiBearerAuth()
@ApiTags('Pipeline')
@Controller('pipeline/runs')
export class PipelineRunController {
  constructor(
    @Inject(IPipelineRunService) private readonly runs: IPipelineRunService,
    @Inject(IContextPipelineOrchestrator)
    private readonly orchestrator: IContextPipelineOrchestrator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List pipeline runs (newest first), org-scoped' })
  @ApiOkResponse({ type: PipelineRunResponseDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(pipelineRunListSchema)) query: PipelineRunListInput,
  ) {
    return this.runs.listByWorkspace(user.organizationId, query)
  }

  @Get(':requestId')
  @ApiParam({ name: 'requestId', description: 'The run request id (UUID)' })
  @ApiOperation({ summary: 'Fetch one immutable pipeline run by request id' })
  @ApiOkResponse({ type: PipelineRunResponseDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId', UuidParamPipe) requestId: string,
  ) {
    return this.runs.findByRequestId(user.organizationId, requestId)
  }

  @Post(':requestId/replay')
  @ApiParam({ name: 'requestId', description: 'The run request id (UUID)' })
  @ApiOperation({
    summary: 'Replay a historical run deterministically (same inputs + evaluatedAt, fresh ids)',
  })
  @ApiOkResponse({ type: ContextPackageDto })
  async replay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId', UuidParamPipe) requestId: string,
  ) {
    const run = await this.runs.findByRequestId(user.organizationId, requestId)
    return this.orchestrator.resolve(user, {
      workspaceId: run.workspaceId,
      entryNodeId: run.entryNodeId,
      maxDepth: run.maxDepth,
      strategy: run.strategy as 'bfs' | 'weighted',
      tokenBudget: run.tokenBudget,
      maxCandidates: run.maxCandidates,
      mode: run.mode as PipelineMode,
      evaluatedAt: run.evaluatedAt,
    })
  }
}
