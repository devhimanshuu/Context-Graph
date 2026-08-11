import { Inject, Injectable } from '@nestjs/common'
import { IAuthorizationEvaluator } from '../../authorization/evaluator/permission-evaluator'
import type { RuleEngineConfig } from '../configuration/rule-engine.config'
import { compareRuleDefinitions } from '../configuration/rule-engine.config'
import { RULE_ID } from '../configuration/rule-ids'
import type { RuleDefinition } from '../domain/rule-definition'
import { RuleEngineConfigurationException } from '../errors/rule-engine-errors'
import { IDerivabilityEvaluator } from '../evaluators/derivability.evaluator'
import { IGlobalKnowledgeInjector } from '../injectors/global-knowledge.injector'
import { IRule } from '../rules/rule.interface'
import { IsolationRule } from '../rules/isolation.rule'
import { ComplianceRule } from '../rules/compliance.rule'
import { PermissionRule } from '../rules/permission.rule'
import { TemporalRule } from '../rules/temporal.rule'
import { DerivabilityRule } from '../rules/derivability.rule'
import { RULE_CACHE, type IRuleCache } from '../cache/rule-cache.interface'
import { RulePipeline } from './rule-pipeline'

/**
 * Builds the executable pipeline from a configuration. Validation is strict:
 * duplicate rule ids and unknown ids fail fast with a configuration error —
 * a misconfigured pipeline never runs silently. Built pipelines are cached
 * per configuration signature (default: in-memory) and invalidated on config
 * change through the same contract a Redis implementation would use.
 */
export abstract class IRulePipelineFactory {
  abstract getOrCreate(config: RuleEngineConfig): Promise<RulePipeline>
}

@Injectable()
export class RulePipelineFactory implements IRulePipelineFactory {
  constructor(
    @Inject(IGlobalKnowledgeInjector)
    private readonly injector: IGlobalKnowledgeInjector,
    @Inject(IAuthorizationEvaluator)
    private readonly evaluator: IAuthorizationEvaluator,
    @Inject(IDerivabilityEvaluator)
    private readonly derivabilityEvaluator: IDerivabilityEvaluator,
    @Inject(RULE_CACHE) private readonly cache: IRuleCache,
  ) {}

  async getOrCreate(config: RuleEngineConfig): Promise<RulePipeline> {
    const signature = configSignature(config)
    const cached = await this.cache.get<RulePipeline>(`rule-pipeline:${signature}`)
    if (cached !== undefined) return cached

    const pipeline = new RulePipeline(this.injector, this.buildRules(config.rules))
    await this.cache.set(`rule-pipeline:${signature}`, pipeline, 60_000)
    return pipeline
  }

  private buildRules(definitions: readonly RuleDefinition[]): IRule[] {
    validateDefinitions(definitions)

    const rules: IRule[] = []
    for (const definition of definitions) {
      switch (definition.id) {
        case RULE_ID.ISOLATION:
          rules.push(new IsolationRule(definition))
          break
        case RULE_ID.COMPLIANCE:
          rules.push(new ComplianceRule(definition))
          break
        case RULE_ID.PERMISSION:
          rules.push(new PermissionRule(definition, this.evaluator))
          break
        case RULE_ID.TEMPORAL:
          rules.push(new TemporalRule(definition))
          break
        case RULE_ID.DERIVABILITY:
          rules.push(new DerivabilityRule(definition, this.derivabilityEvaluator))
          break
        default:
          throw new RuleEngineConfigurationException(`Unknown rule id: ${definition.id}`)
      }
    }
    // Explicit ordering — priority ascending, then id ascending.
    return rules.sort((a, b) => compareRuleDefinitions(a.definition, b.definition))
  }
}

function validateDefinitions(definitions: readonly RuleDefinition[]): void {
  const seen = new Set<string>()
  for (const definition of definitions) {
    if (seen.has(definition.id)) {
      throw new RuleEngineConfigurationException(`Duplicate rule id: ${definition.id}`)
    }
    seen.add(definition.id)
  }
}

/** Deterministic config fingerprint (rule id, enabled, priority, configuration). */
function configSignature(config: RuleEngineConfig): string {
  return JSON.stringify(
    config.rules.map((rule) => [rule.id, rule.enabled, rule.priority, rule.configuration]),
  )
}
