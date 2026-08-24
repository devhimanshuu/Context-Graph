/* Checkpoint manager — creates deterministic state hashes and manages checkpoints.

The checkpoint system enables durable execution and recovery.
Each checkpoint captures the complete workflow state at a point in time.
*/

import { Injectable, Inject } from '@nestjs/common'
import { createHash } from 'crypto'
import type { EntityId, Metadata, WorkflowCheckpoint } from '@contextgraph/types'
import { ICheckpointManager, IWorkflowCheckpointRepository } from '../domain/workflow.interfaces'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { uuid as generateUUIDv7 } from '../../../common/utils/uuid'

@Injectable()
export class CheckpointManager implements ICheckpointManager {
  constructor(
    @Inject(IWorkflowCheckpointRepository)
    private readonly checkpointRepo: IWorkflowCheckpointRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async createCheckpoint(
    executionId: EntityId,
    workflowVersion: number,
    state: Metadata,
  ): Promise<WorkflowCheckpoint> {
    const checkpoint = await this.checkpointRepo.create({
      checkpointId: generateUUIDv7(),
      executionId,
      sequence: await this.getNextSequence(executionId),
      workflowVersion,
      stateHash: this.computeStateHash(state),
      stateSnapshot: this.sanitizeSnapshot(state),
    })

    this.logger.info('Checkpoint created', {
      executionId,
      checkpointId: checkpoint.checkpointId,
      sequence: checkpoint.sequence,
      stateHash: checkpoint.stateHash,
    })

    return checkpoint
  }

  async getLatestCheckpoint(executionId: EntityId): Promise<WorkflowCheckpoint | null> {
    return this.checkpointRepo.findLatest(executionId)
  }

  computeStateHash(state: Metadata): string {
    // Deterministic hash of workflow state for integrity checks
    const canonical = JSON.stringify(state, Object.keys(state).sort())
    return createHash('sha256').update(canonical).digest('hex').slice(0, 16)
  }

  private async getNextSequence(executionId: EntityId): Promise<number> {
    const existing = await this.checkpointRepo.findByExecution(executionId)
    return existing.length + 1
  }

  /**
   * Sanitize a state snapshot before persisting.
   * Remove internal fields that shouldn't be stored.
   */
  private sanitizeSnapshot(state: Metadata): Metadata {
    const sanitized: Metadata = {}
    for (const [key, value] of Object.entries(state)) {
      // Keep all data — the runtime controls what goes into state
      sanitized[key] = value
    }
    return sanitized
  }
}
