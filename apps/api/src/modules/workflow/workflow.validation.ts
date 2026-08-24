/* Workflow validation schemas — Zod schemas for request validation. */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Workflow Definition
// ---------------------------------------------------------------------------

const workflowNodeSchema = z.object({
  nodeId: z.string().min(1),
  type: z.enum([
    'START',
    'AGENT',
    'CONTEXT_REQUEST',
    'TOOL',
    'CONDITION',
    'PARALLEL',
    'MERGE',
    'HUMAN_APPROVAL',
    'VERIFICATION',
    'END',
  ]),
  name: z.string().min(1).max(200),
  configuration: z.record(z.string(), z.unknown()).default({}),
  dependencies: z.array(z.string()).default([]),
  timeoutMs: z.number().positive().max(600_000).default(30_000),
  retryPolicy: z.object({
    maxAttempts: z.number().int().min(1).max(10).default(3),
    backoffStrategy: z.enum(['FIXED', 'LINEAR', 'EXPONENTIAL']).default('EXPONENTIAL'),
    baseDelayMs: z.number().positive().default(1_000),
    maxDelayMs: z.number().positive().default(30_000),
    retryableErrors: z.array(z.string()).default(['TIMEOUT', 'DEPENDENCY_ERROR']),
    nonRetryableErrors: z.array(z.string()).default(['AUTHORIZATION_DENIED', 'VALIDATION_ERROR']),
  }),
  failurePolicy: z
    .enum(['FAIL_WORKFLOW', 'RETRY_NODE', 'SKIP_NODE', 'CONTINUE_WITH_PARTIAL', 'WAIT_FOR_HUMAN'])
    .default('FAIL_WORKFLOW'),
})

const workflowEdgeSchema = z.object({
  edgeId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  condition: z.string().nullable().default(null),
})

const executionPolicySchema = z.object({
  maxNodes: z.number().int().min(1).max(100).default(50),
  maxParallelNodes: z.number().int().min(1).max(20).default(10),
  maxAgentCalls: z.number().int().min(1).max(50).default(20),
  maxToolCalls: z.number().int().min(1).max(500).default(100),
  maxIterations: z.number().int().min(1).max(100).default(30),
  maxTokens: z.number().int().min(1_000).max(1_000_000).default(100_000),
  maxCost: z.number().min(0.01).max(100).default(10),
  maxDurationMs: z.number().positive().max(3_600_000).default(600_000),
})

export const createWorkflowRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().max(2_000, 'Description too long').default(''),
  nodes: z.array(workflowNodeSchema).min(2, 'Workflow must have at least 2 nodes (START + END)'),
  edges: z.array(workflowEdgeSchema),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  outputSchema: z.record(z.string(), z.unknown()).default({}),
  executionPolicy: executionPolicySchema,
})

export type CreateWorkflowRequestValidated = z.infer<typeof createWorkflowRequestSchema>

// ---------------------------------------------------------------------------
// Execute Workflow
// ---------------------------------------------------------------------------

export const executeWorkflowRequestSchema = z.object({
  input: z.record(z.string(), z.unknown()),
  workspaceId: z.string().uuid('Invalid workspace ID'),
})

export type ExecuteWorkflowRequestValidated = z.infer<typeof executeWorkflowRequestSchema>

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export const workflowParamsSchema = z.object({
  id: z.string().uuid('Invalid workflow ID'),
})

export const executionParamsSchema = z.object({
  id: z.string().uuid('Invalid execution ID'),
})

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
const now = new Date().toISOString()

export const analyticsQuerySchema = z.object({
  from: z.string().datetime().default(thirtyDaysAgo),
  to: z.string().datetime().default(now),
})

// ---------------------------------------------------------------------------
// Approval
// ---------------------------------------------------------------------------

export const approvalDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(1_000).optional(),
})

// ---------------------------------------------------------------------------
// Workflow list query
// ---------------------------------------------------------------------------

export const workflowListQuerySchema = z.object({
  status: z.enum(['DRAFT', 'VALIDATED', 'PUBLISHED', 'ARCHIVED']).optional(),
})
