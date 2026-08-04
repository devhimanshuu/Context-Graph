import { type DomainEvent } from './domain-event'

/** A handler subscribed to one or more event types. */
export type EventHandler = (event: DomainEvent) => Promise<void> | void

/**
 * Publish/subscribe event bus contract. Implementations may be in-process
 * (emitter), queue-backed (SQS, Redis streams), or a hybrid for real-time
 * fan-out. Subscribers are registered once at bootstrap; handlers never
 * block the emitter — implementations fan out asynchronously.
 */
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>

  /**
   * Generic overload: subscribing to a known event type narrows the handler's
   * event argument (e.g. `'pipeline.started'` → `PipelineStartedEvent`).
   */
  subscribe<T extends DomainEvent>(
    eventType: T['eventType'],
    handler: (event: T) => Promise<void> | void,
  ): void

  /** Plain string subscription for dynamic/unknown event types. */
  subscribe(eventType: string, handler: EventHandler): void
}
