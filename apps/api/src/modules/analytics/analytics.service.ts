import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { IAuditLogRepository } from '../audit/audit.repository'
import { type AnalyticsSummaryDto } from './analytics.dto'

export abstract class IAnalyticsService {
  abstract summary(organizationId: EntityId): Promise<AnalyticsSummaryDto>
}

@Injectable()
export class AnalyticsService implements IAnalyticsService {
  constructor(@Inject(IAuditLogRepository) private readonly auditRepository: IAuditLogRepository) {}

  async summary(organizationId: EntityId): Promise<AnalyticsSummaryDto> {
    const eventsByAction = await this.auditRepository.countByAction(organizationId)
    const totalAuditEvents = Object.values(eventsByAction).reduce((sum, count) => sum + count, 0)
    return { totalAuditEvents, eventsByAction }
  }
}
