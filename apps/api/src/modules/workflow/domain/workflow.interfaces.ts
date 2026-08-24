/* Workflow domain interfaces — all dependency injection tokens for the workflow module.

Separation of authorities:
  WORKFLOW ENGINE  → execution control
  CONTEXTGRAPH     → knowledge access
  AGENT RUNTIME    → agent reasoning
  MODEL GATEWAY    → model communication
*/

import type {
  EntityId,
  Metadata,
  Milliseconds,
  Timestamp,
  WorkflowDefinition,
  WorkflowDefinitionStatus,
  WorkflowExecution,
  WorkflowExecutionStatus,
  NodeExecution,
  NodeExecutionStatus,
  WorkflowCheckpoint,
  WorkflowEvent,
  WorkflowEventType,
  WorkflowApprovalRequest,
  WorkflowExecutionPolicy,
  RetryPolicy,
  WorkflowNodeType,
  WorkflowEdge,
  WorkflowNode,
} from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Workflow Repository
// ---------------------------------------------------------------------------

export abstract class IWorkflowDefinitionRepository {
  abstract create(data: WorkflowDefinitionCreateData): Promise<WorkflowDefinition>
  abstract findById(workflowId: EntityId): Promise<WorkflowDefinition | null>
  abstract findByName(
    organizationId: EntityId,
    name: string,
    version?: number,
  ): Promise<WorkflowDefinition | null>
  abstract findByOrganization(
    organizationId: EntityId,
    status?: WorkflowDefinitionStatus,
  ): Promise<readonly WorkflowDefinition[]>
  abstract updateStatus(workflowId: EntityId, status: WorkflowDefinitionStatus): Promise<void>
  abstract findLatestVersion(
    organizationId: EntityId,
    name: string,
  ): Promise<WorkflowDefinition | null>
  abstract countByOrganization(organizationId: EntityId): Promise<number>
}

export interface WorkflowDefinitionCreateData {
  readonly workflowId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId | null
  readonly createdBy: EntityId
  readonly name: string
  readonly description: string
  readonly version: number
  readonly nodes: readonly WorkflowNode[]
  readonly edges: readonly WorkflowEdge[]
  readonly inputSchema: Metadata
  readonly outputSchema: Metadata
  readonly executionPolicy: WorkflowExecutionPolicy
}

export abstract class IWorkflowExecutionRepository {
  abstract create(data: WorkflowExecutionCreateData): Promise<WorkflowExecution>
  abstract findById(executionId: EntityId): Promise<WorkflowExecution | null>
  abstract findByOrganization(
    organizationId: EntityId,
    limit?: number,
  ): Promise<readonly WorkflowExecution[]>
  abstract findByWorkflow(
    workflowId: EntityId,
    limit?: number,
  ): Promise<readonly WorkflowExecution[]>
  abstract findByUser(userId: EntityId, limit?: number): Promise<readonly WorkflowExecution[]>
  abstract updateStatus(
    executionId: EntityId,
    status: WorkflowExecutionStatus,
    extra?: WorkflowExecutionUpdateExtra,
  ): Promise<void>
  abstract updateCurrentNodes(
    executionId: EntityId,
    currentNodes: readonly EntityId[],
  ): Promise<void>
  abstract addCompletedNode(executionId: EntityId, nodeId: EntityId): Promise<void>
  abstract addFailedNode(executionId: EntityId, nodeId: EntityId): Promise<void>
  abstract incrementTokenUsage(executionId: EntityId, tokens: number): Promise<void>
  abstract incrementCost(executionId: EntityId, cost: number): Promise<void>
  abstract incrementAgentCalls(executionId: EntityId): Promise<void>
  abstract incrementToolCalls(executionId: EntityId): Promise<void>
  abstract getAnalytics(
    organizationId: EntityId,
    from: string,
    to: string,
  ): Promise<WorkflowAnalyticsRecord>
}

export interface WorkflowExecutionCreateData {
  readonly executionId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId | null
  readonly workflowId: EntityId
  readonly workflowVersion: number
  readonly userId: EntityId
  readonly input: Metadata
}

