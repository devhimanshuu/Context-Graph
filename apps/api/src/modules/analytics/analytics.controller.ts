import { Controller, Get, Inject } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role, type AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { IAnalyticsService } from './analytics.service'
import { AnalyticsSummaryDto } from './analytics.dto'

@ApiBearerAuth()
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(@Inject(IAnalyticsService) private readonly service: IAnalyticsService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.AUDITOR)
  @ApiOperation({ summary: 'Platform usage summary (ADMIN/AUDITOR only)' })
  @ApiOkResponse({ type: AnalyticsSummaryDto })
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.summary(user.organizationId)
  }
}
