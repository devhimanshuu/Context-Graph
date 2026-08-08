import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IRulesService } from './rule.service'
import { ContextRuleResponseDto } from './rule.dto'
import {
  createRuleSchema,
  updateRuleSchema,
  type CreateRuleInput,
  type UpdateRuleInput,
} from './rule.validation'

@ApiBearerAuth()
@ApiTags('Rules')
@Controller()
export class RulesController {
  constructor(@Inject(IRulesService) private readonly service: IRulesService) {}

  @Get('workspaces/:workspaceId/rules')
  @ApiOperation({ summary: 'List active rules in a workspace (rule engine input)' })
  @ApiOkResponse({ type: ContextRuleResponseDto, isArray: true })
  activeByWorkspace(@Param('workspaceId', new UuidParamPipe()) workspaceId: string) {
    return this.service.findActiveByWorkspace(workspaceId)
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Get a rule by id' })
  @ApiOkResponse({ type: ContextRuleResponseDto })
  findById(@Param('id', new UuidParamPipe()) id: string) {
    return this.service.findById(id)
  }

  @Post('rules')
  @Roles(Role.ADMIN, Role.QUALITY, Role.HOD)
  @ApiOperation({ summary: 'Create a rule (ADMIN/QUALITY/HOD only)' })
  @ApiOkResponse({ type: ContextRuleResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createRuleSchema)) body: CreateRuleInput,
  ) {
    return this.service.create(user.organizationId, user.id, body)
  }

  @Patch('rules/:id')
  @Roles(Role.ADMIN, Role.QUALITY, Role.HOD)
  @ApiOperation({ summary: 'Update a rule' })
  @ApiOkResponse({ type: ContextRuleResponseDto })
  update(
    @Param('id', new UuidParamPipe()) id: string,
    @Body(new ZodValidationPipe(updateRuleSchema)) body: UpdateRuleInput,
  ) {
    return this.service.update(id, body)
  }

  @Delete('rules/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a rule (ADMIN only)' })
  remove(@Param('id', new UuidParamPipe()) id: string) {
    return this.service.remove(id)
  }
}
