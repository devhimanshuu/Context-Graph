import { type CacheConfig } from './cache.config'
import { type MetricsConfig } from './metrics.config'
import { type PermissionConfig } from './permission.config'
import { type PipelineConfig } from './pipeline.config'
import { type RuleEngineConfig } from './rule-engine.config'
import { type TraversalConfig } from './traversal.config'

/**
 * The application-layer configuration aggregate.
 *
 * One strongly typed root so feature implementations receive the whole
 * configuration surface (via DI) without scattering config types. Runtime
 * values come from validated environment / tenant configuration in Phase 4+.
 */
export interface ApplicationConfig {
  pipeline: PipelineConfig
  traversal: TraversalConfig
  permission: PermissionConfig
  ruleEngine: RuleEngineConfig
  cache: CacheConfig
  metrics: MetricsConfig
}

export type { PipelineConfig } from './pipeline.config'
export type { TraversalConfig } from './traversal.config'
export type { PermissionConfig } from './permission.config'
export type { RuleEngineConfig } from './rule-engine.config'
export type { CacheConfig } from './cache.config'
export type { MetricsConfig } from './metrics.config'
