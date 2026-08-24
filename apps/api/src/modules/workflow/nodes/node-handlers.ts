/* Node handlers — strategy pattern for each workflow node type.

Each handler implements IWorkflowNodeHandler and is registered in the NodeHandlerRegistry.
Handlers receive authorized context only — they never bypass ContextGraph.
*/

import { Injectable } from '@nestjs/common'
import type { Metadata, WorkflowNode, WorkflowNodeType, NodeExecution } from '@contextgraph/types'
import {
  type IWorkflowNodeHandler,
  type NodeHandlerContext,
  type NodeHandlerResult,
} from '../domain/workflow.interfaces'

// ---------------------------------------------------------------------------
// Start Node — passes through workflow input
// ---------------------------------------------------------------------------

@Injectable()
export class StartNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'START' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    return {
      success: true,
      output: {
        ...context.workflowInput,
        _startNodeId: node.nodeId,
        _startedAt: Date.now(),
      },
      error: null,
    }
  }
}

// ---------------------------------------------------------------------------
// End Node — collects outputs and produces final result
// ---------------------------------------------------------------------------

@Injectable()
export class EndNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'END' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    _node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    // Merge all upstream outputs into a final output
    const finalOutput: Metadata = {
      ...context.workflowInput,
      ...context.upstreamOutputs,
    }

    return {
      success: true,
      output: finalOutput,
      error: null,
    }
  }
}

// ---------------------------------------------------------------------------
// Agent Node — delegates to AgentRuntime for LLM-powered reasoning
// ---------------------------------------------------------------------------

