/* Agent Module — Phase 15 composition boundary.

The agent module is an ORCHESTRATOR.
ContextGraph is the AUTHORIZATION AND CONTEXT AUTHORITY.
ModelGateway is the MODEL AUTHORITY.
ToolRegistry is the TOOL AUTHORITY.
AgentPolicy is the EXECUTION POLICY AUTHORITY.

No single LLM call has authority over all four.
*/

import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../authorization/authorization.module'
import { PipelineModule } from '../pipeline/pipeline.module'
import { GraphModule } from '../graph/graph.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import { AiModule } from '../ai/ai.module'
import { AuditModule } from '../audit/audit.module'

// Controller
import { AgentController } from './agent.controller'

// State machine (pure, no DI)
import { AgentStateMachine } from './state/state-machine'

// Interfaces (all abstract DI tokens live in one file)
import {
  IAgentRuntime,
  IAgentStateManager,
  IAgentPlanner,
  IToolRegistry,
  IToolAuthorizer,
  IToolInputValidator,
  IToolExecutor,
  ILoopDetector,
  IAgentVerifier,
  IAgentPolicy,
  IInjectionDetector,
  IAgentCostCalculator,
  IMemoryStore,
  IAgentExecutionRepository,
} from './domain/agent.interfaces'

// Concrete implementations
import { AgentRuntime } from './runtime/agent-runtime'
import { AgentStateManager } from './state/agent-state'
import { AgentPlanner } from './planner/agent-planner'
import { LLMAgentPlanner } from './planner/llm-planner'
import { HybridPlanner } from './planner/hybrid-planner'
import { ModelGatewayAdapter } from './planner/model-gateway-adapter'
import { IAgentModelGenerator, AGENT_MODEL_GENERATOR } from './planner/llm-planner'
import { ToolRegistry } from './tools/tool-registry'
import { ToolAuthorizer } from './tools/tool-authorizer'
import { ToolInputValidator } from './tools/tool-validator'
import { ToolExecutor } from './tools/tool-executor'
import { LoopDetector } from './tools/loop-detector'
import { AgentVerifier } from './verification/agent-verifier'
import { AgentPolicy } from './policies/agent-policy'
import { InjectionDetector } from './security/injection-detector'
import { AgentCostCalculator } from './cost/agent-cost-calculator'
import { InMemoryStore } from './memory/in-memory-store'
import { AgentExecutionPrismaRepository } from './repositories/agent-execution.repository'
import { AgentObservability } from './observability/agent-observability'
import { AgentEventEmitter } from './observability/agent-event-emitter'
import { HumanApprovalService } from './approval/human-approval.service'

// Tool factory functions
import { createContextSearchTool } from './tools/tools/context-search.tool'
import { createGraphExploreTool } from './tools/tools/graph-explore.tool'
import { createKnowledgeLookupTool } from './tools/tools/knowledge-lookup.tool'
import { createPolicyCheckTool } from './tools/tools/policy-check.tool'
import { createCalculatorTool } from './tools/tools/calculator.tool'

// Real ContextGraph services (imported from their modules)
import { IContextAssemblyService } from '../pipeline/context-assembly/context-assembly.service'
import { IGraphService } from '../graph/graph.service'
import { IKnowledgeService } from '../knowledge/knowledge.service'
import { IAuthorizationService } from '../authorization/services/authorization.service'
import type { ILogger } from '../../common/interfaces/logger.interface'
import { LOGGER } from '../../common/interfaces/logger.interface'
import type { ToolDependencies } from './tools/tool-dependencies'

/**
 * Token for tool dependencies — all real ContextGraph services.
 */
const TOOL_DEPENDENCIES = Symbol('ToolDependencies')

/**
 * Provider that assembles ToolDependencies from real ContextGraph services
 * and registers all built-in tools with the registry.
 */
