import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IContextPipelineOrchestrator } from './orchestrator/context-pipeline-orchestrator'
import {
  contextPipelineRequestSchema,
  type ContextPipelineInput,
} from './validation/context-pipeline.validation'
import { ContextPackageDto } from './dto/context-package.dto'
import { IPipelineRunService } from './runs/pipeline-run.service'
import { IContextFormatter } from './formatter/context-formatter.contracts'
import { contextFormatSchema, type ContextFormatInput } from './formatter/context-format.validation'
import { FormattedContextDocumentDto } from './formatter/context-format.dto'

@ApiBearerAuth()
@ApiTags('Pipeline')
@Controller('pipeline/context')
export class ContextPipelineController {
  constructor(
    @Inject(IContextPipelineOrchestrator)
    private readonly orchestrator: IContextPipelineOrchestrator,
    @Inject(IPipelineRunService)
    private readonly runs: IPipelineRunService,
    @Inject(IContextFormatter)
    private readonly formatter: IContextFormatter,
  ) {}

  @Get('definition')
  @ApiOperation({ summary: 'Context pipeline definition: version + stage order' })
  definition() {
    return this.orchestrator.getDefinition()
  }

  @Post('format')
  @ApiOperation({
    summary:
      "Format a stored run's context package into a provider-independent, prompt-ready document",
  })
  @ApiOkResponse({ type: FormattedContextDocumentDto })
  async format(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(contextFormatSchema)) body: ContextFormatInput,
  ) {
    const pkg = await this.runs.reconstructPackage(user.organizationId, body.requestId)
    return this.formatter.format(pkg, { includeExclusions: body.includeExclusions })
  }

  @Post('resolve')
  @ApiOperation({
    summary:
      'Resolve a context package: user + entry node → ranked, bounded, explainable candidates',
  })
  @ApiOkResponse({ type: ContextPackageDto })
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(contextPipelineRequestSchema)) body: ContextPipelineInput,
  ) {
    return this.orchestrator.resolve(user, body)
  }
}
