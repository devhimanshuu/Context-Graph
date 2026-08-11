import { Module } from '@nestjs/common'
import { AuthorizationModule } from '../authorization/authorization.module'
import { KnowledgeModule } from '../knowledge/knowledge.module'
import {
  IDerivabilityEvaluator,
  DeterministicDerivabilityEvaluator,
} from './evaluators/derivability.evaluator'
import {
  IGlobalKnowledgeInjector,
  GlobalKnowledgeInjector,
  IGlobalKnowledgeProvider,
  NoopGlobalKnowledgeProvider,
} from './injectors/global-knowledge.injector'
import { IRulePipelineFactory, RulePipelineFactory } from './pipeline/rule-pipeline.factory'
import { RULE_CACHE } from './cache/rule-cache.interface'
import { InMemoryRuleCache } from './cache/in-memory-rule-cache'
import { RULE_METRICS, InMemoryRuleMetrics } from './metrics/rule-metrics'
import { RULE_AUDIT_LOGGER, RuleAuditLogger } from './audit/rule-audit-logger'
import { IRuleEngineService, RuleEngineService } from './services/rule-engine.service'
import { RuleEngineController } from './rule-engine.controller'
import { IRuleRunService, RuleRunService } from './run/rule-run.service'
import { RuleRunController } from './run/rule-run.controller'

/**
 * Rule engine module — the deterministic candidate-set filter.
 *
 * Dependency inversion: every dependency is an interface token bound to an
 * implementation here. The pipeline factory constructs each rule from the
 * configuration, so adding a rule means adding a case in the factory (and its
 * binding) — existing rules never change. Cache, metrics, audit and the
 * derivability strategy are swappable without touching rule code.
 */
@Module({
  imports: [AuthorizationModule, KnowledgeModule],
  controllers: [RuleEngineController, RuleRunController],
  providers: [
    // Swappable infrastructure.
    { provide: IGlobalKnowledgeProvider, useClass: NoopGlobalKnowledgeProvider },
    { provide: IGlobalKnowledgeInjector, useClass: GlobalKnowledgeInjector },
    { provide: IDerivabilityEvaluator, useClass: DeterministicDerivabilityEvaluator },
    { provide: RULE_CACHE, useClass: InMemoryRuleCache },
    { provide: RULE_METRICS, useClass: InMemoryRuleMetrics },
    { provide: RULE_AUDIT_LOGGER, useClass: RuleAuditLogger },
    // Pipeline assembly + facade.
    { provide: IRulePipelineFactory, useClass: RulePipelineFactory },
    { provide: IRuleEngineService, useClass: RuleEngineService },
    // REST run surface (resolves node ids, delegates to the pure engine).
    { provide: IRuleRunService, useClass: RuleRunService },
  ],
  exports: [IRuleEngineService, IRulePipelineFactory, IRuleRunService, RULE_METRICS],
})
export class RuleEngineModule {}

/** Re-export the default config so consumers can inspect the safe baseline. */
export { DEFAULT_RULE_ENGINE_CONFIG } from './configuration/rule-engine.config'
