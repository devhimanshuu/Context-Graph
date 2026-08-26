/* Event system interfaces — DI tokens for dependency inversion.

The event module depends on these abstractions; concrete implementations
are provided by repositories and services. */

import type {
  DomainEventEnvelope,
  EventClassification,
  EventQueryFilters,
  EventSource,
  EventType,
  OutboxEventEntity,
  SseEventData,
} from '@contextgraph/types'

// ─── Event Store ─────────────────────────────────────────────────────────────

export abstract class IEventStore {
  /** Persist an event (used within transactional outbox). */
  abstract createEvent(event: DomainEventEnvelope): Promise<void>
  /** Query events for a given scope. */
  abstract queryEvents(filters: EventQueryFilters): Promise<DomainEventEnvelope[]>
  /** Get a single event by ID. */
  abstract getEvent(eventId: string): Promise<DomainEventEnvelope | null>
}

// ─── Outbox Repository ───────────────────────────────────────────────────────

export abstract class IOutboxRepository {
  /** Create an outbox entry (called within a transaction). */
  abstract createOutboxEntry(data: {
    eventId: string
    eventType: string
    aggregateType: string
    aggregateId: string
    organizationId: string
    payload: Record<string, unknown>
  }): Promise<OutboxEventEntity>

  /** Load pending events for publishing. */
  abstract loadPendingEvents(limit: number): Promise<OutboxEventEntity[]>

  /** Mark an event as published. */
  abstract markPublished(eventId: string): Promise<void>

  /** Mark an event as failed (increment attempt count). */
  abstract markFailed(eventId: string, error: string): Promise<void>

  /** Move to dead letter after max attempts. */
  abstract moveToDeadLetter(eventId: string): Promise<void>

  /** Get dead letter events for admin inspection. */
  abstract getDeadLetterEvents(organizationId: string, limit?: number): Promise<OutboxEventEntity[]>

  /** Retry a dead letter event. */
  abstract retryDeadLetter(eventId: string): Promise<void>
}

// ─── Event Publisher ─────────────────────────────────────────────────────────

export abstract class IEventPublisher {
  /** Publish a batch of outbox events to subscribers. */
  abstract publishEvents(events: OutboxEventEntity[]): Promise<void>
}

// ─── SSE Manager ─────────────────────────────────────────────────────────────

export interface SseConnection {
  readonly connectionId: string
  readonly organizationId: string
  readonly principalId: string
  readonly clientType: string
  readonly eventTypes: readonly string[]
  readonly createdAt: Date
  write(data: SseEventData): void
  close(): void
}

export abstract class ISseManager {
  /** Add a new SSE connection. */
  abstract addConnection(connection: SseConnection): void
  /** Remove an SSE connection. */
  abstract removeConnection(connectionId: string): void
  /** Deliver an event to all authorized connections. */
  abstract deliverEvent(event: DomainEventEnvelope): Promise<void>
  /** Get active connection count for an organization. */
  abstract getConnectionCount(organizationId: string): number
  /** Get total active connections. */
  abstract getTotalConnections(): number
}

// ─── Event Service ───────────────────────────────────────────────────────────

export abstract class IEventService {
  /** Emit a domain event (creates outbox entry within a transaction). */
  abstract emitEvent(params: {
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
  }): Promise<void>

  /** Process pending outbox events (called by BullMQ worker). */
  abstract processOutbox(): Promise<{ published: number; failed: number }>

  /** Query events for admin/audit. */
  abstract queryEvents(filters: EventQueryFilters): Promise<DomainEventEnvelope[]>
}
