import { describe, expect, it, vi } from 'vitest'
import { ComplianceTag, NodeStatus, NodeType } from '@contextgraph/types'
import { RuleEngineService } from './rule-engine.service'
import { RulePipelineFactory } from '../pipeline/rule-pipeline.factory'
import {
  GlobalKnowledgeInjector,
  type IGlobalKnowledgeProvider,
} from '../injectors/global-knowledge.injector'
import { DeterministicDerivabilityEvaluator } from '../evaluators/derivability.evaluator'
import { InMemoryRuleCache } from '../cache/in-memory-rule-cache'
import {
  DEFAULT_RULE_ENGINE_CONFIG,
  type RuleEngineConfig,
} from '../configuration/rule-engine.config'
import { RULE_ID } from '../configuration/rule-ids'
import { makeEvaluator, makeNode, READER, WORKSPACE_ID } from '../testing/rule-engine-fixtures'
import { makeContext, ORG_B } from '../../authorization/testing/authorization-fixtures'
import { RuleEngineLimitException } from '../errors/rule-engine-errors'
import { IAuthorizationService } from '../../authorization/services/authorization.service'
import type { IRuleAuditLogger } from '../audit/rule-audit-logger'
import type { IRuleMetrics } from '../metrics/rule-metrics'
import type { RuleEngineRequest } from '../domain/rule-engine-run'
import { RULE_ID as RULES } from '../configuration/rule-ids'

const SURVIVOR = { type: NodeType.CONSTRAINT, derivabilityScore: 30 } as const

function makeService(options: { globalNodes?: unknown[] } = {}) {
  const authorization = {
    getContext: vi.fn(async () => makeContext()),
  } as unknown as IAuthorizationService

  const provider = {
    findGlobalNodes: vi.fn(async () => options.globalNodes ?? []),
  } as unknown as IGlobalKnowledgeProvider

  const factory = new RulePipelineFactory(
    new GlobalKnowledgeInjector(provider),
    makeEvaluator(),
    new DeterministicDerivabilityEvaluator(),
    new InMemoryRuleCache(),
  )

  const metrics = {
    recordRun: vi.fn(),
  } as unknown as IRuleMetrics

  const audit = {
    recordExclusion: vi.fn(async () => undefined),
    recordPipelineRun: vi.fn(async () => undefined),
  } as unknown as IRuleAuditLogger

  const service = new RuleEngineService(authorization, factory, metrics, audit)
  return { service, authorization, audit, metrics }
}

function makeRequest(overrides: Partial<RuleEngineRequest> = {}): RuleEngineRequest {
  return {
    workspaceId: WORKSPACE_ID,
    entryNodeIds: ['keep-0'],
    nodes: [makeNode({ id: 'keep-0', ...SURVIVOR })],
    evaluatedAt: '2026-06-15T12:00:00.000Z',
    ...overrides,
  }
}

