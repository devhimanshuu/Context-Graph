import { z } from 'zod'
import { TraversalStrategy } from '../../graph/domain/traversal'

export const contextAssemblySchema = z.object({
  workspaceId: z.string().uuid(),
  entryNodeId: z.string().uuid(),
  maxDepth: z.number().int().min(1).max(64).default(3),
  strategy: z.nativeEnum(TraversalStrategy).default(TraversalStrategy.BFS),
  tokenBudget: z.number().int().min(256).max(128_000).default(4096),
  /** Fixed evaluation instant (UTC) — determinism: rules never read the clock. */
  evaluatedAt: z.string().datetime().optional(),
})

export type ContextAssemblyInput = z.infer<typeof contextAssemblySchema>