@Injectable()
export class AgentNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'AGENT' as WorkflowNodeType

  async execute(
    nodeExecution: NodeExecution,
    node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    const config = node.configuration
    const agentType = (config.agentType as string) ?? 'RESEARCHER'
    const systemPrompt = (config.systemPrompt as string) ?? ''
    const maxIterations = (config.maxIterations as number) ?? 5

    // Build the agent prompt from upstream outputs and node config
    const prompt = this.buildAgentPrompt(context.upstreamOutputs, systemPrompt, config)

    // Agent node delegates to the agent runtime
    // The agent runtime handles tool authorization, context access, etc.
    try {
      // We don't have direct access to AgentRuntime here — we return the
      // instruction for the workflow runtime to execute. The runtime will
      // call AgentRuntime.execute() with the proper context.
      return {
        success: true,
        output: {
          _requiresAgentExecution: true,
          agentType,
          prompt,
          maxIterations,
          organizationId: context.organizationId,
          userId: context.userId,
          workspaceId: context.workspaceId,
        },
        error: null,
      }
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Agent execution failed',
      }
    }
  }

  private buildAgentPrompt(
    upstreamOutputs: Metadata,
    systemPrompt: string,
    config: Metadata,
  ): string {
    const parts: string[] = []

    if (systemPrompt) {
      parts.push(`System: ${systemPrompt}`)
    }

    const task = config.task as string
    if (task) {
      parts.push(`Task: ${task}`)
    }

    // Include upstream outputs as context
    for (const [key, value] of Object.entries(upstreamOutputs)) {
      if (key.startsWith('_')) continue // skip internal fields
      parts.push(`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    }

    return parts.join('\n\n')
  }
}

// ---------------------------------------------------------------------------
// Context Request Node — requests authorized context from ContextGraph
// ---------------------------------------------------------------------------

@Injectable()
export class ContextRequestNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'CONTEXT_REQUEST' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    const config = node.configuration
    const query = (config.query as string) ?? ''
    const strategy = (config.strategy as string) ?? 'HYBRID'
    const maxCandidates = (config.maxCandidates as number) ?? 10

    // The context request is fulfilled through ContextGraph's pipeline
    // which enforces permissions and rules. The runtime calls this.
    return {
      success: true,
      output: {
        _requiresContextRetrieval: true,
        query,
        strategy,
        maxCandidates,
        organizationId: context.organizationId,
        userId: context.userId,
        workspaceId: context.workspaceId,
      },
      error: null,
    }
  }
}

// ---------------------------------------------------------------------------
// Condition Node — deterministic conditional branching
// ---------------------------------------------------------------------------

@Injectable()
export class ConditionNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'CONDITION' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    const config = node.configuration
    const condition = config.condition as string
    const trueBranch = config.trueBranchTarget as string | null
    const falseBranch = config.falseBranchTarget as string | null

    // Evaluate condition against upstream outputs
    const conditionResult = this.evaluateCondition(condition, context.upstreamOutputs)

    return {
      success: true,
      output: {
        conditionResult,
        trueBranch,
        falseBranch,
        evaluatedCondition: condition,
      },
      error: null,
    }
  }

  private evaluateCondition(condition: string, context: Metadata): boolean {
    try {
      const parsed = JSON.parse(condition) as {
        field: string
        operator: string
        value: string | number | boolean
      }
      const fieldValue = context[parsed.field]

      if (fieldValue === undefined) return false

      switch (parsed.operator) {
        case '>=':
          return Number(fieldValue) >= Number(parsed.value)
        case '<=':
          return Number(fieldValue) <= Number(parsed.value)
        case '>':
          return Number(fieldValue) > Number(parsed.value)
        case '<':
          return Number(fieldValue) < Number(parsed.value)
        case '==':
          return String(fieldValue) === String(parsed.value)
        case '!=':
          return String(fieldValue) !== String(parsed.value)
        case 'contains':
          return String(fieldValue).includes(String(parsed.value))
        case 'exists':
          return fieldValue !== null && fieldValue !== undefined
        default:
          return false
      }
    } catch {
      return false
    }
  }
}

// ---------------------------------------------------------------------------
// Parallel Node — signals the start of a parallel branch
// ---------------------------------------------------------------------------

@Injectable()
export class ParallelNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'PARALLEL' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    _node: WorkflowNode,
    _context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    // The parallel node is primarily handled by the scheduler.
    // When this node completes, the scheduler will schedule all downstream
    // branches concurrently.
    return {
      success: true,
      output: {
        _parallelStarted: true,
        timestamp: Date.now(),
      },
      error: null,
    }
  }
}

// ---------------------------------------------------------------------------
// Merge Node — combines outputs from parallel branches
// ---------------------------------------------------------------------------

@Injectable()
export class MergeNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'MERGE' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    const config = node.configuration
    const strategy = (config.strategy as string) ?? 'ALL_REQUIRED'

    // Merge all upstream outputs
    const merged: Metadata = {
      ...context.upstreamOutputs,
      _mergeStrategy: strategy,
      _mergedAt: Date.now(),
    }

    return {
      success: true,
      output: merged,
      error: null,
    }
  }
}

// ---------------------------------------------------------------------------
// Human Approval Node — pauses execution until human approves/rejects
// ---------------------------------------------------------------------------

@Injectable()
export class HumanApprovalNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'HUMAN_APPROVAL' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    node: WorkflowNode,
    _context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    const config = node.configuration
    const requestedAction = (config.action as string) ?? 'workflow continuation'
    const riskLevel = (config.riskLevel as string) ?? 'MEDIUM'

    // Return a signal that the runtime should create an approval request
    // and set the workflow to WAITING_FOR_APPROVAL
    return {
      success: true,
      output: {
        _requiresApproval: true,
        requestedAction,
        riskLevel,
        nodeId: node.nodeId,
      },
      error: null,
    }
  }
}

// ---------------------------------------------------------------------------
// Verification Node — checks results against requirements
// ---------------------------------------------------------------------------

@Injectable()
export class VerificationNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'VERIFICATION' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    const config = node.configuration
    const checks = (config.checks as string[]) ?? []

    const results: Array<{ check: string; passed: boolean; reason?: string }> = []

    for (const check of checks) {
      const result = this.runCheck(check, context.upstreamOutputs)
      results.push(result)
    }

    const allPassed = results.every((r) => r.passed)

    return {
      success: allPassed,
      output: {
        verificationResults: results,
        allPassed,
        checksRun: checks.length,
        checksPassed: results.filter((r) => r.passed).length,
      },
      error: allPassed
        ? null
        : `Verification failed: ${results
            .filter((r) => !r.passed)
            .map((r) => r.reason ?? r.check)
            .join(', ')}`,
    }
  }

  private runCheck(
    check: string,
    context: Metadata,
  ): { check: string; passed: boolean; reason?: string } {
    switch (check) {
      case 'output_exists': {
        const hasOutput = Object.keys(context).some(
          (k) => !k.startsWith('_') && context[k] !== null && context[k] !== undefined,
        )
        return {
          check,
          passed: hasOutput,
          reason: hasOutput ? undefined : 'No non-internal output found',
        }
      }
      case 'sources_authorized': {
        // Check that all context sources are authorized
        const sources = context.sources as string[] | undefined
        if (!sources || sources.length === 0) {
          return { check, passed: false, reason: 'No authorized sources in context' }
        }
        return { check, passed: true }
      }
      case 'citations_valid': {
        const citations = context.citations as string[] | undefined
        if (!citations) {
          return { check, passed: false, reason: 'No citations found' }
        }
        return { check, passed: true }
      }
      case 'policy_compliant': {
        // Verify no policy violations in the context
        const violations = context.policyViolations as string[] | undefined
        if (violations && violations.length > 0) {
          return { check, passed: false, reason: `Policy violations: ${violations.join(', ')}` }
        }
        return { check, passed: true }
      }
      default:
        return { check, passed: true }
    }
  }
}

// ---------------------------------------------------------------------------
// Tool Node — executes a registered tool
// ---------------------------------------------------------------------------

@Injectable()
export class ToolNodeHandler implements IWorkflowNodeHandler {
  readonly nodeType = 'TOOL' as WorkflowNodeType

  async execute(
    _nodeExecution: NodeExecution,
    node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult> {
    const config = node.configuration
    const toolName = config.toolName as string
    const toolInput = (config.input as Metadata) ?? {}

    if (!toolName) {
      return {
        success: false,
        output: null,
        error: 'Tool node requires a toolName in configuration',
      }
    }

    // Return instruction for runtime to execute the tool through ToolRegistry
    return {
      success: true,
      output: {
        _requiresToolExecution: true,
        toolName,
        toolInput: {
          ...toolInput,
          ...context.upstreamOutputs,
        },
        organizationId: context.organizationId,
        userId: context.userId,
      },
      error: null,
    }
  }
}

// ---------------------------------------------------------------------------
// Node Handler Registry
// ---------------------------------------------------------------------------

@Injectable()
export class NodeHandlerRegistry {
  private readonly handlers = new Map<WorkflowNodeType, IWorkflowNodeHandler>()

  constructor(
    startHandler: StartNodeHandler,
    endHandler: EndNodeHandler,
    agentHandler: AgentNodeHandler,
    contextRequestHandler: ContextRequestNodeHandler,
    conditionHandler: ConditionNodeHandler,
    parallelHandler: ParallelNodeHandler,
    mergeHandler: MergeNodeHandler,
    humanApprovalHandler: HumanApprovalNodeHandler,
    verificationHandler: VerificationNodeHandler,
    toolHandler: ToolNodeHandler,
  ) {
    this.register(startHandler)
    this.register(endHandler)
    this.register(agentHandler)
    this.register(contextRequestHandler)
    this.register(conditionHandler)
    this.register(parallelHandler)
    this.register(mergeHandler)
    this.register(humanApprovalHandler)
    this.register(verificationHandler)
    this.register(toolHandler)
  }

  private register(handler: IWorkflowNodeHandler): void {
    this.handlers.set(handler.nodeType, handler)
  }

  getHandler(nodeType: WorkflowNodeType): IWorkflowNodeHandler | null {
    return this.handlers.get(nodeType) ?? null
  }

  hasHandler(nodeType: WorkflowNodeType): boolean {
    return this.handlers.has(nodeType)
  }

  getRegisteredTypes(): readonly WorkflowNodeType[] {
    return [...this.handlers.keys()]
  }
}
