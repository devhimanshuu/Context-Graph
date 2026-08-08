import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { EntityId } from '@contextgraph/types'
import type { AuditLogEntry } from '../../common/interfaces/audit-logger.interface'
import { PrismaService } from '../../database/prisma.service'
import { type AuditLogEntity } from './audit.entity'
import { prismaAuditLogToEntity } from './audit.mapper'

export interface AuditQuery {
  entityType?: string
  entityId?: string
  limit: number
  offset: number
}

export abstract class IAuditLogRepository {
  abstract record(entry: AuditLogEntry): Promise<void>
  abstract findByOrganization(
    organizationId: EntityId,
    query: AuditQuery,
  ): Promise<AuditLogEntity[]>
  abstract countByAction(organizationId: EntityId): Promise<Record<string, number>>
}

@Injectable()
export class AuditLogPrismaRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        workspaceId: entry.workspaceId,
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before:
          entry.before === null
            ? Prisma.JsonNull
            : (entry.before as unknown as Prisma.InputJsonValue),
        after:
          entry.after === null
            ? Prisma.JsonNull
            : (entry.after as unknown as Prisma.InputJsonValue),
        metadata: entry.metadata as unknown as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress,
        occurredAt: new Date(entry.occurredAt),
      },
    })
  }

  async findByOrganization(organizationId: EntityId, query: AuditQuery): Promise<AuditLogEntity[]> {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(query.entityType !== undefined ? { entityType: query.entityType } : {}),
        ...(query.entityId !== undefined ? { entityId: query.entityId } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: query.limit,
      skip: query.offset,
    })
    return rows.map((row) => prismaAuditLogToEntity(row))
  }

  async countByAction(organizationId: EntityId): Promise<Record<string, number>> {
    const rows = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where: { organizationId },
      _count: { action: true },
    })
    return Object.fromEntries(rows.map((row) => [row.action, row._count.action]))
  }
}
