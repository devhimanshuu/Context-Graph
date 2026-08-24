/* Workflow event emitter — emits domain events for workflow lifecycle.

Events are used for:
  - Real-time SSE streaming to dashboard
  - Audit logging
  - Observability metrics
  - Recovery coordination

Events are persisted in the database and optionally streamed via Redis/SSE.
*/

import { Injectable, Inject } from '@nestjs/common'
import { Subject, type Observable } from 'rxjs'
import type { EntityId, Metadata, WorkflowEventType } from '@contextgraph/types'
import { IWorkflowEventEmitter, IWorkflowEventRepository } from '../domain/workflow.interfaces'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { uuid as generateUUIDv7 } from '../../../common/utils/uuid'

@Injectable()
export class WorkflowEventEmitter implements IWorkflowEventEmitter {
  /** In-memory subjects for SSE streaming — keyed by execution ID. */
  private readonly subjects = new Map<string, Subject<unknown>>()

  constructor(
    @Inject(IWorkflowEventRepository)
    private readonly eventRepo: IWorkflowEventRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  emit(
    executionId: EntityId,
    eventType: WorkflowEventType,
    nodeId: EntityId | null,
    data: Metadata,
  ): void {
    const eventId = generateUUIDv7()

    // Persist the event
    this.eventRepo
      .create({
        eventId,
        executionId,
        nodeId,
        eventType,
        metadata: data,
      })
      .catch((error) => {
        this.logger.error('Failed to persist workflow event', { executionId, eventType, error })
      })

    // Stream to SSE subscribers
    const subject = this.subjects.get(executionId)
    if (subject) {
      subject.next({
        eventId,
        eventType,
        nodeId,
        timestamp: new Date().toISOString(),
        data,
      })
    }
  }

  stream(executionId: string): Observable<unknown> {
    if (!this.subjects.has(executionId)) {
      this.subjects.set(executionId, new Subject<unknown>())
    }
    return this.subjects.get(executionId)!.asObservable()
  }

  complete(executionId: string): void {
    const subject = this.subjects.get(executionId)
    if (subject) {
      subject.complete()
      this.subjects.delete(executionId)
    }
  }
}
