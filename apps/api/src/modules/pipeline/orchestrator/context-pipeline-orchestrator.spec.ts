import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ComplianceClearance,
  NodeStatus,
  NodeType,
  PermissionLevel,
  Role,
  type AuthenticatedUser,
} from '@contextgraph/types'
import { InclusionReason } from '../../rule-engine/domain/inclusion-reason'
import type { RuleCandidateNode } from '../../rule-engine/domain/candidate-node'
import type { RuleEngineResponse } from '../../rule-engine/domain/rule-engine-run'
import type { RuleExecutionMetrics } from '../../rule-engine/domain/rule-execution-metrics'
import type { NodeRuleExplanation } from '../../rule-engine/domain/rule-engine-run'
import { KnowledgeNodeEntity } from '../../knowledge/knowledge.entity'
import { IAuthorizationService } from '../../authorization/services/authorization.service'
import { IGraphService } from '../../graph/graph.service'
import { IKnowledgeRepository } from '../../knowledge/knowledge.repository'
import { IRuleEngineService } from '../../rule-engine/services/rule-engine.service'
import type { ReachabilityResponseDto } from '../../graph/graph.dto'
import { TokenContextBudget } from '../budget/context-budget'
import { CandidateBuilder } from '../../candidate/services/candidate-builder.service'
import { DeterministicCandidateRanker } from '../../candidate/services/candidate-ranker.service'
import type { IPipelineMetrics } from '../observability/pipeline-metrics'
import type { IPipelineAuditLogger } from '../observability/pipeline-audit'
import { DEFAULT_PIPELINE_STAGES } from '../contracts/context-pipeline.contracts'
import {
  PipelineEntryResolutionException,
  PipelineTimeoutException,
} from '../errors/pipeline-errors'
import { ContextPipelineOrchestrator } from './context-pipeline-orchestrator'

const ORG_ID = 'org-a'
const WORKSPACE_ID = 'ws-1'
const ENTRY_ID = 'node-entry'

const USER: AuthenticatedUser = {
  id: 'user-1',
  organizationId: ORG_ID,
  departmentId: 'dept-1',
  email: 'reader@acme.test',
  name: 'Reader',
  role: Role.EDITOR,
  permissionLevel: PermissionLevel.WRITE,
  complianceClearance: ComplianceClearance.SENSITIVE,
}

const EVALUATED_AT = '2026-06-15T12:00:00.000Z'

function makeEntity(
  id: string,
  overrides: Partial<Pick<KnowledgeNodeEntity, 'title' | 'importance' | 'content'>> = {},
): KnowledgeNodeEntity {
  return new KnowledgeNodeEntity(
    id,
    ORG_ID,
    WORKSPACE_ID,
    'dept-1',
    overrides.title ?? `Node ${id}`,
    overrides.content ?? `Content of ${id}`.repeat(10),
    NodeType.FACT,
    NodeStatus.ACTIVE,
    overrides.importance ?? 50,
    40,
    1,
    null,
    null,
    ['INTERNAL'],
    {},
    'user-1',
    'user-1',
    '2026-06-01T00:00:00.000Z',
    '2026-06-01T00:00:00.000Z',
    null,
  )
}

function makeCandidate(nodeId: string, importance: number, distance: number): RuleCandidateNode {
  return {
    id: nodeId,
    organizationId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    departmentId: 'dept-1',
    title: `Node ${nodeId}`,
    type: NodeType.FACT,
    status: NodeStatus.ACTIVE,
    importance,
    derivabilityScore: 40,
    complianceTags: ['INTERNAL'],
    validFrom: null,
    validTo: null,
    ownerId: 'user-1',
    inclusionReason: InclusionReason.LOCAL_REACHABILITY,
    distance,
    metadata: {},
  }
}

