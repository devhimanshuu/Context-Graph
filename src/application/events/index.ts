/**
 * Event contracts — import from `@/application/events`.
 */
export type { DomainEvent } from './domain-event'
export type {
  PipelineEvent,
  PipelineEventType,
  PipelineStartedEvent,
  PipelineStartedPayload,
  TraversalCompletedEvent,
  TraversalCompletedPayload,
  FilteringCompletedEvent,
  FilteringCompletedPayload,
  CandidateBuiltEvent,
  CandidateBuiltPayload,
  PipelineFinishedEvent,
  PipelineFinishedPayload,
  PipelineFailedEvent,
  PipelineFailedPayload,
} from './pipeline-events'
export { PIPELINE_EVENT_TYPES } from './pipeline-events'
export type { IEventBus, EventHandler } from './i-event-bus'