function createToolDependenciesProvider() {
  return {
    provide: TOOL_DEPENDENCIES,
    useFactory: (
      registry: ToolRegistry,
      contextAssembly: IContextAssemblyService,
      graphService: IGraphService,
      knowledgeService: IKnowledgeService,
      authorizationService: IAuthorizationService,
      logger: ILogger,
    ): ToolDependencies => {
      const deps: ToolDependencies = {
        contextAssembly,
        graphService,
        knowledgeService,
        authorizationService,
      }

      // Register all built-in tools with real dependencies
      registry.register(createContextSearchTool(logger, deps))
      registry.register(createGraphExploreTool(logger, deps))
      registry.register(createKnowledgeLookupTool(logger, deps))
      registry.register(createPolicyCheckTool(logger, deps))
      registry.register(createCalculatorTool(logger))

      return deps
    },
    inject: [
      IToolRegistry,
      IContextAssemblyService,
      IGraphService,
      IKnowledgeService,
      IAuthorizationService,
      LOGGER,
    ],
  }
}

/**
 * Module configuration:
 *
 * Dependency Injection uses abstract class tokens throughout.
 * Every dependency is replaceable by swapping the binding.
 *
 * Tools receive real ContextGraph services (GraphEngine, KnowledgeService,
 * AuthorizationService, ContextAssemblyService) so they execute through
 * the full authorization pipeline.
 */
@Module({
  imports: [
    AuthorizationModule,
    PipelineModule,
    GraphModule,
    KnowledgeModule,
    AiModule,
    AuditModule,
  ],
  controllers: [AgentController],
  providers: [
    // State machine (pure, no dependencies)
    AgentStateMachine,

    // Repository
    {
      provide: IAgentExecutionRepository,
      useClass: AgentExecutionPrismaRepository,
    },

    // State manager
    {
      provide: IAgentStateManager,
      useClass: AgentStateManager,
    },

    // Model Gateway Adapter (bridges AI module to agent planner)
    {
      provide: AGENT_MODEL_GENERATOR,
      useClass: ModelGatewayAdapter,
    },
    {
      provide: IAgentModelGenerator,
      useExisting: AGENT_MODEL_GENERATOR,
    },

    // Planner: HybridPlanner (LLM + rule-based fallback)
    LLMAgentPlanner,
    AgentPlanner,
    {
      provide: IAgentPlanner,
      useClass: HybridPlanner,
    },

    // Tool system
    {
      provide: IToolRegistry,
      useClass: ToolRegistry,
    },
    {
      provide: IToolAuthorizer,
      useClass: ToolAuthorizer,
    },
    {
      provide: IToolInputValidator,
      useClass: ToolInputValidator,
    },
    {
      provide: IToolExecutor,
      useClass: ToolExecutor,
    },
    {
      provide: ILoopDetector,
      useClass: LoopDetector,
    },

    // Tool dependencies (assembles real services + registers tools)
    createToolDependenciesProvider(),

    // Verification
    {
      provide: IAgentVerifier,
      useClass: AgentVerifier,
    },

    // Policy
    {
      provide: IAgentPolicy,
      useClass: AgentPolicy,
    },

    // Security
    {
      provide: IInjectionDetector,
      useClass: InjectionDetector,
    },

    // Cost
    {
      provide: IAgentCostCalculator,
      useClass: AgentCostCalculator,
    },

    // Memory
    {
      provide: IMemoryStore,
      useClass: InMemoryStore,
    },

    // Observability
    AgentObservability,
    AgentEventEmitter,

    // Approval
    HumanApprovalService,

    // Runtime (orchestrator — depends on all above)
    {
      provide: IAgentRuntime,
      useClass: AgentRuntime,
    },
  ],
  exports: [
    IAgentRuntime,
    IAgentStateManager,
    IAgentPlanner,
    IToolRegistry,
    IAgentVerifier,
    IAgentPolicy,
    IAgentExecutionRepository,
    AgentObservability,
    AgentEventEmitter,
    HumanApprovalService,
  ],
})
export class AgentModule {}
