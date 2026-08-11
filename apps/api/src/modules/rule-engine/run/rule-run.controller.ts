import { Body, Controller, Inject, Post } from '@nestjs/common'
import type { AuthenticatedUser } from '@contextgraph/types'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { IRuleRunService } from './rule-run.service'
import { ruleRunSchema, type RuleRunInput } from './rule-run.validation'
import { RuleRunResponseDto } from './rule-run.dto'

@ApiBearerAuth()
@ApiTags('Rule Engine')
@Controller('rule-engine')
export class RuleRunController {
  constructor(@Inject(IRuleRunService) private readonly service: IRuleRunService) {}

  @Post('run')
  @ApiOperation({
    summary: 'Run the deterministic rule pipeline over a node set — full funnel + per-node reasons',
  })
  @ApiOkResponse({ type: RuleRunResponseDto })
  run(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(ruleRunSchema)) body: RuleRunInput,
  ) {
    return this.service.run(user, body)
  }
}
