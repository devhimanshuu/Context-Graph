/* Write Audit Logger — immutable append-only audit trail for proposals.

Every proposal action creates an audit record. The logger produces events
that can be correlated with pipeline runs, MCP sessions, and agent executions. */

import { Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import { IWriteAuditLogger } from '../domain/writeback.interfaces'

interface AuditRecord {
  eventId: string
  organizationId: string
  actorId: string | null
  agentIdentityId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  decision: string | null
  reasonCode: string | null
  metadata: Record<string, unknown>
  timestamp: string
}

/** In-memory audit store — production would use the existing audit infrastructure. */
const auditRecords: AuditRecord[] = []

@Injectable()
export class WriteAuditLogger implements IWriteAuditLogger {
  async recordEvent(data: {
    organizationId: EntityId
    actorId: EntityId | null
    agentIdentityId: string | null
    action: string
    resourceType: string
    resourceId: EntityId | null
    decision: string | null
    reasonCode: string | null
    metadata: Record<string, unknown>
  }): Promise<{ eventId: string }> {
    const eventId = uuid()

    const record: AuditRecord = {
      eventId,
      organizationId: data.organizationId,
      actorId: data.actorId,
      agentIdentityId: data.agentIdentityId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      decision: data.decision,
      reasonCode: data.reasonCode,
      metadata: data.metadata,
      timestamp: new Date().toISOString(),
    }

    // Append-only: never update or delete.
    auditRecords.push(record)

    return { eventId }
  }

  /** Query audit records for a specific organization (for dashboard/admin). */
  async findByOrganization(organizationId: EntityId, limit = 50): Promise<AuditRecord[]> {
    return auditRecords
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }
}
