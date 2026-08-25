/* MCP tool input schemas — strict Zod validation for every tool.

Reject: unknown fields, invalid UUIDs, oversized values, invalid enums,
unreasonable limits. Never execute arbitrary input. */

import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID format')

// ─── resolve_context ─────────────────────────────────────────────────────────

export const resolveContextInputSchema = z.object({
  query: z.string().min(1, 'Query is required').max(5_000, 'Query too long (max 5000 chars)'),
  workspaceId: uuidSchema,
  entryNodeId: uuidSchema.optional(),
  topK: z.number().int().min(1).max(100).optional().default(20),
  maxCandidates: z.number().int().min(1).max(100).optional().default(30),
  retrievalMode: z.enum(['bfs', 'weighted']).optional().default('bfs'),
  tokenBudget: z.number().int().min(256).max(100_000).optional().default(4096),
  executionMode: z.enum(['STANDARD', 'DEBUG', 'AUDIT']).optional().default('STANDARD'),
})

export type ResolveContextInput = z.infer<typeof resolveContextInputSchema>

// ─── get_subgraph ────────────────────────────────────────────────────────────

export const getSubgraphInputSchema = z.object({
  nodeId: uuidSchema,
  workspaceId: uuidSchema,
  maxDepth: z.number().int().min(1).max(10).optional().default(3),
  direction: z.enum(['outgoing', 'incoming', 'both']).optional().default('outgoing'),
  includeMetadata: z.boolean().optional().default(false),
})

export type GetSubgraphInput = z.infer<typeof getSubgraphInputSchema>

// ─── get_run ─────────────────────────────────────────────────────────────────

export const getRunInputSchema = z.object({
  runId: uuidSchema,
})

export type GetRunInput = z.infer<typeof getRunInputSchema>

// ─── replay_run ──────────────────────────────────────────────────────────────

export const replayRunInputSchema = z.object({
  runId: uuidSchema,
  options: z
    .object({
      executionMode: z.enum(['STANDARD', 'DEBUG', 'AUDIT']).optional(),
      tokenBudget: z.number().int().min(256).max(100_000).optional(),
    })
    .optional(),
})

export type ReplayRunInput = z.infer<typeof replayRunInputSchema>