function makeMetrics(finalCount: number): RuleExecutionMetrics {
  return {
    initialCount: 4,
    injectedCount: 0,
    finalCount,
    totalDurationMs: 0.5,
    countsAfterStage: [],
    removedByRule: {},
    removedByReason: {},
    ruleDurationsMs: {},
  }
}

function makeReachability(nodeIds: string[]): ReachabilityResponseDto {
  const distances: Record<string, number> = {}
  const order: Record<string, number> = {}
  nodeIds.forEach((id, index) => {
    distances[id] = id === ENTRY_ID ? 0 : 1
    order[id] = index
  })
  return {
    entryNodeId: ENTRY_ID,
    nodeIds,
    distances,
    order,
    filteredNodeCount: 0,
  }
}

const LOGGER = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function makeFakes() {
  const authorization = { getContext: vi.fn() }
  const graph = { reachableNodes: vi.fn() }
  const knowledge = { findByWorkspace: vi.fn() }
  const rules = { execute: vi.fn() }
  const auditRecords: unknown[] = []
  const audit = { recordRun: vi.fn(async (entry: unknown) => auditRecords.push(entry)) }
  const runRecords: unknown[] = []
  const runs = { record: vi.fn(async (input: unknown) => runRecords.push(input)) }
  const metrics = {
    recordRun: vi.fn(),
    snapshot: vi.fn(() => ({})),
  }
  return { authorization, graph, knowledge, rules, audit, runs, metrics, auditRecords, runRecords }
}

