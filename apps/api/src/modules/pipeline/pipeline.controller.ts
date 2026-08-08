import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IPipelineService } from './pipeline.service'
import { pipelineRequestSchema, type PipelineRequestInput } from './pipeline.validation'
import { PipelineResponseDto } from './pipeline.dto'

@ApiBearerAuth()
@ApiTags('Pipeline')
@Controller('pipeline')
export class PipelineController {
  constructor(@Inject(IPipelineService) private readonly service: IPipelineService) {}

  @Get()
  @ApiOperation({ summary: 'Pipeline definition: ordered stages + version' })
  definition() {
    return this.service.getDefinition()
  }

  @Post('execute')
  @ApiOperation({ summary: 'Run the pipeline (stages execute as they are wired)' })
  @ApiOkResponse({ type: PipelineResponseDto })
  execute(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(pipelineRequestSchema)) body: PipelineRequestInput,
  ) {
    return this.service.execute(user, body)
  }
}
