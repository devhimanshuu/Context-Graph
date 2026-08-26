/* SSE Manager — manages Server-Sent Events connections.

Responsibilities:
  - Track active SSE connections
  - Deliver events to authorized connections only
  - Enforce tenant isolation (org-scoped)
  - Heartbeat management
  - Connection limits

Events are delivered only to connections that:
  1. Belong to the same organization
  2. Subscribed to the event type
  3. Are currently active

The manager does NOT perform authorization — that is done at subscription time. */

import { Injectable, Logger } from '@nestjs/common'
import type { DomainEventEnvelope, SseEventData } from '@contextgraph/types'
import { ISseManager, type SseConnection } from '../domain/events.interfaces'

@Injectable()
export class SseManager implements ISseManager {
  private readonly logger = new Logger(SseManager.name)
  private readonly connections = new Map<string, SseConnection>()

  /** Per-organization connection limits. */
  private static readonly MAX_CONNECTIONS_PER_ORG = 50
  private static readonly MAX_TOTAL_CONNECTIONS = 500

  addConnection(connection: SseConnection): void {
    // Enforce per-organization connection limit
    const orgCount = this.getConnectionCount(connection.organizationId)
    if (orgCount >= SseManager.MAX_CONNECTIONS_PER_ORG) {
      this.logger.warn('Connection limit exceeded for organization', {
        organizationId: connection.organizationId,
        currentCount: orgCount,
      })
      connection.close()
      return
    }

    // Enforce total connection limit
    if (this.connections.size >= SseManager.MAX_TOTAL_CONNECTIONS) {
      this.logger.warn('Total connection limit exceeded')
      connection.close()
      return
    }

    this.connections.set(connection.connectionId, connection)
    this.logger.debug('SSE connection added', {
      connectionId: connection.connectionId,
      organizationId: connection.organizationId,
      totalConnections: this.connections.size,
    })
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.close()
      this.connections.delete(connectionId)
      this.logger.debug('SSE connection removed', {
        connectionId,
        totalConnections: this.connections.size,
      })
    }
  }

  async deliverEvent(event: DomainEventEnvelope): Promise<void> {
    const sseData: SseEventData = {
      eventId: event.eventId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      payload: event.payload,
    }

    let delivered = 0

    for (const connection of this.connections.values()) {
      // Tenant isolation: only deliver to same organization
      if (connection.organizationId !== event.organizationId) continue

      // Check if subscribed to this event type
      if (connection.eventTypes.length > 0 && !connection.eventTypes.includes(event.eventType)) {
        continue
      }

      try {
        connection.write(sseData)
        delivered++
      } catch (error) {
        this.logger.warn('Failed to deliver SSE event', {
          connectionId: connection.connectionId,
          eventId: event.eventId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        // Remove broken connection
        this.connections.delete(connection.connectionId)
      }
    }

    if (delivered > 0) {
      this.logger.debug('Event delivered to SSE connections', {
        eventType: event.eventType,
        eventId: event.eventId,
        deliveredTo: delivered,
      })
    }
  }

  getConnectionCount(organizationId: string): number {
    let count = 0
    for (const connection of this.connections.values()) {
      if (connection.organizationId === organizationId) count++
    }
    return count
  }

  getTotalConnections(): number {
    return this.connections.size
  }
}
