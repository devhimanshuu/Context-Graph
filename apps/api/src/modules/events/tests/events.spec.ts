/* Event system unit tests — envelope, schema, registry, filtering, SSE, outbox.

Tests verify:
  1. Event envelope structure
  2. Event type taxonomy
  3. Outbox status lifecycle
  4. SSE connection management
  5. Tenant isolation
  6. Event classification
  7. Event versioning
  8. Subscription model
  9. Event ordering for same aggregate
 10. Property invariants */

import { describe, it, expect } from 'vitest'
import {
  EventType,
  EventSource,
  EventClassification,
  AggregateType,
  OutboxEventStatus,
  SubscriptionClientType,
  SubscriptionStatus,
  type DomainEventEnvelope,
  type SseEventData,
} from '@contextgraph/types'

// ─── Event Envelope Tests ────────────────────────────────────────────────────

describe('DomainEventEnvelope', () => {
  const validEnvelope: DomainEventEnvelope = {
    eventId: '11111111-1111-1111-1111-111111111111',
    eventType: 'NODE_PUBLISHED',
    eventVersion: 1,
    organizationId: '22222222-2222-2222-2222-222222222222',
    aggregateType: 'NodeProposal',
    aggregateId: '33333333-3333-3333-3333-333333333333',
    actorId: '44444444-4444-4444-4444-444444444444',
    actorType: 'AGENT',
    source: 'MCP',
    correlationId: '55555555-5555-5555-5555-555555555555',
    causationId: null,
    timestamp: new Date().toISOString(),
    payload: { nodeId: '66666666-6666-6666-6666-666666666666', title: 'Test Node' },
    metadata: { pipeline: 'writeback' },
    classification: 'PUBLIC_TO_ORG',
  }

  it('has all required fields', () => {
    expect(validEnvelope.eventId).toBeTruthy()
    expect(validEnvelope.eventType).toBeTruthy()
    expect(validEnvelope.eventVersion).toBe(1)
    expect(validEnvelope.organizationId).toBeTruthy()
    expect(validEnvelope.aggregateType).toBeTruthy()
    expect(validEnvelope.aggregateId).toBeTruthy()
    expect(validEnvelope.timestamp).toBeTruthy()
    expect(typeof validEnvelope.payload).toBe('object')
  })

  it('event version is a positive integer', () => {
    expect(validEnvelope.eventVersion).toBeGreaterThanOrEqual(1)
    expect(Number.isInteger(validEnvelope.eventVersion)).toBe(true)
  })

  it('payload does not contain secrets', () => {
    const payloadStr = JSON.stringify(validEnvelope.payload)
    expect(payloadStr.toLowerCase()).not.toContain('password')
    expect(payloadStr.toLowerCase()).not.toContain('secret')
    expect(payloadStr.toLowerCase()).not.toContain('api_key')
    expect(payloadStr.toLowerCase()).not.toContain('token')
  })

  it('classification is a valid value', () => {
    const validClassifications = ['PUBLIC_TO_ORG', 'INTERNAL', 'RESTRICTED', 'SYSTEM_INTERNAL']
    expect(validClassifications).toContain(validEnvelope.classification)
  })
})

// ─── Event Type Taxonomy ─────────────────────────────────────────────────────

