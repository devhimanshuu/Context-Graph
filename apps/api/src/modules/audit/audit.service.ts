import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { IAuditLogRepository } from './audit.repository'
import { type AuditLogResponseDto } from './audit.dto'
import { entityToAuditLogResponse } from './audit.mapper'
import type { AuditQueryInput } from './audit.validation'

export abstract class IAuditService {
  abstract list(organizationId: EntityId, query: AuditQueryInput): Promise<AuditLogResponseDto[]>
  abstract summary(organizationId: EntityId): Promise<Record<string, number>>
}

@Injectable()
export class AuditService implements IAuditService {
  constructor(@Inject(IAuditLogRepository) private readonly repository: IAuditLogRepository) {}

  async list(organizationId: EntityId, query: AuditQueryInput): Promise<AuditLogResponseDto[]> {
    const entries = await this.repository.findByOrganization(organizationId, {
      entityType: query.entityType,
      entityId: query.entityId,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    })
    return entries.map((entry) => entityToAuditLogResponse(entry))
  }

  async summary(organizationId: EntityId): Promise<Record<string, number>> {
    return this.repository.countByAction(organizationId)
  }
}
