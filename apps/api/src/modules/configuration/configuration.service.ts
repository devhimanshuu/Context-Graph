import { Injectable } from '@nestjs/common'
import { ConfigService } from '../../config/config.service'
import {
  type CacheConfigDto,
  type MetricsConfigDto,
  type PermissionConfigDto,
  type PipelineConfigDto,
  type RuleEngineConfigDto,
  type TraversalConfigDto,
} from './configuration.dto'

export abstract class IConfigurationService {
  abstract all(): Record<string, unknown>
  abstract getPipelineConfig(): PipelineConfigDto
  abstract getTraversalConfig(): TraversalConfigDto
  abstract getRuleEngineConfig(): RuleEngineConfigDto
  abstract getPermissionConfig(): PermissionConfigDto
  abstract getCacheConfig(): CacheConfigDto
  abstract getMetricsConfig(): MetricsConfigDto
}

/* Strongly-typed engine configuration. Values flow from validated env through */
@Injectable()
export class ConfigurationService implements IConfigurationService {
  constructor(private readonly config: ConfigService) {}

  all(): Record<string, unknown> {
    return {
      pipeline: this.getPipelineConfig(),
      traversal: this.getTraversalConfig(),
      ruleEngine: this.getRuleEngineConfig(),
      permission: this.getPermissionConfig(),
      cache: this.getCacheConfig(),
      metrics: this.getMetricsConfig(),
    }
  }

  getPipelineConfig(): PipelineConfigDto {
    return { maxDepth: 32, maxCandidates: 100, failOnStageError: false }
  }

  getTraversalConfig(): TraversalConfigDto {
    return { algorithm: 'BFS', direction: 'BACKWARD', defaultMaxDepth: 32, maxEdgeWeight: 1 }
  }

  getRuleEngineConfig(): RuleEngineConfigDto {
    return { maxRulesPerEvaluation: 500, timeoutMs: 1000 }
  }

  getPermissionConfig(): PermissionConfigDto {
    return { cacheTtlMs: 300_000, denyByDefault: true }
  }

  getCacheConfig(): CacheConfigDto {
    return { provider: this.config.redisUrl !== undefined ? 'redis' : 'memory', ttlMs: 300_000 }
  }

  getMetricsConfig(): MetricsConfigDto {
    return { enabled: false, otlpEndpoint: this.config.otlpEndpoint }
  }
}
