/* Event Service — main application service for the event system.

Responsibilities:
  - Emit domain events (creates outbox entries within transactions)
  - Process outbox events (publisher)
  - Query events for admin/audit

Architecture:
  - emitEvent() creates an outbox entry — it does NOT publish directly
  - processOutbox() reads pending entries and delivers via SSE
  - SSE delivery is best-effort — failures are logged and retried

The event service is the single entry point for all event operations. */

import { Inject, Injectable, Logger } from '@nestjs/common'
import type {
  DomainEventEnvelope,
  EntityId,
  EventClassification,
  EventSource,
  EventType,
} from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import {
  IEventStore,
  IOutboxRepository,
  ISseManager,
  IEventService,
} from '../domain/events.interfaces'

@Injectable()
export class EventService implements IEventService {
  private readonly logger = new Logger(EventService.name)

  constructor(
    @Inject(IEventStore) private readonly eventStore: IEventStore,
    @Inject(IOutboxRepository) private readonly outboxRepo: IOutboxRepository,
    @Inject(ISseManager) private readonly sseManager: ISseManager,
  ) {}

  async emitEvent(params: {
    eventType: EventType
    aggregateType: string
    aggregateId: string
    organizationId: string
    actorId: string | null
    actorType: string | null
    source: EventSource
    correlationId: string | null
    causationId: string | null
    payload: Record<string, unknown>
    metadata?: Record<string, unknown>
    classification?: EventClassification
  }): Promise<void> {
    const eventId = uuid()
    const timestamp = new Date().toISOString()

    const envelope: DomainEventEnvelope = {
      eventId,
      eventType: params.eventType,
      eventVersion: 1,
      organizationId: params.organizationId,
      aggregateType: params.aggregateType as DomainEventEnvelope['aggregateType'],
      aggregateId: params.aggregateId,
      actorId: params.actorId,
      actorType: params.actorType,
      source: params.source,
      correlationId: params.correlationId,
      causationId: params.causationId,
      timestamp,
      payload: params.payload,
      metadata: params.metadata ?? {},
      classification: params.classification ?? 'PUBLIC_TO_ORG',
    }

    // 1. Persist event in the store (for replay/query)
    await this.eventStore.createEvent(envelope)

    // 2. Create outbox entry (for reliable delivery)
    await this.outboxRepo.createOutboxEntry({
      eventId,
      eventType: params.eventType,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
      organizationId: params.organizationId,
      payload: params.payload,
    })

    this.logger.debug('Event emitted', {
      eventId,
      eventType: params.eventType,
      aggregateType: params.aggregateType,
      aggregateId: params.aggregateId,
    })
  }

  async processOutbox(): Promise<{ published: number; failed: number }> {
    const events = await this.outboxRepo.loadPendingEvents(100)
    let published = 0
    let failed = 0

    for (const outboxEvent of events) {
      try {
        // Reconstruct the full envelope from the outbox entry
        const envelope = await this.eventStore.getEvent(outboxEvent.eventId)
        if (!envelope) {
          this.logger.warn('Event not found in store', { eventId: outboxEvent.eventId })
          await this.outboxRepo.markFailed(outboxEvent.eventId, 'Event not found in store')
          failed++
          continue
        }

        // Deliver via SSE
        await this.sseManager.deliverEvent(envelope)

        // Mark as published
        await this.outboxRepo.markPublished(outboxEvent.eventId)
        published++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        this.logger.error('Failed to publish event', {
          eventId: outboxEvent.eventId,
          eventType: outboxEvent.eventType,
          error: errorMessage,
        })
        await this.outboxRepo.markFailed(outboxEvent.eventId, errorMessage)
        failed++
      }
    }

    if (published > 0 || failed > 0) {
      this.logger.debug('Outbox processing complete', { published, failed })
    }

    return { published, failed }
  }

  async queryEvents(filters: {
    organizationId: EntityId
    eventType?: EventType
    aggregateType?: string
    aggregateId?: string
    since?: string
    until?: string
    limit?: number
    offset?: number
  }) {
    return this.eventStore.queryEvents({
      organizationId: filters.organizationId,
      eventType: filters.eventType,
      aggregateType: filters.aggregateType as DomainEventEnvelope['aggregateType'],
      aggregateId: filters.aggregateId,
      since: filters.since,
      until: filters.until,
      limit: filters.limit,
      offset: filters.offset,
    })
  }
}
