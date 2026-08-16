import { Module } from '@nestjs/common'
import { GraphModule } from '../graph/graph.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { RuleEngineModule } from '../rule-engine/rule-engine.module'
import { CandidateModule } from '../candidate/candidate.module'
import { AuthorizationModule } from '../authorization/authorization.module'
import { IPipelineService, PipelineService } from './pipeline.service'
import { PipelineController } from './pipeline.controller'
import {
  IContextAssemblyService,
  ContextAssemblyService,
} from './context-assembly/context-assembly.service'
import { ContextAssemblyController } from './context-assembly/context-assembly.controller'
import {
  IContextPipelineOrchestrator,
  ContextPipelineOrchestrator,
} from './orchestrator/context-pipeline-orchestrator'
import { ContextPipelineController } from './context-pipeline.controller'
import { IContextBudget, TokenContextBudget } from './budget/context-budget'
import { PIPELINE_METRICS, InMemoryPipelineMetrics } from './observability/pipeline-metrics'
import { PIPELINE_AUDIT, PipelineAuditLogger } from './observability/pipeline-audit'
import { IContextFormatter } from './formatter/context-formatter.contracts'
import { ContextFormatter } from './formatter/context-formatter.service'
import { IPipelineRunService, PipelineRunService } from './runs/pipeline-run.service'
import { IPipelineRunRepository, PipelineRunPrismaRepository } from './runs/pipeline-run.repository'
import { PipelineRunController } from './runs/pipeline-run.controller'

/**
 * Pipeline module — Phase 7 composition boundary.
 *
 * The orchestrator drives the engines WITHOUT reimplementing them:
 * authorization (Phase 5), graph traversal (Phase 4), rule engine (Phase 6,
 * which performs global injection), and the candidate module (build + rank).
 * Every engine dependency is an interface token bound here, so replacing an
 * engine (e.g. A* traversal, Redis caching) never touches orchestrator code.
 */
@Module({
  imports: [AuthorizationModule, GraphModule, KnowledgeModule, RuleEngineModule, CandidateModule],
  controllers: [
    PipelineController,
    ContextAssemblyController,
    ContextPipelineController,
    PipelineRunController,
  ],
  providers: [
    { provide: IPipelineService, useClass: PipelineService },
    { provide: IContextAssemblyService, useClass: ContextAssemblyService },
    { provide: IContextPipelineOrchestrator, useClass: ContextPipelineOrchestrator },
    { provide: IContextBudget, useClass: TokenContextBudget },
    { provide: PIPELINE_METRICS, useClass: InMemoryPipelineMetrics },
    { provide: PIPELINE_AUDIT, useClass: PipelineAuditLogger },
    { provide: IPipelineRunRepository, useClass: PipelineRunPrismaRepository },
    { provide: IPipelineRunService, useClass: PipelineRunService },
    { provide: IContextFormatter, useClass: ContextFormatter },
  ],
  exports: [
    IPipelineService,
    IContextAssemblyService,
    IContextPipelineOrchestrator,
    IContextBudget,
    IPipelineRunService,
    IContextFormatter,
  ],
})
export class PipelineModule {}