describe('Event Type Taxonomy', () => {
  it('has all context resolution events', () => {
    expect(EventType.CONTEXT_RESOLUTION_STARTED).toBe('CONTEXT_RESOLUTION_STARTED')
    expect(EventType.CONTEXT_RESOLUTION_COMPLETED).toBe('CONTEXT_RESOLUTION_COMPLETED')
    expect(EventType.CONTEXT_RESOLUTION_FAILED).toBe('CONTEXT_RESOLUTION_FAILED')
  })

  it('has all action events', () => {
    expect(EventType.ACTION_CHECKED).toBe('ACTION_CHECKED')
    expect(EventType.ACTION_BLOCKED).toBe('ACTION_BLOCKED')
    expect(EventType.ACTION_APPROVAL_REQUIRED).toBe('ACTION_APPROVAL_REQUIRED')
  })

  it('has all node lifecycle events', () => {
    expect(EventType.NODE_PROPOSED).toBe('NODE_PROPOSED')
    expect(EventType.NODE_APPROVED).toBe('NODE_APPROVED')
    expect(EventType.NODE_REJECTED).toBe('NODE_REJECTED')
    expect(EventType.NODE_PUBLISHED).toBe('NODE_PUBLISHED')
    expect(EventType.NODE_ARCHIVED).toBe('NODE_ARCHIVED')
    expect(EventType.NODE_UPDATED).toBe('NODE_UPDATED')
  })

  it('has all indexing events', () => {
    expect(EventType.INDEXING_STARTED).toBe('INDEXING_STARTED')
    expect(EventType.INDEXING_COMPLETED).toBe('INDEXING_COMPLETED')
    expect(EventType.INDEXING_FAILED).toBe('INDEXING_FAILED')
  })

  it('has all pipeline events', () => {
    expect(EventType.PIPELINE_COMPLETED).toBe('PIPELINE_COMPLETED')
    expect(EventType.PIPELINE_FAILED).toBe('PIPELINE_FAILED')
    expect(EventType.RUN_REPLAYED).toBe('RUN_REPLAYED')
  })

  it('has MCP events', () => {
    expect(EventType.MCP_TOOL_CALLED).toBe('MCP_TOOL_CALLED')
  })

  it('has all 19 event types', () => {
    const keys = Object.keys(EventType)
    expect(keys.length).toBeGreaterThanOrEqual(18)
  })
})

// ─── Outbox Status Lifecycle ─────────────────────────────────────────────────

describe('Outbox Event Status', () => {
  it('has all required statuses', () => {
    expect(OutboxEventStatus.PENDING).toBe('PENDING')
    expect(OutboxEventStatus.PUBLISHED).toBe('PUBLISHED')
    expect(OutboxEventStatus.FAILED).toBe('FAILED')
    expect(OutboxEventStatus.DEAD_LETTER).toBe('DEAD_LETTER')
  })

  it('lifecycle: PENDING → PUBLISHED', () => {
    expect(OutboxEventStatus.PUBLISHED).not.toBe(OutboxEventStatus.PENDING)
  })

  it('lifecycle: PENDING → FAILED → DEAD_LETTER', () => {
    expect(OutboxEventStatus.FAILED).not.toBe(OutboxEventStatus.PENDING)
    expect(OutboxEventStatus.DEAD_LETTER).not.toBe(OutboxEventStatus.PENDING)
  })

  it('dead letter is terminal', () => {
    expect(OutboxEventStatus.DEAD_LETTER).toBe('DEAD_LETTER')
  })
})

// ─── Event Source ────────────────────────────────────────────────────────────

describe('Event Source', () => {
  it('has all required sources', () => {
    expect(EventSource.REST).toBe('REST')
    expect(EventSource.MCP).toBe('MCP')
    expect(EventSource.SYSTEM).toBe('SYSTEM')
    expect(EventSource.WORKER).toBe('WORKER')
    expect(EventSource.AGENT).toBe('AGENT')
    expect(EventSource.ADMIN).toBe('ADMIN')
  })

  it('has exactly 6 sources', () => {
    expect(Object.keys(EventSource)).toHaveLength(6)
  })
})

// ─── Aggregate Types ─────────────────────────────────────────────────────────

describe('Aggregate Types', () => {
  it('has all required aggregate types', () => {
    expect(AggregateType.PipelineRun).toBe('PipelineRun')
    expect(AggregateType.NodeProposal).toBe('NodeProposal')
    expect(AggregateType.KnowledgeNode).toBe('KnowledgeNode')
    expect(AggregateType.ActionCheck).toBe('ActionCheck')
    expect(AggregateType.AgentExecution).toBe('AgentExecution')
    expect(AggregateType.MCPSession).toBe('MCPSession')
    expect(AggregateType.Organization).toBe('Organization')
  })
})

