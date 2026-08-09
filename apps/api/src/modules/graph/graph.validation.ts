import { z } from 'zod'
import { RelationshipType } from '@contextgraph/types'
import { TraversalStrategy } from './domain/traversal'

export const createEdgeSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  relationshipType: z.nativeEnum(RelationshipType),
  weight: z.number().min(0).max(1).default(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const reachabilityQuerySchema = z.object({
  entryNodeId: z.string().uuid(),
  maxDepth: z.number().int().min(1).max(64).default(32),
  relationshipTypes: z.array(z.nativeEnum(RelationshipType)).optional(),
  strategy: z.nativeEnum(TraversalStrategy).default(TraversalStrategy.BFS),
})

export type CreateEdgeInput = z.infer<typeof createEdgeSchema>
export type ReachabilityQueryInput = z.infer<typeof reachabilityQuerySchema>
