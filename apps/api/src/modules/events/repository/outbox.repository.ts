/* Outbox Repository — Prisma persistence for transactional outbox events.

Every outbox entry is created within the same transaction as the state change,
guaranteeing atomicity. The publisher then reads and publishes pending entries. */

import { Injectable } from '@nestjs/common'
import type { OutboxEventEntity, OutboxEventStatus } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import { IOutboxRepository } from '../domain/events.interfaces'

interface OutboxRow {
  id: string
  eventId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  organizationId: string
  payload: unknown
  status: string
  attemptCount: number
  maxAttempts: number
  availableAt: Date
  createdAt: Date
  publishedAt: Date | null
  lastError: string | null
}

function rowToEntity(row: OutboxRow): OutboxEventEntity {
  return {
    id: row.id,
    eventId: row.eventId,
    eventType: row.eventType as OutboxEventEntity['eventType'],
    aggregateType: row.aggregateType as OutboxEventEntity['aggregateType'],
    aggregateId: row.aggregateId,
    organizationId: row.organizationId,
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status as OutboxEventStatus,
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    availableAt: row.availableAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    lastError: row.lastError,
  }
}

@Injectable()
export class OutboxPrismaRepository implements IOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createOutboxEntry(data: {
    eventId: string
    eventType: string
    aggregateType: string
    aggregateId: string
    organizationId: string
    payload: Record<string, unknown>
  }): Promise<OutboxEventEntity> {
    const row = await this.prisma.outboxEvent.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType,
        aggregateType: data.aggregateType,
        aggregateId: data.aggregateId,
        organizationId: data.organizationId,
        payload: data.payload as unknown as Record<string, string>,
      },
    })
    return rowToEntity(row as unknown as OutboxRow)
  }

  async loadPendingEvents(limit: number): Promise<OutboxEventEntity[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
    return rows.map((row) => rowToEntity(row as unknown as OutboxRow))
  }

  async markPublished(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    })
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({ where: { eventId } })
    if (!event) return

    const newAttemptCount = event.attemptCount + 1
    const shouldDeadLetter = newAttemptCount >= event.maxAttempts

    // Exponential backoff: 2^attemptCount seconds
    const backoffMs = Math.min(2 ** newAttemptCount * 1000, 3600_000) // max 1 hour
    const availableAt = new Date(Date.now() + backoffMs)

    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: {
        status: shouldDeadLetter ? 'DEAD_LETTER' : 'FAILED',
        attemptCount: newAttemptCount,
        lastError: error,
        availableAt: shouldDeadLetter ? event.availableAt : availableAt,
      },
    })
  }

  async moveToDeadLetter(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: { status: 'DEAD_LETTER' },
    })
  }

  async getDeadLetterEvents(organizationId: string, limit = 50): Promise<OutboxEventEntity[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: { organizationId, status: 'DEAD_LETTER' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((row) => rowToEntity(row as unknown as OutboxRow))
  }

  async retryDeadLetter(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { eventId },
      data: {
        status: 'PENDING',
        attemptCount: 0,
        availableAt: new Date(),
        lastError: null,
      },
    })
  }
}
