import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IAuditService } from './audit.service'
import { AuditLogResponseDto } from './audit.dto'
import { auditQuerySchema, type AuditQueryInput } from './audit.validation'

@ApiBearerAuth()
@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(@Inject(IAuditService) private readonly service: IAuditService) {}

  @Get()
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: 'List audit events (ADMIN/AUDITOR only)' })
  @ApiOkResponse({ type: AuditLogResponseDto, isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(auditQuerySchema)) query: AuditQueryInput,
  ) {
    return this.service.list(user.organizationId, query)
  }

  @Get('summary')
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: 'Audit events grouped by action (ADMIN/AUDITOR only)' })
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(user.organizationId)
  }
}
