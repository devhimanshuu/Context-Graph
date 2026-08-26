/* Event Store — in-memory + outbox-backed event query store.

Events are persisted via the outbox pattern. This store provides
query capabilities for admin/audit inspection and SSE replay. */

import { Injectable } from '@nestjs/common'
import type { DomainEventEnvelope, EventQueryFilters } from '@contextgraph/types'
import { IEventStore } from '../domain/events.interfaces'

/** In-memory event cache — production would use the outbox table for replay. */
const eventCache = new Map<string, DomainEventEnvelope>()

@Injectable()
export class InMemoryEventStore implements IEventStore {
  async createEvent(event: DomainEventEnvelope): Promise<void> {
    eventCache.set(event.eventId, event)
  }

  async queryEvents(filters: EventQueryFilters): Promise<DomainEventEnvelope[]> {
    let events = [...eventCache.values()]

    // Filter by organization
    events = events.filter((e) => e.organizationId === filters.organizationId)

    // Filter by event type
    if (filters.eventType) {
      events = events.filter((e) => e.eventType === filters.eventType)
    }

    // Filter by aggregate type
    if (filters.aggregateType) {
      events = events.filter((e) => e.aggregateType === filters.aggregateType)
    }

    // Filter by aggregate ID
    if (filters.aggregateId) {
      events = events.filter((e) => e.aggregateId === filters.aggregateId)
    }

    // Filter by time range
    if (filters.since) {
      const since = new Date(filters.since).getTime()
      events = events.filter((e) => new Date(e.timestamp).getTime() >= since)
    }
    if (filters.until) {
      const until = new Date(filters.until).getTime()
      events = events.filter((e) => new Date(e.timestamp).getTime() <= until)
    }

    // Sort by timestamp descending (newest first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply pagination
    const offset = filters.offset ?? 0
    const limit = filters.limit ?? 50
    events = events.slice(offset, offset + limit)

    return events
  }

  async getEvent(eventId: string): Promise<DomainEventEnvelope | null> {
    return eventCache.get(eventId) ?? null
  }
}
