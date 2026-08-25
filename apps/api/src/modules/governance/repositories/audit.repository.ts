/* Audit repository — Prisma-based persistence for immutable audit events with hash chain. */

import { Injectable } from '@nestjs/common'
import { createHash } from 'crypto'
import type {
  GovernanceAuditEvent,
  AuditEventType,
  AuditOutcome,
  EntityId,
  Timestamp,
} from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IAuditRepository,
  AuditEventCreateData,
  AuditFilters,
  AuditChainVerification,
} from '../domain/governance.interfaces'

function toAuditEvent(row: Record<string, unknown>): GovernanceAuditEvent {
  return {
    eventId: row.id as string,
    organizationId: row.organizationId as string,
    actorId: row.actorId as string,
    actorType: row.actorType as string,
    eventType: row.eventType as AuditEventType,
    action: row.action as string,
    resourceType: row.resourceType as string,
    resourceId: (row.resourceId as string) ?? null,
    outcome: row.outcome as AuditOutcome,
    timestamp:
      row.timestamp instanceof Date ? row.timestamp.toISOString() : (row.timestamp as string),
    requestId: (row.requestId as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    hash: row.hash as string,
    previousHash: (row.previousHash as string) ?? null,
  }
}

function computeHash(eventData: string, previousHash: string | null): string {
  const payload = previousHash !== null ? `${previousHash}:${eventData}` : eventData
  return createHash('sha256').update(payload).digest('hex').slice(0, 32)
}

@Injectable()
export class AuditPrismaRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async record(data: AuditEventCreateData): Promise<GovernanceAuditEvent> {
    // Get previous hash for chain integrity
    const previousHash = await this.getLatestHash(data.organizationId)

    // Compute deterministic hash of this event
    const eventData = JSON.stringify({
      organizationId: data.organizationId,
      actorId: data.actorId,
      eventType: data.eventType,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      outcome: data.outcome,
      timestamp: Date.now(),
    })
    const hash = computeHash(eventData, previousHash)

    const row = await this.prisma.governanceAuditEvent.create({
      data: {
        organizationId: data.organizationId,
        actorId: data.actorId,
        actorType: data.actorType,
        eventType: data.eventType,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        outcome: data.outcome,
        requestId: data.requestId,
        metadata: data.metadata as never,
        hash,
        previousHash,
      },
    })
    return toAuditEvent(row as unknown as Record<string, unknown>)
  }

  async findById(eventId: EntityId): Promise<GovernanceAuditEvent | null> {
    const row = await this.prisma.governanceAuditEvent.findUnique({ where: { id: eventId } })
    return row === null ? null : toAuditEvent(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(
    organizationId: EntityId,
    filters?: AuditFilters,
  ): Promise<readonly GovernanceAuditEvent[]> {
    const where: Record<string, unknown> = { organizationId }
    if (filters?.actorId) where.actorId = filters.actorId
    if (filters?.eventType) where.eventType = filters.eventType
    if (filters?.resourceType) where.resourceType = filters.resourceType
    if (filters?.outcome) where.outcome = filters.outcome
    if (filters?.from || filters?.to) {
      where.timestamp = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      }
    }

    const rows = await this.prisma.governanceAuditEvent.findMany({
      where: where as never,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit ?? 100,
      skip: filters?.offset ?? 0,
    })
    return rows.map((r) => toAuditEvent(r as unknown as Record<string, unknown>))
  }

  async getLatestHash(organizationId: EntityId): Promise<string | null> {
    const latest = await this.prisma.governanceAuditEvent.findFirst({
      where: { organizationId },
      orderBy: { timestamp: 'desc' },
      select: { hash: true },
    })
    return latest?.hash ?? null
  }

  async verifyChain(
    organizationId: EntityId,
    from: Timestamp,
    to: Timestamp,
  ): Promise<AuditChainVerification> {
    const events = await this.prisma.governanceAuditEvent.findMany({
      where: { organizationId, timestamp: { gte: new Date(from), lte: new Date(to) } },
      orderBy: { timestamp: 'asc' },
    })

    let previousHash: string | null = null
    for (const event of events) {
      if (event.previousHash !== previousHash) {
        return {
          valid: false,
          totalEvents: events.length,
          brokenAt: event.id,
          message: `Chain broken at event ${event.id}: expected previousHash ${previousHash}, got ${event.previousHash}`,
        }
      }
      previousHash = event.hash
    }

    return {
      valid: true,
      totalEvents: events.length,
      brokenAt: null,
      message: `Chain verified: ${events.length} events intact`,
    }
  }

  async countByOrganization(
    organizationId: EntityId,
    from?: Timestamp,
    to?: Timestamp,
  ): Promise<number> {
    const where: Record<string, unknown> = { organizationId }
    if (from || to) {
      where.timestamp = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }
    return this.prisma.governanceAuditEvent.count({ where: where as never })
  }
}
