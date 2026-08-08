import type { AuditLog } from '@prisma/client'
import { AuditLogEntity } from './audit.entity'
import { type AuditLogResponseDto } from './audit.dto'

export function prismaAuditLogToEntity(row: AuditLog): AuditLogEntity {
  return new AuditLogEntity(
    row.id,
    row.organizationId,
    row.workspaceId,
    row.actorId,
    row.action,
    row.entityType as AuditLogEntity['entityType'],
    row.entityId,
    row.before as Record<string, unknown> | null,
    row.after as Record<string, unknown> | null,
    row.metadata as Record<string, unknown>,
    row.ipAddress,
    row.occurredAt.toISOString(),
    // AuditLog has no createdAt column — occurredAt is the append time.
    row.occurredAt.toISOString(),
  )
}

export function entityToAuditLogResponse(entity: AuditLogEntity): AuditLogResponseDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    workspaceId: entity.workspaceId,
    actorId: entity.actorId,
    action: entity.action,
    entityType: entity.entityType,
    entityId: entity.entityId,
    metadata: entity.metadata,
    ipAddress: entity.ipAddress,
    occurredAt: entity.occurredAt,
  }
}
