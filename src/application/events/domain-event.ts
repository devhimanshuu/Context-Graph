/**
 * Base event contract for the application layer.
 *
 * Events are immutable facts about the past; they are emitted by the event
 * bus after an operation completes and consumed by audit, analytics,
 * real-time and integration handlers. The payload is strongly typed per event
 * kind (see `pipeline-events.ts`).
 */
export interface DomainEvent<TPayload extends object = Record<string, unknown>> {
  /** Unique event id (UUID). */
  eventId: string
  /** Stable, dotted event type, e.g. `pipeline.started`. */
  eventType: string
  occurredAt: Date
  /** Links events belonging to the same request/operation. */
  correlationId: string | null
  organizationId: string
  payload: TPayload
}