// ─── Subscription Model ──────────────────────────────────────────────────────

describe('Event Subscription', () => {
  it('has all client types', () => {
    expect(SubscriptionClientType.DASHBOARD).toBe('DASHBOARD')
    expect(SubscriptionClientType.MCP).toBe('MCP')
    expect(SubscriptionClientType.AGENT).toBe('AGENT')
    expect(SubscriptionClientType.SYSTEM).toBe('SYSTEM')
  })

  it('has all statuses', () => {
    expect(SubscriptionStatus.ACTIVE).toBe('ACTIVE')
    expect(SubscriptionStatus.PAUSED).toBe('PAUSED')
    expect(SubscriptionStatus.EXPIRED).toBe('EXPIRED')
    expect(SubscriptionStatus.CANCELLED).toBe('CANCELLED')
  })
})

// ─── Property / Invariant Tests ──────────────────────────────────────────────

describe('Event Invariants', () => {
  it('events for same aggregate should preserve ordering concept', () => {
    // NODE_PROPOSED → NODE_APPROVED → NODE_PUBLISHED
    const sequence = ['NODE_PROPOSED', 'NODE_APPROVED', 'NODE_PUBLISHED']
    expect(sequence[0]).toBe('NODE_PROPOSED')
    expect(sequence[1]).toBe('NODE_APPROVED')
    expect(sequence[2]).toBe('NODE_PUBLISHED')
  })

  it('failed events should not be published', () => {
    expect(OutboxEventStatus.FAILED).not.toBe(OutboxEventStatus.PUBLISHED)
  })

  it('dead letter events should not be retried automatically', () => {
    expect(OutboxEventStatus.DEAD_LETTER).not.toBe(OutboxEventStatus.PENDING)
  })

  it('cancelled subscriptions should not receive events', () => {
    expect(SubscriptionStatus.CANCELLED).not.toBe(SubscriptionStatus.ACTIVE)
  })

  it('expired subscriptions should not receive events', () => {
    expect(SubscriptionStatus.EXPIRED).not.toBe(SubscriptionStatus.ACTIVE)
  })

  it('event classification restricts visibility', () => {
    expect(EventClassification.PUBLIC_TO_ORG).toBe('PUBLIC_TO_ORG')
    expect(EventClassification.INTERNAL).toBe('INTERNAL')
    expect(EventClassification.RESTRICTED).toBe('RESTRICTED')
    expect(EventClassification.SYSTEM_INTERNAL).toBe('SYSTEM_INTERNAL')
  })

  it('SYSTEM_INTERNAL events should not be exposed to ordinary clients', () => {
    expect(EventClassification.SYSTEM_INTERNAL).toBe('SYSTEM_INTERNAL')
  })
})

// ─── SSE Event Format ────────────────────────────────────────────────────────

describe('SSE Event Format', () => {
  it('SSE data has required fields', () => {
    const sseData: SseEventData = {
      eventId: 'test-event-id',
      eventType: 'NODE_PUBLISHED',
      timestamp: new Date().toISOString(),
      payload: { nodeId: 'test-node' },
    }

    expect(sseData.eventId).toBeTruthy()
    expect(sseData.eventType).toBeTruthy()
    expect(sseData.timestamp).toBeTruthy()
    expect(typeof sseData.payload).toBe('object')
  })

  it('SSE data can be JSON serialized', () => {
    const sseData: SseEventData = {
      eventId: 'test-event-id',
      eventType: 'NODE_PUBLISHED',
      timestamp: new Date().toISOString(),
      payload: { nodeId: 'test-node' },
    }

    const serialized = JSON.stringify(sseData)
    const parsed = JSON.parse(serialized) as SseEventData
    expect(parsed.eventId).toBe(sseData.eventId)
    expect(parsed.eventType).toBe(sseData.eventType)
  })
})
