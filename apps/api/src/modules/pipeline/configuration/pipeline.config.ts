import type { CandidateRankingConfig } from '../../candidate/candidate.config'
import { DEFAULT_CANDIDATE_RANKING_CONFIG } from '../../candidate/candidate.config'
import type { PipelineMode } from '../contracts/context-pipeline.contracts'

/**
 * Context pipeline configuration. Defaults are safe for every organization;
 * overrides may tighten (never loosen) safety bounds per run.
 */
export interface PipelineConfig {
  readonly defaultMode: PipelineMode
  /** Ranked candidate ceiling before the token budget is applied. */
  readonly maxCandidates: number
  /** Token budget for the assembled package. */
  readonly tokenBudget: number
  /** Soft per-stage deadline (ms). Exceeded stages fail the run loudly. */
  readonly stageTimeoutMs: number
  /** Candidate ranking weights/limits. */
  readonly ranking: CandidateRankingConfig
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  defaultMode: 'STANDARD',
  maxCandidates: 30,
  tokenBudget: 2048,
  stageTimeoutMs: 10_000,
  ranking: DEFAULT_CANDIDATE_RANKING_CONFIG,
}

/** Per-run overrides, validated against safe bounds. */
export interface PipelineConfigOverrides {
  readonly mode?: PipelineMode
  readonly maxCandidates?: number
  readonly tokenBudget?: number
  readonly stageTimeoutMs?: number
  readonly ranking?: Partial<CandidateRankingConfig>
}

/** Hard ceilings that a run may never exceed (defense in depth). */
const MAX_CANDIDATES_CEILING = 500
const MAX_TOKEN_BUDGET = 1_000_000
const MAX_STAGE_TIMEOUT_MS = 120_000

/** Merges per-run overrides over the defaults; clamps to the hard ceilings. */
export function mergePipelineConfig(
  base: PipelineConfig,
  overrides: PipelineConfigOverrides,
): PipelineConfig {
  return {
    defaultMode: overrides.mode ?? base.defaultMode,
    maxCandidates: Math.min(overrides.maxCandidates ?? base.maxCandidates, MAX_CANDIDATES_CEILING),
    tokenBudget: Math.min(overrides.tokenBudget ?? base.tokenBudget, MAX_TOKEN_BUDGET),
    stageTimeoutMs: Math.min(overrides.stageTimeoutMs ?? base.stageTimeoutMs, MAX_STAGE_TIMEOUT_MS),
    ranking: {
      ...base.ranking,
      ...overrides.ranking,
      weights: {
        ...base.ranking.weights,
        ...overrides.ranking?.weights,
      },
    },
  }
}
