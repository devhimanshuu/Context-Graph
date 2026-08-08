import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from '@contextgraph/types'
import { type ILogger, LOGGER } from '../../common/interfaces/logger.interface'
import { getRequestId } from '../../common/context/request-context'
import {
  DEFAULT_STAGE_ORDER,
  type IPipelineStage,
  type PipelineContext,
  type PipelineMetrics,
  type PipelineResponse,
} from './pipeline.contracts'
import type { PipelineRequestInput } from './pipeline.validation'

export abstract class IPipelineService {
  abstract execute(user: AuthenticatedUser, input: PipelineRequestInput): Promise<PipelineResponse>
  abstract getDefinition(): { stages: readonly string[]; version: number }
  abstract registerStage(stage: IPipelineStage): void
}

/* Pipeline orchestrator. Generic by design: stages register themselves (DI-provided in later */
@Injectable()
export class PipelineService implements IPipelineService {
  private readonly stages = new Map<string, IPipelineStage>()

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  registerStage(stage: IPipelineStage): void {
    this.stages.set(stage.name, stage)
    this.logger.debug('Pipeline stage registered', { stage: stage.name })
  }

  getDefinition(): { stages: readonly string[]; version: number } {
    return { stages: DEFAULT_STAGE_ORDER, version: 1 }
  }

  async execute(user: AuthenticatedUser, input: PipelineRequestInput): Promise<PipelineResponse> {
    const startedAt = Date.now()
    const context: PipelineContext = {
      requestId: getRequestId(),
      user,
      organizationId: user.organizationId,
      workspaceId: input.workspaceId,
      entryNodeIds: [],
      state: { ...input.context },
    }

    let executed = 0
    for (const name of DEFAULT_STAGE_ORDER) {
      const stage = this.stages.get(name)
      if (stage === undefined) continue // stage not wired yet — skip, keep pipeline composable
      executed += 1
      const next = await stage.execute(context)
      Object.assign(context.state, next.state)
    }

    const metrics: PipelineMetrics = {
      stagesExecuted: executed,
      nodesVisited: (context.state.nodesVisited as number | undefined) ?? 0,
      durationMs: Date.now() - startedAt,
    }

    this.logger.debug('Pipeline executed', {
      stages: executed,
      requestId: context.requestId,
      durationMs: metrics.durationMs,
    })

    return {
      candidateIds: (context.state.candidateIds as string[] | undefined) ?? [],
      metrics,
    }
  }
}