describe('ContextPipelineOrchestrator', () => {
  let fakes: ReturnType<typeof makeFakes>
  let service: ContextPipelineOrchestrator

  beforeEach(() => {
    fakes = makeFakes()
    service = new ContextPipelineOrchestrator(
      fakes.authorization as unknown as IAuthorizationService,
      fakes.graph as unknown as IGraphService,
      fakes.knowledge as unknown as IKnowledgeRepository,
      fakes.rules as unknown as IRuleEngineService,
      // Real pure internals: builder, ranker and budget run for real.
      new CandidateBuilder(LOGGER),
      new DeterministicCandidateRanker(LOGGER),
      new TokenContextBudget(),
      fakes.runs as unknown as IPipelineRunService,
      fakes.metrics as unknown as IPipelineMetrics,
      fakes.audit as unknown as IPipelineAuditLogger,
      LOGGER,
    )
  })

  it('orchestrates the full flow and returns a ranked, explainable package', async () => {
    const nodeIds = [ENTRY_ID, 'node-a', 'node-b', 'node-cut']
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    fakes.knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    const passing = [
      makeCandidate(ENTRY_ID, 50, 0),
      makeCandidate('node-a', 80, 1),
      makeCandidate('node-b', 30, 1),
    ]
    const explanations: NodeRuleExplanation[] = nodeIds.map((id) => ({
      nodeId: id,
      included: id !== 'node-cut',
      finalReasonCode: id === 'node-cut' ? 'EXPIRED_NODE' : null,
      failingRuleId: id === 'node-cut' ? 'temporal' : null,
      ruleResults: [
        {
          ruleId: 'temporal',
          nodeId: id,
          passed: id !== 'node-cut',
          reason: id === 'node-cut' ? 'Node expired' : 'ok',
          reasonCode: id === 'node-cut' ? 'EXPIRED_NODE' : 'PASS',
          evaluatedAt: EVALUATED_AT,
        },
      ],
    }))
    const ruleResponse: RuleEngineResponse = {
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: passing,
      explanations,
      metrics: makeMetrics(3),
      executedStages: ['global-injection', 'isolation', 'compliance', 'permission', 'temporal'],
    }
    fakes.rules.execute.mockResolvedValue(ruleResponse)

    const input = {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 4096,
      evaluatedAt: EVALUATED_AT,
    }
    const pkg = await service.resolve(USER, input)

    // Package shape.
    expect(pkg.version).toBe('contextgraph-v1')
    expect(pkg.mode).toBe('STANDARD')
    expect(pkg.entryNodeId).toBe(ENTRY_ID)
    expect(pkg.candidates.map((candidate) => candidate.candidateId)).toEqual([
      'node-entry',
      'node-a',
      'node-b',
    ])
    // Ranks and scores present, entry ranked first.
    expect(pkg.candidates[0]?.rank).toBe(1)
    expect(pkg.candidates.map((candidate) => candidate.rank)).toEqual([1, 2, 3])
    expect(pkg.candidates.every((candidate) => candidate.score > 0)).toBe(true)
    // Entry anchors the package with the FULL hint.
    expect(pkg.candidates[0]?.compressionHint).toBe('FULL')
    expect(pkg.candidates.every((candidate) => candidate.tokens > 0)).toBe(true)

    // Funnel + metrics.
    expect(pkg.summary.funnel).toEqual({
      reachable: 4,
      authorized: 4,
      ruleCandidates: 3,
      included: 3,
    })
    expect(pkg.summary.metrics.reachableNodes).toBe(4)
    expect(pkg.summary.metrics.authorizedNodes).toBe(4)
    expect(pkg.summary.metrics.ruleCandidates).toBe(3)
    expect(pkg.summary.metrics.includedCandidates).toBe(3)
    expect(pkg.summary.metrics.excludedByRules).toBe(1)
    expect(pkg.truncated).toBe(false)

    // Stage trace in canonical order.
    expect(pkg.summary.trace.map((entry) => entry.stageId)).toEqual([...DEFAULT_PIPELINE_STAGES])
    expect(pkg.summary.trace.every((entry) => entry.status === 'completed')).toBe(true)
    // STANDARD mode: no per-stage results, no per-rule traces.
    expect(pkg.summary.stageResults).toBeUndefined()
    const ruleCut = pkg.exclusions.find((exclusion) => exclusion.nodeId === 'node-cut')
    expect(ruleCut).toBeDefined()
    expect(ruleCut?.finalReasonCode).toBe('EXPIRED_NODE')
    expect(ruleCut?.failingRuleId).toBe('temporal')
    expect(ruleCut?.ruleResults).toBeUndefined()

    // Audit + metrics recorded.
    expect(fakes.audit.recordRun).toHaveBeenCalled()
    expect(fakes.metrics.recordRun).toHaveBeenCalledWith('STANDARD', expect.anything(), false)

    // The immutable run record was persisted with the full trace + package.
    expect(fakes.runs.record).toHaveBeenCalledTimes(1)
    const record = fakes.runRecords[0] as {
      status: string
      requestId: string
      packageId: string
      metrics: { includedCandidates: number }
      candidates: unknown[]
      trace: unknown[]
      error: null
      tokensUsed: number
    }
    expect(record.status).toBe('completed')
    expect(record.requestId).toBe(pkg.requestId)
    expect(record.packageId).toBe(pkg.packageId)
    expect(record.metrics.includedCandidates).toBe(3)
    expect(record.candidates).toHaveLength(3)
    expect(record.trace).toHaveLength(DEFAULT_PIPELINE_STAGES.length)
    expect(record.error).toBeNull()
    expect(record.tokensUsed).toBe(pkg.tokensUsed)
  })

  it('is deterministic: identical inputs produce identical content with fresh ids', async () => {
    const nodeIds = [ENTRY_ID, 'node-a']
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    fakes.knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    fakes.rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: [makeCandidate(ENTRY_ID, 50, 0), makeCandidate('node-a', 80, 1)],
      explanations: nodeIds.map((id) => ({
        nodeId: id,
        included: true,
        finalReasonCode: null,
        failingRuleId: null,
        ruleResults: [],
      })),
      metrics: makeMetrics(2),
      executedStages: [],
    })

    const input = {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 4096,
      evaluatedAt: EVALUATED_AT,
    }
    const first = await service.resolve(USER, input)
    const second = await service.resolve(USER, input)

    expect(first.packageId).not.toBe(second.packageId)
    expect(first.requestId).not.toBe(second.requestId)
    // Content is byte-identical; only fresh ids and wall-clock timings differ.
    expect(first.candidates).toEqual(second.candidates)
    expect(first.exclusions).toEqual(second.exclusions)
    expect(first.summary.funnel).toEqual(second.summary.funnel)
    expect(first.summary.version).toBe(second.summary.version)
    expect(first.summary.mode).toBe(second.summary.mode)
    // Trace structure identical (stage ids, statuses, counts); timings are excluded.
    expect(
      first.summary.trace.map(({ stageId, status, outputCount }) => ({
        stageId,
        status,
        outputCount,
      })),
    ).toEqual(
      second.summary.trace.map(({ stageId, status, outputCount }) => ({
        stageId,
        status,
        outputCount,
      })),
    )
    expect(first.tokensUsed).toBe(second.tokensUsed)
  })

  it('never lets a rule-removed node reach the package (fail closed)', async () => {
    const nodeIds = [ENTRY_ID, 'node-a', 'node-secret']
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    fakes.knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    // The rule engine removes node-secret (e.g. unauthorized).
    fakes.rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: [makeCandidate(ENTRY_ID, 50, 0), makeCandidate('node-a', 80, 1)],
      explanations: nodeIds.map((id) => ({
        nodeId: id,
        included: id !== 'node-secret',
        finalReasonCode: id === 'node-secret' ? 'INSUFFICIENT_PERMISSION' : null,
        failingRuleId: id === 'node-secret' ? 'permission' : null,
        ruleResults: [],
      })),
      metrics: makeMetrics(2),
      executedStages: [],
    })

    const pkg = await service.resolve(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 4096,
      evaluatedAt: EVALUATED_AT,
    })

    const ids = pkg.candidates.map((candidate) => candidate.candidateId)
    expect(ids).not.toContain('node-secret')
    const exclusion = pkg.exclusions.find((entry) => entry.nodeId === 'node-secret')
    expect(exclusion?.finalReasonCode).toBe('INSUFFICIENT_PERMISSION')
  })

  it('respects the maxCandidates ceiling and explains rank-cut nodes', async () => {
    const nodeIds = [ENTRY_ID, 'a', 'b', 'c', 'd', 'e']
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    fakes.knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    fakes.rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: nodeIds.map((id, index) => makeCandidate(id, 90 - index, index === 0 ? 0 : 1)),
      explanations: nodeIds.map((id) => ({
        nodeId: id,
        included: true,
        finalReasonCode: null,
        failingRuleId: null,
        ruleResults: [],
      })),
      metrics: makeMetrics(6),
      executedStages: [],
    })

    const pkg = await service.resolve(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 4096,
      maxCandidates: 2,
      evaluatedAt: EVALUATED_AT,
    })

    expect(pkg.candidates).toHaveLength(2)
    expect(pkg.summary.metrics.rankedCandidates).toBe(2)
    expect(pkg.summary.metrics.excludedByRank).toBe(4)
    expect(pkg.truncated).toBe(true)
    // The four cut nodes are explained.
    const rankCut = pkg.exclusions.filter((exclusion) => exclusion.excludedByRank)
    expect(rankCut).toHaveLength(4)
    expect(rankCut.every((exclusion) => exclusion.excludedByBudget === false)).toBe(true)
  })

  it('truncates by token budget while always keeping the entry node', async () => {
    const nodeIds = [ENTRY_ID, 'node-a', 'node-b']
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    fakes.knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    fakes.rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: nodeIds.map((id, index) => makeCandidate(id, 80 - index, index === 0 ? 0 : 1)),
      explanations: nodeIds.map((id) => ({
        nodeId: id,
        included: true,
        finalReasonCode: null,
        failingRuleId: null,
        ruleResults: [],
      })),
      metrics: makeMetrics(3),
      executedStages: [],
    })

    const pkg = await service.resolve(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 40, // ~23 tokens per node: only the entry fits comfortably
      evaluatedAt: EVALUATED_AT,
    })

    expect(pkg.candidates.map((candidate) => candidate.candidateId)).toContain(ENTRY_ID)
    expect(pkg.candidates.length).toBeLessThan(3)
    expect(pkg.truncated).toBe(true)
    const budgetCut = pkg.exclusions.filter((exclusion) => exclusion.excludedByBudget)
    expect(budgetCut.length).toBeGreaterThan(0)
    expect(pkg.summary.metrics.excludedByBudget).toBe(budgetCut.length)
  })

  it('DEBUG mode returns stage results and per-rule traces; STANDARD does not', async () => {
    const nodeIds = [ENTRY_ID, 'node-cut']
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    fakes.knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    fakes.rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: [makeCandidate(ENTRY_ID, 50, 0)],
      explanations: nodeIds.map((id) => ({
        nodeId: id,
        included: id !== 'node-cut',
        finalReasonCode: id === 'node-cut' ? 'DERIVABLE_CONTENT' : null,
        failingRuleId: id === 'node-cut' ? 'derivability' : null,
        ruleResults: [
          {
            ruleId: 'derivability',
            nodeId: id,
            passed: id !== 'node-cut',
            reason: 'x',
            reasonCode: 'DERIVABLE_CONTENT',
            evaluatedAt: EVALUATED_AT,
          },
        ],
      })),
      metrics: makeMetrics(1),
      executedStages: ['derivability'],
    })

    const debug = await service.resolve(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 4096,
      mode: 'DEBUG',
      evaluatedAt: EVALUATED_AT,
    })
    expect(debug.summary.stageResults).toBeDefined()
    expect(debug.summary.stageResults).toHaveLength(DEFAULT_PIPELINE_STAGES.length)
    const debugCut = debug.exclusions.find((exclusion) => exclusion.nodeId === 'node-cut')
    expect(debugCut?.ruleResults).toHaveLength(1)
    expect(debugCut?.ruleResults?.[0]).toMatchObject({ ruleId: 'derivability', passed: false })

    const standard = await service.resolve(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 4096,
      mode: 'STANDARD',
      evaluatedAt: EVALUATED_AT,
    })
    expect(standard.summary.stageResults).toBeUndefined()
    const standardCut = standard.exclusions.find((exclusion) => exclusion.nodeId === 'node-cut')
    expect(standardCut?.ruleResults).toBeUndefined()
  })

  it('fails loudly when the entry node is unknown (404 semantics)', async () => {
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.knowledge.findByWorkspace.mockResolvedValue([makeEntity('node-a')])

    await expect(
      service.resolve(USER, {
        workspaceId: WORKSPACE_ID,
        entryNodeId: ENTRY_ID,
        maxDepth: 3,
        strategy: 'bfs' as const,
        tokenBudget: 4096,
        evaluatedAt: EVALUATED_AT,
      }),
    ).rejects.toBeInstanceOf(PipelineEntryResolutionException)
    expect(fakes.graph.reachableNodes).not.toHaveBeenCalled()
  })

  it('propagates engine failures and records the failed run (no partial package)', async () => {
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability([ENTRY_ID]))
    fakes.knowledge.findByWorkspace.mockResolvedValue([makeEntity(ENTRY_ID)])
    fakes.rules.execute.mockRejectedValue(new Error('rule engine exploded'))

    await expect(
      service.resolve(USER, {
        workspaceId: WORKSPACE_ID,
        entryNodeId: ENTRY_ID,
        maxDepth: 3,
        strategy: 'bfs' as const,
        tokenBudget: 4096,
        evaluatedAt: EVALUATED_AT,
      }),
    ).rejects.toThrow('rule engine exploded')

    const lastAudit = fakes.auditRecords[fakes.auditRecords.length - 1] as {
      failed: boolean
      stageId: string | null
    }
    expect(lastAudit.failed).toBe(true)
    expect(lastAudit.stageId).toBe('rule-engine')
    expect(fakes.metrics.recordRun).toHaveBeenCalledWith('STANDARD', expect.anything(), true)

    // The failed run is still persisted — immutable, with no partial package.
    const failedRecord = fakes.runRecords[fakes.runRecords.length - 1] as {
      status: string
      failedStageId: string | null
      packageId: null
      metrics: null
      candidates: null
      exclusions: null
      error: { code: string; message: string }
      trace: unknown[]
      tokensUsed: number
    }
    expect(failedRecord.status).toBe('failed')
    expect(failedRecord.failedStageId).toBe('rule-engine')
    expect(failedRecord.packageId).toBeNull()
    expect(failedRecord.metrics).toBeNull()
    expect(failedRecord.candidates).toBeNull()
    expect(failedRecord.exclusions).toBeNull()
    expect(failedRecord.error.code).toBe('ERR_PIPELINE')
    expect(failedRecord.error.message).toContain('rule engine exploded')
    expect(failedRecord.trace.length).toBeGreaterThan(0)
    expect(failedRecord.tokensUsed).toBe(0)
  })

  it('enforces the stage soft deadline with PipelineTimeoutException', async () => {
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability([ENTRY_ID]))
    fakes.knowledge.findByWorkspace.mockResolvedValue([makeEntity(ENTRY_ID)])
    fakes.rules.execute.mockImplementation(
      async () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({}), 5)
        }),
    )

    await expect(
      service.resolve(USER, {
        workspaceId: WORKSPACE_ID,
        entryNodeId: ENTRY_ID,
        maxDepth: 3,
        strategy: 'bfs' as const,
        tokenBudget: 4096,
        evaluatedAt: EVALUATED_AT,
        stageTimeoutMs: 1,
      }),
    ).rejects.toBeInstanceOf(PipelineTimeoutException)
  })

  it('satisfies invariants: no duplicate candidates, every exclusion explained, candidates from the input universe', async () => {
    const nodeIds = [ENTRY_ID, 'node-a', 'node-b', 'node-cut', 'node-late']
    fakes.authorization.getContext.mockResolvedValue({ organizationId: ORG_ID })
    fakes.graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    fakes.knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    fakes.rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: [
        makeCandidate(ENTRY_ID, 50, 0),
        makeCandidate('node-a', 80, 1),
        makeCandidate('node-b', 30, 1),
      ],
      explanations: nodeIds.map((id) => ({
        nodeId: id,
        included: id !== 'node-cut',
        finalReasonCode: id === 'node-cut' ? 'EXPIRED_NODE' : null,
        failingRuleId: id === 'node-cut' ? 'temporal' : null,
        ruleResults: [],
      })),
      metrics: makeMetrics(3),
      executedStages: [],
    })

    const pkg = await service.resolve(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 60, // forces a budget cut among the passers
      maxCandidates: 2,
      evaluatedAt: EVALUATED_AT,
    })

    const candidateIds = pkg.candidates.map((candidate) => candidate.candidateId)
    // 1. No duplicate candidates.
    expect(new Set(candidateIds).size).toBe(candidateIds.length)
    // 2. Candidates are a subset of the rule-passing universe.
    const rulePassing = new Set(['node-entry', 'node-a', 'node-b'])
    expect(candidateIds.every((id) => rulePassing.has(id))).toBe(true)
    // 3. Candidate count respects the configured limit.
    expect(candidateIds.length).toBeLessThanOrEqual(2)
    // 4. Every exclusion is explained: rule reason, budget cut, or rank cut.
    for (const exclusion of pkg.exclusions) {
      const explained =
        exclusion.finalReasonCode !== null ||
        exclusion.excludedByBudget ||
        exclusion.excludedByRank === true
      expect(explained).toBe(true)
    }
  })
})
