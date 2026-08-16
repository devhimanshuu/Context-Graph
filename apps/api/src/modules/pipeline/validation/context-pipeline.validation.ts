import { z } from 'zod'

export const contextPipelineRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  entryNodeId: z.string().uuid(),
  maxDepth: z.number().int().min(1).max(64).default(32),
  strategy: z.enum(['bfs', 'weighted']).default('bfs'),
  mode: z.enum(['STANDARD', 'DEBUG', 'AUDIT', 'BENCHMARK']).default('STANDARD'),
  tokenBudget: z.number().int().min(256).max(1_000_000).default(2048),
  maxCandidates: z.number().int().min(1).max(500).optional(),
  /** Soft per-stage deadline in milliseconds (default 10s). */
  stageTimeoutMs: z.number().int().min(1).max(120_000).optional(),
  /** Fixed evaluation instant (UTC) — deterministic replays share it. */
  evaluatedAt: z.string().datetime().optional(),
})

export type ContextPipelineInput = z.infer<typeof contextPipelineRequestSchema>
