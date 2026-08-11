import { Module } from '@nestjs/common'
import { GraphModule } from '../graph/graph.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { RuleEngineModule } from '../rule-engine/rule-engine.module'
import { IPipelineService, PipelineService } from './pipeline.service'
import { PipelineController } from './pipeline.controller'
import {
  IContextAssemblyService,
  ContextAssemblyService,
} from './context-assembly/context-assembly.service'
import { ContextAssemblyController } from './context-assembly/context-assembly.controller'

/* Pipeline module — the context-assembly pipeline orchestrator. */
@Module({
  imports: [GraphModule, KnowledgeModule, RuleEngineModule],
  controllers: [PipelineController, ContextAssemblyController],
  providers: [
    { provide: IPipelineService, useClass: PipelineService },
    { provide: IContextAssemblyService, useClass: ContextAssemblyService },
  ],
  exports: [IPipelineService, IContextAssemblyService],
})
export class PipelineModule {}
