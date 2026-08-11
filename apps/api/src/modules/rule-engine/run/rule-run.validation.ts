import { z } from 'zod'

export const ruleRunSchema = z.object({
  workspaceId: z.string().uuid(),
  /** Node ids to evaluate — resolved server-side (never client-authoritative). */
  nodeIds: z.array(z.string().uuid()).min(1).max(500),
  /** Optional context: ids of nodes the run conceptually starts from. */
  entryNodeIds: z.array(z.string().uuid()).max(16).default([]),
  /** Fixed evaluation instant (UTC) — determinism: rules never read the clock. */
  evaluatedAt: z.string().datetime().optional(),
})

export type RuleRunInput = z.infer<typeof ruleRunSchema>
