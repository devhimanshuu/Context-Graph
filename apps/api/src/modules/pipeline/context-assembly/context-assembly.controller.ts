import { Body, Controller, Inject, Post } from '@nestjs/common'
import type { AuthenticatedUser } from '@contextgraph/types'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { IContextAssemblyService } from './context-assembly.service'
import { contextAssemblySchema, type ContextAssemblyInput } from './context-assembly.validation'
import { ContextAssemblyResponseDto } from './context-assembly.dto'

@ApiBearerAuth()
@ApiTags('Pipeline')
@Controller('pipeline')
export class ContextAssemblyController {
  constructor(@Inject(IContextAssemblyService) private readonly service: IContextAssemblyService) {}

  @Post('contexts')
  @ApiOperation({
    summary: 'Assemble a token-budgeted context package: reachability → rules → budget',
  })
  @ApiOkResponse({ type: ContextAssemblyResponseDto })
  assemble(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(contextAssemblySchema)) body: ContextAssemblyInput,
  ) {
    return this.service.assemble(user, body)
  }
}