describe('RuleEngineService', () => {
  it('runs the pipeline and returns candidates, explanations and metrics', async () => {
    const { service } = makeService()
    const response = await service.execute(READER, makeRequest())

    expect(response.candidates.map((n) => n.id)).toEqual(['keep-0'])
    expect(response.explanations).toHaveLength(1)
    expect(response.explanations[0]).toMatchObject({ included: true })
    expect(response.metrics.finalCount).toBe(1)
    expect(response.executedStages).toEqual([
      'global-injection',
      'isolation',
      'compliance',
      'permission',
      'temporal',
      'derivability',
    ])
  })

  it('compiles the authorization context exactly once per run', async () => {
    const { service, authorization } = makeService()
    await service.execute(
      READER,
      makeRequest({
        nodes: Array.from({ length: 50 }, (_, i) => makeNode({ id: `n-${i}`, ...SURVIVOR })),
      }),
    )
    expect(authorization.getContext).toHaveBeenCalledTimes(1)
  })

  it('rejects a node set above the configured limit', async () => {
    const { service } = makeService()
    const config: Partial<RuleEngineConfig> = { maxNodes: 3 }
    await expect(
      service.execute(
        READER,
        makeRequest({
          config,
          nodes: [
            makeNode({ id: 'a', ...SURVIVOR }),
            makeNode({ id: 'b', ...SURVIVOR }),
            makeNode({ id: 'c', ...SURVIVOR }),
            makeNode({ id: 'd', ...SURVIVOR }),
          ],
        }),
      ),
    ).rejects.toBeInstanceOf(RuleEngineLimitException)
  })

  it('applies per-run configuration overrides (disabling derivability keeps generic nodes)', async () => {
    const { service } = makeService()
    const generic = makeNode({ id: 'generic', type: NodeType.CONSTRAINT, derivabilityScore: 95 })
    const disabledDerivability = {
      rules: DEFAULT_RULE_ENGINE_CONFIG.rules.map((rule) =>
        rule.id === RULE_ID.DERIVABILITY ? { ...rule, enabled: false } : rule,
      ),
    }
    const withRule = await service.execute(READER, makeRequest({ nodes: [generic] }))
    expect(withRule.candidates).toEqual([])

    const withoutRule = await service.execute(
      READER,
      makeRequest({ nodes: [generic], config: disabledDerivability }),
    )
    expect(withoutRule.candidates.map((n) => n.id)).toEqual(['generic'])
  })

  it('is deterministic for a fixed evaluation instant', async () => {
    const { service } = makeService()
    const request = makeRequest({
      nodes: [
        makeNode({ id: 'a', ...SURVIVOR }),
        makeNode({ id: 'b', status: NodeStatus.EXPIRED, ...SURVIVOR }),
        makeNode({ id: 'c', organizationId: ORG_B, ...SURVIVOR }),
      ],
    })
    const first = await service.execute(READER, request)
    const second = await service.execute(READER, request)
    // requestId is a fresh uuid per run and durations are wall-clock — the
    // determinism contract covers candidates, explanations and stage counts.
    const strip = (r: Awaited<ReturnType<RuleEngineService['execute']>>) =>
      JSON.stringify({
        candidates: r.candidates,
        explanations: r.explanations,
        executedStages: r.executedStages,
        countsAfterStage: r.metrics.countsAfterStage,
        removedByReason: r.metrics.removedByReason,
      })
    expect(strip(second)).toBe(strip(first))
  })

  it('audits the run summary and every exclusion with the failing rule', async () => {
    const { service, audit } = makeService()
    const request = makeRequest({
      nodes: [
        makeNode({ id: 'keep', ...SURVIVOR }),
        makeNode({ id: 'foreign', organizationId: ORG_B, ...SURVIVOR }),
        makeNode({ id: 'restricted', complianceTags: [ComplianceTag.RESTRICTED], ...SURVIVOR }),
      ],
    })
    await service.execute(READER, request)

    expect(audit.recordPipelineRun).toHaveBeenCalledTimes(1)
    expect(audit.recordPipelineRun).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-a',
        actorId: READER.id,
        initialCount: 3,
        finalCount: 1,
      }),
    )
    expect(audit.recordExclusion).toHaveBeenCalledTimes(2)
    const calls = vi.mocked(audit.recordExclusion).mock.calls
    expect(calls[0]?.[0]).toMatchObject({
      nodeId: 'foreign',
      ruleId: RULES.ISOLATION,
      reasonCode: 'ORG_MISMATCH',
    })
    expect(calls[1]?.[0]).toMatchObject({
      nodeId: 'restricted',
      ruleId: RULES.COMPLIANCE,
      reasonCode: 'MISSING_CLEARANCE',
    })
  })

  it('records run metrics', async () => {
    const { service, metrics } = makeService()
    await service.execute(READER, makeRequest())
    expect(metrics.recordRun).toHaveBeenCalledTimes(1)
  })

  it('exposes the pipeline definition', () => {
    const { service } = makeService()
    const definition = service.getDefinition()
    expect(definition.version).toBe(1)
    expect(definition.stages).toEqual([
      'isolation',
      'compliance',
      'permission',
      'temporal',
      'derivability',
    ])
  })

  it('includes globally injected nodes supplied by the provider', async () => {
    const global = makeNode({
      id: 'global-policy-1',
      ...SURVIVOR,
      metadata: { keep: true },
    })
    const { service } = makeService({ globalNodes: [global] })
    const response = await service.execute(READER, makeRequest({ entryNodeIds: ['keep-0'] }))
    expect(response.candidates.map((n) => n.id)).toEqual(['keep-0', 'global-policy-1'])
  })
})