export interface WorkflowExecutionUpdateExtra {
  readonly output?: Metadata | null
  readonly error?: string | null
  readonly startedAt?: Timestamp | null
  readonly completedAt?: Timestamp | null
}

export abstract class INodeExecutionRepository {
  abstract create(data: NodeExecutionCreateData): Promise<NodeExecution>
  abstract findById(nodeExecutionId: EntityId): Promise<NodeExecution | null>
  abstract findByExecution(executionId: EntityId): Promise<readonly NodeExecution[]>
  abstract findByExecutionAndNode(
    executionId: EntityId,
    nodeId: EntityId,
  ): Promise<NodeExecution | null>
  abstract updateStatus(
    nodeExecutionId: EntityId,
    status: NodeExecutionStatus,
    extra?: NodeExecutionUpdateExtra,
  ): Promise<void>
  abstract updateOutput(nodeExecutionId: EntityId, output: Metadata): Promise<void>
  abstract incrementAttempt(nodeExecutionId: EntityId): Promise<void>
}

export interface NodeExecutionCreateData {
  readonly nodeExecutionId: EntityId
  readonly executionId: EntityId
  readonly nodeId: EntityId
  readonly nodeName: string
  readonly nodeType: WorkflowNodeType
  readonly maxAttempts: number
  readonly input: Metadata
}

export interface NodeExecutionUpdateExtra {
  readonly output?: Metadata | null
  readonly error?: string | null
  readonly startedAt?: Timestamp | null
  readonly completedAt?: Timestamp | null
  readonly durationMs?: Milliseconds | null
}

// ---------------------------------------------------------------------------
// Workflow Event Repository
// ---------------------------------------------------------------------------

export abstract class IWorkflowEventRepository {
  abstract create(data: WorkflowEventCreateData): Promise<WorkflowEvent>
  abstract findByExecution(executionId: EntityId): Promise<readonly WorkflowEvent[]>
}

export interface WorkflowEventCreateData {
  readonly eventId: EntityId
  readonly executionId: EntityId
  readonly nodeId: EntityId | null
  readonly eventType: WorkflowEventType
  readonly metadata: Metadata
}

// ---------------------------------------------------------------------------
// Workflow Checkpoint Repository
// ---------------------------------------------------------------------------

export abstract class IWorkflowCheckpointRepository {
  abstract create(data: WorkflowCheckpointCreateData): Promise<WorkflowCheckpoint>
  abstract findLatest(executionId: EntityId): Promise<WorkflowCheckpoint | null>
  abstract findByExecution(executionId: EntityId): Promise<readonly WorkflowCheckpoint[]>
}

export interface WorkflowCheckpointCreateData {
  readonly checkpointId: EntityId
  readonly executionId: EntityId
  readonly sequence: number
  readonly workflowVersion: number
  readonly stateHash: string
  readonly stateSnapshot: Metadata
}

// ---------------------------------------------------------------------------
// Workflow Approval Repository
// ---------------------------------------------------------------------------

export abstract class IWorkflowApprovalRepository {
  abstract create(data: WorkflowApprovalCreateData): Promise<WorkflowApprovalRequest>
  abstract findById(approvalId: EntityId): Promise<WorkflowApprovalRequest | null>
  abstract findByExecution(executionId: EntityId): Promise<readonly WorkflowApprovalRequest[]>
  abstract updateStatus(
    approvalId: EntityId,
    status: 'APPROVED' | 'REJECTED' | 'EXPIRED',
    approverId?: EntityId,
    note?: string,
  ): Promise<void>
}

export interface WorkflowApprovalCreateData {
  readonly approvalId: EntityId
  readonly executionId: EntityId
  readonly nodeExecutionId: EntityId
  readonly nodeId: EntityId
  readonly requestedAction: string
  readonly riskLevel: string
  readonly requestedBy: EntityId
  readonly expiresAt: Timestamp
}

// ---------------------------------------------------------------------------
// DAG Validator
// ---------------------------------------------------------------------------

export abstract class IDagValidator {
  abstract validate(
    nodes: readonly WorkflowNode[],
    edges: readonly WorkflowEdge[],
  ): DagValidationResult
}

