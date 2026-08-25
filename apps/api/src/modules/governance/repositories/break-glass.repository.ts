/* Break-glass repository — Prisma-based persistence for emergency access. */

import { Injectable } from '@nestjs/common'
import type { BreakGlassAccess, BreakGlassStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type { IBreakGlassRepository, BreakGlassCreateData } from '../domain/governance.interfaces'

function toBreakGlass(row: Record<string, unknown>): BreakGlassAccess {
  return {
    accessId: row.id as string,
    organizationId: row.organizationId as string,
    userId: row.userId as string,
    permissions: (row.permissions as string[]) ?? [],
    reason: row.reason as string,
    grantedBy: row.grantedBy as string,
    status: row.status as BreakGlassStatus,
    expiresAt:
      row.expiresAt instanceof Date ? row.expiresAt.toISOString() : (row.expiresAt as string),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
  }
}

@Injectable()
export class BreakGlassPrismaRepository implements IBreakGlassRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: BreakGlassCreateData): Promise<BreakGlassAccess> {
    const row = await this.prisma.breakGlassAccess.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        permissions: data.permissions as never,
        reason: data.reason,
        grantedBy: data.grantedBy,
        status: 'ACTIVE',
        expiresAt: new Date(data.expiresAt),
      },
    })
    return toBreakGlass(row as unknown as Record<string, unknown>)
  }

  async findActiveByUser(
    userId: EntityId,
    organizationId: EntityId,
  ): Promise<BreakGlassAccess | null> {
    const row = await this.prisma.breakGlassAccess.findFirst({
      where: { userId, organizationId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    })
    return row === null ? null : toBreakGlass(row as unknown as Record<string, unknown>)
  }

  async revoke(accessId: EntityId): Promise<void> {
    await this.prisma.breakGlassAccess.update({
      where: { id: accessId },
      data: { status: 'REVOKED' },
    })
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.breakGlassAccess.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    })
    return result.count
  }
}
