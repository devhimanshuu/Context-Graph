import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IRuleEngineService } from './services/rule-engine.service'

/**
 * Minimal rule-engine surface. The engine itself is consumed by the pipeline
 * module (Phase 7); this read-only endpoint exposes the executed rule order
 * so the UI and operators can see exactly what a run applies.
 */
@ApiBearerAuth()
@ApiTags('Rule Engine')
@Controller('rule-engine')
export class RuleEngineController {
  constructor(@Inject(IRuleEngineService) private readonly service: IRuleEngineService) {}

  @Get('definition')
  @ApiOperation({ summary: 'Rule pipeline definition — executed rule order and version' })
  @ApiOkResponse({ schema: { type: 'object' } })
  getDefinition(): { version: number; stages: readonly string[] } {
    return this.service.getDefinition()
  }
}