export interface DagValidationResult {
  readonly valid: boolean
  readonly errors: readonly DagValidationError[]
  readonly warnings: readonly DagValidationError[]
  readonly entryNodes: readonly EntityId[]
  readonly terminalNodes: readonly EntityId[]
  readonly executionOrder: readonly EntityId[]
}

export interface DagValidationError {
  readonly nodeId: EntityId | null
  readonly edgeId: EntityId | null
  readonly type: string
  readonly message: string
}

// ---------------------------------------------------------------------------
// Workflow Scheduler
// ---------------------------------------------------------------------------

export abstract class IWorkflowScheduler {
  /**
   * Given the current state of a workflow execution, determine which nodes
   * are ready to execute next.
   */
  abstract getReadyNodes(
    execution: WorkflowExecution,
    nodes: readonly WorkflowNode[],
    edges: readonly WorkflowEdge[],
    completedNodeIds: readonly EntityId[],
    failedNodeIds: readonly EntityId[],
    runningNodeIds: readonly EntityId[],
  ): readonly WorkflowNode[]

  /**
   * Check if all terminal nodes have completed.
   */
  abstract isWorkflowComplete(
    nodes: readonly WorkflowNode[],
    completedNodeIds: readonly EntityId[],
    failedNodeIds: readonly EntityId[],
  ): boolean

  /**
   * Evaluate a condition node's expression against available data.
   */
  abstract evaluateCondition(condition: string, context: Metadata): boolean
}

// ---------------------------------------------------------------------------
// Workflow State Machine
// ---------------------------------------------------------------------------

export abstract class IWorkflowStateMachine {
  abstract canTransitionWorkflow(
    current: WorkflowExecutionStatus,
    requested: WorkflowExecutionStatus,
  ): WorkflowStateTransitionResult
  abstract canTransitionNode(
    current: NodeExecutionStatus,
    requested: NodeExecutionStatus,
  ): NodeStateTransitionResult
}

export interface WorkflowStateTransitionResult {
  readonly valid: boolean
  readonly error?: string
}

export interface NodeStateTransitionResult {
  readonly valid: boolean
  readonly error?: string
}

// ---------------------------------------------------------------------------
// Workflow Runtime (orchestrator)
// ---------------------------------------------------------------------------

export abstract class IWorkflowRuntime {
  abstract execute(input: WorkflowExecutionInput): Promise<WorkflowExecutionResult>
  abstract pause(executionId: EntityId, userId: EntityId): Promise<void>
  abstract resume(executionId: EntityId, userId: EntityId): Promise<void>
  abstract cancel(executionId: EntityId, userId: EntityId): Promise<void>
  abstract approve(
    executionId: EntityId,
    approvalId: EntityId,
    userId: EntityId,
    approved: boolean,
    note?: string,
  ): Promise<void>
  abstract getState(executionId: EntityId): Promise<WorkflowExecutionStateSnapshot | null>
}

export interface WorkflowExecutionInput {
  readonly workflowId: EntityId
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly workspaceId: EntityId | null
  readonly input: Metadata
}

export interface WorkflowExecutionResult {
  readonly executionId: EntityId
  readonly status: WorkflowExecutionStatus
  readonly output: Metadata | null
  readonly durationMs: Milliseconds
  readonly tokenUsage: number
  readonly estimatedCost: number
  readonly trace: readonly WorkflowTraceEntry[]
  readonly error: string | null
}

export interface WorkflowExecutionStateSnapshot {
  readonly executionId: EntityId
  readonly status: WorkflowExecutionStatus
  readonly currentNodes: readonly EntityId[]
  readonly completedNodes: readonly EntityId[]
  readonly failedNodes: readonly EntityId[]
}

export interface WorkflowTraceEntry {
  readonly timestamp: Timestamp
  readonly eventType: WorkflowEventType
  readonly nodeId: EntityId | null
  readonly nodeName: string | null
  readonly summary: string
  readonly metadata: Metadata
}

// ---------------------------------------------------------------------------
// Node Handler (strategy pattern for each node type)
// ---------------------------------------------------------------------------

