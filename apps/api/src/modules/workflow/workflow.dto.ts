/* Workflow API DTOs — request and response shapes. */

import type {
  WorkflowExecutionStatus,
  WorkflowDefinitionStatus,
  NodeExecutionStatus,
  WorkflowNodeType,
} from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Request DTOs
// ---------------------------------------------------------------------------

export interface CreateWorkflowRequestDto {
  readonly name: string
  readonly description: string
  readonly nodes: readonly WorkflowNodeDto[]
  readonly edges: readonly WorkflowEdgeDto[]
  readonly inputSchema?: Record<string, unknown>
  readonly outputSchema?: Record<string, unknown>
  readonly executionPolicy?: Partial<WorkflowExecutionPolicyDto>
}

export interface WorkflowNodeDto {
  readonly nodeId: string
  readonly type: WorkflowNodeType
  readonly name: string
  readonly configuration?: Record<string, unknown>
  readonly dependencies?: readonly string[]
  readonly timeoutMs?: number
  readonly retryPolicy?: Partial<RetryPolicyDto>
  readonly failurePolicy?: string
}

export interface WorkflowEdgeDto {
  readonly edgeId: string
  readonly sourceNodeId: string
  readonly targetNodeId: string
  readonly condition?: string | null
}

export interface WorkflowExecutionPolicyDto {
  readonly maxNodes: number
  readonly maxParallelNodes: number
  readonly maxAgentCalls: number
  readonly maxToolCalls: number
  readonly maxIterations: number
  readonly maxTokens: number
  readonly maxCost: number
  readonly maxDurationMs: number
}

export interface RetryPolicyDto {
  readonly maxAttempts: number
  readonly backoffStrategy: string
  readonly baseDelayMs: number
  readonly maxDelayMs: number
  readonly retryableErrors: readonly string[]
  readonly nonRetryableErrors: readonly string[]
}

export interface ExecuteWorkflowRequestDto {
  readonly input: Record<string, unknown>
  readonly workspaceId: string
}

export interface ApprovalDecisionDto {
  readonly decision: 'APPROVED' | 'REJECTED'
  readonly note?: string
}

// ---------------------------------------------------------------------------
// Response DTOs
// ---------------------------------------------------------------------------

export interface WorkflowDefinitionResponseDto {
  readonly workflowId: string
  readonly name: string
  readonly description: string
  readonly version: number
  readonly status: WorkflowDefinitionStatus
  readonly nodeCount: number
  readonly edgeCount: number
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorkflowDefinitionDetailDto extends WorkflowDefinitionResponseDto {
  readonly nodes: readonly WorkflowNodeDto[]
  readonly edges: readonly WorkflowEdgeDto[]
  readonly inputSchema: Record<string, unknown>
  readonly outputSchema: Record<string, unknown>
  readonly executionPolicy: WorkflowExecutionPolicyDto
}

export interface WorkflowExecutionResponseDto {
  readonly executionId: string
  readonly workflowId: string
  readonly workflowVersion: number
  readonly status: WorkflowExecutionStatus
  readonly input: Record<string, unknown>
  readonly output: Record<string, unknown> | null
  readonly currentNodes: readonly string[]
  readonly completedNodes: readonly string[]
  readonly failedNodes: readonly string[]
  readonly error: string | null
  readonly tokenUsage: number
  readonly estimatedCost: number
  readonly durationMs: number
  readonly createdAt: string
  readonly startedAt: string | null
  readonly completedAt: string | null
}

export interface WorkflowExecutionDetailDto extends WorkflowExecutionResponseDto {
  readonly nodeExecutions: readonly NodeExecutionResponseDto[]
  readonly trace: readonly WorkflowTraceEntryDto[]
  readonly approvals: readonly WorkflowApprovalResponseDto[]
}

export interface NodeExecutionResponseDto {
  readonly nodeExecutionId: string
  readonly nodeId: string
  readonly nodeName: string
  readonly nodeType: WorkflowNodeType
  readonly status: NodeExecutionStatus
  readonly attempt: number
  readonly durationMs: number | null
  readonly error: string | null
  readonly createdAt: string
  readonly completedAt: string | null
}

export interface WorkflowTraceEntryDto {
  readonly timestamp: string
  readonly eventType: string
  readonly nodeId: string | null
  readonly nodeName: string | null
  readonly summary: string
}

export interface WorkflowApprovalResponseDto {
  readonly approvalId: string
  readonly executionId: string
  readonly nodeId: string
  readonly requestedAction: string
  readonly riskLevel: string
  readonly status: string
  readonly approver: string | null
  readonly createdAt: string
  readonly resolvedAt: string | null
}

export interface WorkflowValidationResponseDto {
  readonly valid: boolean
  readonly errors: readonly WorkflowValidationErrorDto[]
  readonly warnings: readonly WorkflowValidationErrorDto[]
  readonly entryNodes: readonly string[]
  readonly terminalNodes: readonly string[]
}

export interface WorkflowValidationErrorDto {
  readonly nodeId: string | null
  readonly edgeId: string | null
  readonly type: string
  readonly message: string
}

export interface WorkflowAnalyticsResponseDto {
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
  readonly periodStart: string
  readonly periodEnd: string
}

export interface WorkflowListResponseDto {
  readonly workflows: readonly WorkflowDefinitionResponseDto[]
  readonly total: number
}

export interface WorkflowExecutionListResponseDto {
  readonly executions: readonly WorkflowExecutionResponseDto[]
  readonly total: number
}

export interface SpecializedAgentListResponseDto {
  readonly agents: readonly SpecializedAgentResponseDto[]
}

export interface SpecializedAgentResponseDto {
  readonly type: string
  readonly name: string
  readonly description: string
  readonly capabilities: readonly string[]
  readonly allowedTools: readonly string[]
}

export interface WorkflowTemplateDto {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly nodes: readonly WorkflowNodeDto[]
  readonly edges: readonly WorkflowEdgeDto[]
}
