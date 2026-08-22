/* Agent event emitter — broadcasts execution events for SSE streaming.

Events are emitted at each stage of the agent execution loop:
- EXECUTION_STARTED
- PLAN_CREATED
- STEP_STARTED
- TOOL_STARTED
- TOOL_COMPLETED
- OBSERVATION
- VERIFICATION
- GENERATING_RESPONSE
- EXECUTION_COMPLETE
- EXECUTION_FAILED
- INJECTION_DETECTED
- LIMIT_REACHED

Each execution has its own Subject. Subscribers receive only events
for the execution they're watching.
*/

import { Injectable } from '@nestjs/common'
import { Subject, type Observable, map } from 'rxjs'

/** Types of events emitted during agent execution. */
export const AgentEventType = {
  EXECUTION_STARTED: 'EXECUTION_STARTED',
  PLAN_CREATED: 'PLAN_CREATED',
  STEP_STARTED: 'STEP_STARTED',
  TOOL_STARTED: 'TOOL_COMPLETED',
  TOOL_COMPLETED: 'TOOL_COMPLETED',
  OBSERVATION: 'OBSERVATION',
  STATE_TRANSITION: 'STATE_TRANSITION',
  VERIFICATION: 'VERIFICATION',
  GENERATING_RESPONSE: 'GENERATING_RESPONSE',
  EXECUTION_COMPLETE: 'EXECUTION_COMPLETE',
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  INJECTION_DETECTED: 'INJECTION_DETECTED',
  LIMIT_REACHED: 'LIMIT_REACHED',
  STATUS_UPDATE: 'STATUS_UPDATE',
} as const
export type AgentEventType = (typeof AgentEventType)[keyof typeof AgentEventType]

/** An agent execution event. */
export interface AgentExecutionEvent {
  readonly type: AgentEventType
  readonly executionId: string
  readonly timestamp: string
  readonly data: Record<string, unknown>
}

/** SSE event shape sent to the client. */
export interface AgentSseEvent {
  readonly event: string
  readonly data: string
  readonly id?: string
}

/**
 * Per-execution event store.
 * Uses a RxJS Subject to push events to all subscribers of a given execution.
 */
@Injectable()
export class AgentEventEmitter {
  private readonly subjects = new Map<string, Subject<AgentExecutionEvent>>()

  /**
   * Get the observable stream for a specific execution.
   * Creates a new Subject if one doesn't exist yet.
   */
  stream(executionId: string): Observable<AgentSseEvent> {
    let subject = this.subjects.get(executionId)
    if (subject === undefined) {
      subject = new Subject<AgentExecutionEvent>()
      this.subjects.set(executionId, subject)
    }

    return subject.pipe(
      map((event) => ({
        event: event.type,
        data: JSON.stringify({
          type: event.type,
          executionId: event.executionId,
          timestamp: event.timestamp,
          ...event.data,
        }),
        id: event.executionId,
      })),
    )
  }

  /**
   * Emit an event for a specific execution.
   * If no subscribers are listening, the event is dropped silently.
   */
  emit(executionId: string, type: AgentEventType, data: Record<string, unknown> = {}): void {
    const subject = this.subjects.get(executionId)
    if (subject === undefined) return

    const event: AgentExecutionEvent = {
      type,
      executionId,
      timestamp: new Date().toISOString(),
      data,
    }

    subject.next(event)
  }

  /**
   * Complete the event stream for an execution.
   * Cleans up the Subject to prevent memory leaks.
   */
  complete(executionId: string): void {
    const subject = this.subjects.get(executionId)
    if (subject !== undefined) {
      subject.complete()
      this.subjects.delete(executionId)
    }
  }

  /**
   * Error the event stream for an execution.
   */
  error(executionId: string, error: string): void {
    const subject = this.subjects.get(executionId)
    if (subject !== undefined) {
      subject.error(new Error(error))
      this.subjects.delete(executionId)
    }
  }

  /**
   * Get the number of active streams (for observability).
   */
  get activeStreamCount(): number {
    return this.subjects.size
  }
}
