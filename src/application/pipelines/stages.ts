import {
  type PipelineStageDefinition,
  type PipelineStageKind,
} from '@/application/contracts/pipeline'

/**
 * The ordered pipeline stage registry.
 *
 * This is the single place the pipeline's stage sequence is declared. Stage
 * *implementations* are registered per feature (Phase 4+); the ordering and
 * vocabulary live here so the orchestrator and the docs stay in sync.
 */

/** Static metadata for every stage, in execution order. */
export const PIPELINE_STAGE_DEFINITIONS: readonly PipelineStageDefinition[] = [
  { kind: 'PERMISSION', order: 0, description: 'Compile the caller permission context' },
  { kind: 'ENTRY_RESOLVER', order: 1, description: 'Resolve the traversal entry nodes' },
  {
    kind: 'GRAPH_TRAVERSAL',
    order: 2,
    description: 'Walk the knowledge graph from the entry nodes',
  },
  { kind: 'ZONE_INJECTION', order: 3, description: 'Inject zone/department context nodes' },
  { kind: 'ISOLATION_FILTER', order: 4, description: 'Enforce organization/workspace isolation' },
  { kind: 'COMPLIANCE_FILTER', order: 5, description: 'Filter nodes by compliance clearance' },
  { kind: 'PERMISSION_FILTER', order: 6, description: 'Apply explicit grants/denials' },
  { kind: 'TEMPORAL_FILTER', order: 7, description: 'Prune nodes outside their validity window' },
  { kind: 'DERIVABILITY_FILTER', order: 8, description: 'Prune derivable or low-value nodes' },
  { kind: 'CANDIDATE_BUILDER', order: 9, description: 'Rank and assemble the candidate set' },
]

/** Every stage kind, in execution order (derived — single source of truth). */
export const PIPELINE_STAGE_KINDS: readonly PipelineStageKind[] = PIPELINE_STAGE_DEFINITIONS.map(
  (definition) => definition.kind,
)

/** The registry keyed by kind for O(1) lookups. */
export const PIPELINE_STAGE_BY_KIND: Readonly<Record<PipelineStageKind, PipelineStageDefinition>> =
  PIPELINE_STAGE_DEFINITIONS.reduce(
    (acc, definition) => {
      acc[definition.kind] = definition
      return acc
    },
    {} as Record<PipelineStageKind, PipelineStageDefinition>,
  )

/** Stages in execution order (sorted defensively by `order`). */
export function orderedPipelineStages(): readonly PipelineStageDefinition[] {
  return [...PIPELINE_STAGE_DEFINITIONS].sort((a, b) => a.order - b.order)
}
