/* Workflow Module — Phase 16 composition boundary.

The workflow module is the ORCHESTRATION LAYER.
ContextGraph remains the AUTHORIZATION AND CONTEXT AUTHORITY.
AgentRuntime remains the AGENT REASONING AUTHORITY.
ModelGateway remains the MODEL AUTHORITY.

No single component controls all responsibilities.
*/

import { Module } from '@nestjs/common'
import { AgentModule } from '../agent/agent.module'
import { AuthorizationModule } from '../authorization/authorization.module'
import { PipelineModule } from '../pipeline/pipeline.module'
import { GraphModule } from '../graph/graph.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { AiModule } from '../ai/ai.module'
import { AuditModule } from '../audit/audit.module'

// Controller
import { WorkflowController } from './workflow.controller'

// Domain interfaces (abstract DI tokens)
import {
  IWorkflowDefinitionRepository,
  IWorkflowExecutionRepository,
  INodeExecutionRepository,
  IWorkflowEventRepository,
  IWorkflowCheckpointRepository,
  IWorkflowApprovalRepository,
  IDagValidator,
  IWorkflowScheduler,
  IWorkflowStateMachine,
  IWorkflowRetryManager,
  IWorkflowRuntime,
  IWorkflowEventEmitter,
  ICheckpointManager,
  IWorkflowObservability,
  IWorkflowPolicy,
} from './domain/workflow.interfaces'

// Concrete implementations
import { DagValidator } from './dag/dag-validator'
import { WorkflowStateMachine } from './state/workflow-state-machine'
import { WorkflowScheduler } from './scheduler/workflow-scheduler'
import { WorkflowRetryManager } from './retries/workflow-retry-manager'
import { WorkflowRuntime } from './runtime/workflow-runtime'
import { CheckpointManager } from './checkpoints/checkpoint-manager'
import { WorkflowEventEmitter } from './events/workflow-event-emitter'
import { WorkflowObservability } from './observability/workflow-observability'
import { WorkflowPolicy } from './policies/workflow-policy'
import { SpecializedAgentRegistry } from './agents/specialized-agent-registry'

// Node handlers
import {
  NodeHandlerRegistry,
  StartNodeHandler,
  EndNodeHandler,
  AgentNodeHandler,
  ContextRequestNodeHandler,
  ConditionNodeHandler,
  ParallelNodeHandler,
  MergeNodeHandler,
  HumanApprovalNodeHandler,
  VerificationNodeHandler,
  ToolNodeHandler,
} from './nodes/node-handlers'

// Prisma repositories
import { WorkflowDefinitionPrismaRepository } from './repositories/workflow-definition.repository'
import { WorkflowExecutionPrismaRepository } from './repositories/workflow-execution.repository'
import { NodeExecutionPrismaRepository } from './repositories/node-execution.repository'
import { WorkflowEventPrismaRepository } from './repositories/workflow-event.repository'
import { WorkflowCheckpointPrismaRepository } from './repositories/workflow-checkpoint.repository'
import { WorkflowApprovalPrismaRepository } from './repositories/workflow-approval.repository'

/**
 * WorkflowModule — all dependencies are bound through abstract tokens.
 *
 * Separation of authorities:
 *   WORKFLOW ENGINE  → execution control
 *   CONTEXTGRAPH     → knowledge access
 *   AGENT RUNTIME    → agent reasoning
 *   MODEL GATEWAY    → model communication
 */
@Module({
  imports: [
    AgentModule,
    AuthorizationModule,
    PipelineModule,
    GraphModule,
    KnowledgeModule,
    AiModule,
    AuditModule,
  ],
  controllers: [WorkflowController],
  providers: [
    // --- Repositories (Prisma) ---
    {
      provide: IWorkflowDefinitionRepository,
      useClass: WorkflowDefinitionPrismaRepository,
    },
    {
      provide: IWorkflowExecutionRepository,
      useClass: WorkflowExecutionPrismaRepository,
    },
    {
      provide: INodeExecutionRepository,
      useClass: NodeExecutionPrismaRepository,
    },
    {
      provide: IWorkflowEventRepository,
      useClass: WorkflowEventPrismaRepository,
    },
    {
      provide: IWorkflowCheckpointRepository,
      useClass: WorkflowCheckpointPrismaRepository,
    },
    {
      provide: IWorkflowApprovalRepository,
      useClass: WorkflowApprovalPrismaRepository,
    },

    // --- Core engine (pure, deterministic) ---
    {
      provide: IDagValidator,
      useClass: DagValidator,
    },
    {
      provide: IWorkflowStateMachine,
      useClass: WorkflowStateMachine,
    },
    {
      provide: IWorkflowScheduler,
      useClass: WorkflowScheduler,
    },
    {
      provide: IWorkflowRetryManager,
      useClass: WorkflowRetryManager,
    },

    // --- Infrastructure ---
    {
      provide: ICheckpointManager,
      useClass: CheckpointManager,
    },
    {
      provide: IWorkflowEventEmitter,
      useClass: WorkflowEventEmitter,
    },
    {
      provide: IWorkflowObservability,
      useClass: WorkflowObservability,
    },
    {
      provide: IWorkflowPolicy,
      useClass: WorkflowPolicy,
    },

    // --- Agent registry ---
    SpecializedAgentRegistry,

    // --- Node handlers ---
    StartNodeHandler,
    EndNodeHandler,
    AgentNodeHandler,
    ContextRequestNodeHandler,
    ConditionNodeHandler,
    ParallelNodeHandler,
    MergeNodeHandler,
    HumanApprovalNodeHandler,
    VerificationNodeHandler,
    ToolNodeHandler,
    NodeHandlerRegistry,

    // --- Runtime (orchestrator — depends on all above) ---
    {
      provide: IWorkflowRuntime,
      useClass: WorkflowRuntime,
    },
  ],
  exports: [
    IWorkflowRuntime,
    IWorkflowDefinitionRepository,
    IWorkflowExecutionRepository,
    INodeExecutionRepository,
    IDagValidator,
    IWorkflowScheduler,
    IWorkflowObservability,
    SpecializedAgentRegistry,
  ],
})
export class WorkflowModule {}
