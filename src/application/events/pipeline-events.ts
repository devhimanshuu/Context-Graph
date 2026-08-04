import { type DomainEvent } from './domain-event'

/**
 * Pipeline lifecycle events — emitted by the pipeline implementation around
 * each milestone. Consumers (audit logger, metrics, real-time feed) subscribe
 * via `IEventBus` without coupling to the pipeline code.
 */

export interface PipelineStartedPayload {
  requestId: string
  entryNodeIds: string[]
  maxDepth: number
}

export interface PipelineStartedEvent extends DomainEvent<PipelineStartedPayload> {
  eventType: 'pipeline.started'
}

export interface TraversalCompletedPayload {
  requestId: string
  visitedNodeIds: string[]
  depth: number
}

export interface TraversalCompletedEvent extends DomainEvent<TraversalCompletedPayload> {
  eventType: 'traversal.completed'
}

export interface FilteringCompletedPayload {
  requestId: string
  before: number
  after: number
}

export interface FilteringCompletedEvent extends DomainEvent<FilteringCompletedPayload> {
  eventType: 'filtering.completed'
}

export interface CandidateBuiltPayload {
  requestId: string
  candidateIds: string[]
}

export interface CandidateBuiltEvent extends DomainEvent<CandidateBuiltPayload> {
  eventType: 'candidate.built'
}

export interface PipelineFinishedPayload {
  requestId: string
  status: 'completed' | 'failed'
  candidateCount: number
}

export interface PipelineFinishedEvent extends DomainEvent<PipelineFinishedPayload> {
  eventType: 'pipeline.finished'
}

export interface PipelineFailedPayload {
  requestId: string
  errorCode: string
  errorMessage: string
}

export interface PipelineFailedEvent extends DomainEvent<PipelineFailedPayload> {
  eventType: 'pipeline.failed'
}

/** Every event the pipeline can emit, as a discriminated union. */
export type PipelineEvent =
  | PipelineStartedEvent
  | TraversalCompletedEvent
  | FilteringCompletedEvent
  | CandidateBuiltEvent
  | PipelineFinishedEvent
  | PipelineFailedEvent

export const PIPELINE_EVENT_TYPES = [
  'pipeline.started',
  'traversal.completed',
  'filtering.completed',
  'candidate.built',
  'pipeline.finished',
  'pipeline.failed',
] as const

export type PipelineEventType = (typeof PIPELINE_EVENT_TYPES)[number]
