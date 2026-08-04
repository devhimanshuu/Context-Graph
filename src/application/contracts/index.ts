/**
 * Application contracts — import from `@/application/contracts`.
 *
 * Contracts are the stable, cross-cutting vocabulary of the application layer.
 * They depend only on DTOs and errors — never on implementations.
 */
export type {
  PipelineStageKind,
  PipelineStageDefinition,
  PipelineRequest,
  PipelineResponse,
  PipelineContext,
  PipelineStageResult,
  PipelineMetrics,
  PipelineExecutionSummary,
  PipelineResult,
} from './pipeline'