export abstract class IWorkflowNodeHandler {
  abstract readonly nodeType: WorkflowNodeType

  abstract execute(
    nodeExecution: NodeExecution,
    node: WorkflowNode,
    context: NodeHandlerContext,
  ): Promise<NodeHandlerResult>
}

export interface NodeHandlerContext {
  readonly executionId: EntityId
  readonly organizationId: EntityId
  readonly userId: EntityId
  readonly workspaceId: EntityId | null
  readonly workflowInput: Metadata
  readonly upstreamOutputs: Metadata
  readonly checkpointManager: ICheckpointManager
}

export interface NodeHandlerResult {
  readonly success: boolean
  readonly output: Metadata | null
  readonly error: string | null
  readonly agentExecutionId?: EntityId
}

// ---------------------------------------------------------------------------
// Checkpoint Manager
// ---------------------------------------------------------------------------

export abstract class ICheckpointManager {
  abstract createCheckpoint(
    executionId: EntityId,
    workflowVersion: number,
    state: Metadata,
  ): Promise<WorkflowCheckpoint>

  abstract getLatestCheckpoint(executionId: EntityId): Promise<WorkflowCheckpoint | null>

  abstract computeStateHash(state: Metadata): string
}

// ---------------------------------------------------------------------------
// Retry Manager
// ---------------------------------------------------------------------------

export abstract class IWorkflowRetryManager {
  abstract shouldRetry(
    retryPolicy: RetryPolicy,
    currentAttempt: number,
    error: string,
  ): { readonly shouldRetry: boolean; readonly delayMs: Milliseconds }

  abstract calculateDelay(
    strategy: RetryPolicy['backoffStrategy'],
    baseDelayMs: Milliseconds,
    attempt: number,
    maxDelayMs: Milliseconds,
  ): Milliseconds
}

// ---------------------------------------------------------------------------
// Workflow Policy
// ---------------------------------------------------------------------------

export abstract class IWorkflowPolicy {
  abstract getExecutionPolicy(organizationId: EntityId): Promise<WorkflowExecutionPolicy>
  abstract checkAction(
    action: string,
    context: WorkflowPolicyContext,
  ): Promise<{ allowed: boolean; reason: string | null }>
}

export interface WorkflowPolicyContext {
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly userRole: string
  readonly workflowId: EntityId
}

// ---------------------------------------------------------------------------
// Workflow Event Emitter
// ---------------------------------------------------------------------------

export abstract class IWorkflowEventEmitter {
  abstract emit(
    executionId: EntityId,
    eventType: WorkflowEventType,
    nodeId: EntityId | null,
    data: Metadata,
  ): void
  abstract stream(executionId: string): import('rxjs').Observable<unknown>
  abstract complete(executionId: string): void
}

// ---------------------------------------------------------------------------
// Workflow Observability
// ---------------------------------------------------------------------------

export abstract class IWorkflowObservability {
  abstract recordExecution(metric: WorkflowExecutionMetric): void
  abstract getAnalytics(organizationId: EntityId, from: string, to: string): WorkflowAnalyticsRecord
}

export interface WorkflowExecutionMetric {
  readonly executionId: EntityId
  readonly organizationId: EntityId
  readonly status: WorkflowExecutionStatus
  readonly durationMs: number
  readonly nodeCount: number
  readonly agentCalls: number
  readonly toolCalls: number
  readonly tokenUsage: number
  readonly cost: number
  readonly retries: number
  readonly approvalWaits: number
  readonly timestamp: number
}

export interface WorkflowAnalyticsRecord {
  readonly totalExecutions: number
  readonly completedExecutions: number
  readonly failedExecutions: number
  readonly cancelledExecutions: number
  readonly timedOutExecutions: number
  readonly averageDurationMs: number
  readonly averageNodeCount: number
  readonly averageAgentCalls: number
  readonly totalToolCalls: number
  readonly totalTokenUsage: number
  readonly estimatedTotalCost: number
  readonly averageRetries: number
  readonly averageApprovalWaitMs: number
  readonly authorizationViolations: number
}
