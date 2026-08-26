/* WriteBack validation schemas — strict Zod input validation for proposals.

Reject: unknown fields, invalid UUIDs, oversized values, unsupported node types,
invalid classifications. Never execute arbitrary input. */

import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format')

// ─── Relationship Proposal ───────────────────────────────────────────────────

export const relationshipProposalSchema = z.object({
  targetNodeId: uuidSchema,
  relationshipType: z.enum(['SUPPORTS', 'REQUIRES', 'DERIVED_FROM', 'SUPERSEDES', 'CONTRADICTS']),
  weight: z.number().min(0).max(1).optional().default(1),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

// ─── Source Reference ────────────────────────────────────────────────────────

export const sourceReferenceSchema = z.object({
  sourceNodeId: uuidSchema.optional(),
  sourceDocumentId: uuidSchema.optional(),
  sourcePipelineRunId: uuidSchema.optional(),
  sourceAgentExecutionId: uuidSchema.optional(),
  sourceMcpSessionId: uuidSchema.optional(),
  sourceExternalReference: z.string().max(2000).optional(),
  description: z.string().max(500).optional(),
})

// ─── Node Proposal Request ───────────────────────────────────────────────────

export const nodeProposalSchema = z.object({
  nodeType: z.enum(['FACT', 'DECISION']),
  title: z.string().min(1, 'Title is required').max(300, 'Title too long (max 300 chars)'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50_000, 'Content too long (max 50000 chars)'),
  classification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']).default('INTERNAL'),
  workspaceId: uuidSchema,
  departmentId: uuidSchema.nullable().optional().default(null),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  complianceTags: z.array(z.string().max(50)).max(10).optional().default([]),
  sourceReferences: z.array(sourceReferenceSchema).max(20).optional().default([]),
  relationshipRequests: z.array(relationshipProposalSchema).max(50).optional().default([]),
  purpose: z.string().max(1_000, 'Purpose too long').nullable().optional().default(null),
  idempotencyKey: z.string().max(255).nullable().optional().default(null),
})

export type NodeProposalInput = z.infer<typeof nodeProposalSchema>

// ─── Proposal Query Filters ──────────────────────────────────────────────────

export const proposalQuerySchema = z.object({
  workspaceId: uuidSchema.optional(),
  status: z
    .enum([
      'PROPOSED',
      'VALIDATING',
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'PERSISTING',
      'PUBLISHED',
      'FAILED',
      'ARCHIVED',
    ])
    .optional(),
  decision: z.enum(['PUBLISHED', 'PENDING_APPROVAL', 'REJECTED', 'DUPLICATE', 'FAILED']).optional(),
  nodeType: z.enum(['FACT', 'DECISION']).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
})

export type ProposalQueryInput = z.infer<typeof proposalQuerySchema>

// ─── Proposal ID ─────────────────────────────────────────────────────────────

export const proposalIdSchema = z.object({
  id: uuidSchema,
})

export type ProposalIdInput = z.infer<typeof proposalIdSchema>
