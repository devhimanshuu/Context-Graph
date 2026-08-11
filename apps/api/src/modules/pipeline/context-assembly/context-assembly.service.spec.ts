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
import type { NodeRuleExplanation } from '../../rule-engine/domain/rule-engine-run'
import type { RuleExecutionMetrics } from '../../rule-engine/domain/rule-execution-metrics'
import { KnowledgeNodeEntity } from '../../knowledge/knowledge.entity'
import { IGraphService } from '../../graph/graph.service'
import { IKnowledgeRepository } from '../../knowledge/knowledge.repository'
import { IRuleEngineService } from '../../rule-engine/services/rule-engine.service'
import type { ReachabilityResponseDto } from '../../graph/graph.dto'
import { ContextAssemblyService } from './context-assembly.service'

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

const EXPLANATIONS: NodeRuleExplanation[] = [
  {
    nodeId: ENTRY_ID,
    included: true,
    finalReasonCode: null,
    failingRuleId: null,
    ruleResults: [
      {
        ruleId: 'isolation',
        nodeId: ENTRY_ID,
        passed: true,
        reason: 'ok',
        reasonCode: 'PASSED',
        evaluatedAt: '2026-06-15T12:00:00.000Z',
      },
    ],
  },
  {
    nodeId: 'node-cut',
    included: false,
    finalReasonCode: 'EXPIRED_NODE',
    failingRuleId: 'temporal',
    ruleResults: [
      {
        ruleId: 'isolation',
        nodeId: 'node-cut',
        passed: true,
        reason: 'ok',
        reasonCode: 'PASSED',
        evaluatedAt: '2026-06-15T12:00:00.000Z',
      },
      {
        ruleId: 'temporal',
        nodeId: 'node-cut',
        passed: false,
        reason: 'Node is outside its validity window',
        reasonCode: 'EXPIRED_NODE',
        evaluatedAt: '2026-06-15T12:00:00.000Z',
      },
    ],
  },
]

function makeMetrics(finalCount: number): RuleExecutionMetrics {
  return {
    initialCount: 4,
    injectedCount: 0,
    finalCount,
    totalDurationMs: 1.5,
    countsAfterStage: [],
    removedByRule: {},
    removedByReason: {},
    ruleDurationsMs: {},
  }
}

function makeReachability(nodeIds: string[]): ReachabilityResponseDto {
  const distances: Record<string, number> = { [ENTRY_ID]: 0 }
  const order: Record<string, number> = {}
  nodeIds.forEach((id, index) => {
    if (id !== ENTRY_ID) distances[id] = 1
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

describe('ContextAssemblyService', () => {
  let graph: { reachableNodes: ReturnType<typeof vi.fn> }
  let knowledge: { findByWorkspace: ReturnType<typeof vi.fn> }
  let rules: { execute: ReturnType<typeof vi.fn> }
  let service: ContextAssemblyService

  beforeEach(() => {
    graph = { reachableNodes: vi.fn() }
    knowledge = { findByWorkspace: vi.fn() }
    rules = { execute: vi.fn() }
    service = new ContextAssemblyService(
      graph as unknown as IGraphService,
      knowledge as unknown as IKnowledgeRepository,
      rules as unknown as IRuleEngineService,
    )
  })

  it('composes traversal → mapped nodes → rule engine → package', async () => {
    const nodeIds = [ENTRY_ID, 'node-a', 'node-b', 'node-cut']
    graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))

    const passing = [makeCandidate(ENTRY_ID, 50, 0), makeCandidate('node-a', 80, 1)]
    rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: passing,
      explanations: EXPLANATIONS,
      metrics: makeMetrics(2),
      executedStages: [
        'global-injection',
        'isolation',
        'compliance',
        'permission',
        'temporal',
        'derivability',
      ],
    })

    const response = await service.assemble(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs',
      tokenBudget: 4096,
    })

    // The rule engine received the full authorized set, mapped from entities.
    const request = rules.execute.mock.calls[0]?.[1]
    expect(request.workspaceId).toBe(WORKSPACE_ID)
    expect(request.entryNodeIds).toEqual([ENTRY_ID])
    expect(request.nodes).toHaveLength(4)
    expect(request.nodes.map((node: RuleCandidateNode) => node.title)).toEqual([
      'Node node-entry',
      'Node node-a',
      'Node node-b',
      'Node node-cut',
    ])

    expect(response.funnel).toEqual({ reachable: 4, candidates: 2, included: 2 })
    expect(response.tokensUsed).toBeGreaterThan(0)
    expect(response.truncated).toBe(false)
    expect(response.candidates.map((candidate) => candidate.id)).toEqual([ENTRY_ID, 'node-a'])
    expect(response.candidates[0]?.content).toContain('Content of node-entry')
    expect(response.nodes).toHaveLength(4)
    expect(response.explanations).toHaveLength(2)
  })

  it('reflects rule-excluded nodes in the explanation panel and excludes their content', async () => {
    const nodeIds = [ENTRY_ID, 'node-a', 'node-cut']
    graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: [makeCandidate(ENTRY_ID, 50, 0)],
      explanations: EXPLANATIONS,
      metrics: makeMetrics(1),
      executedStages: ['isolation', 'temporal'],
    })

    const response = await service.assemble(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs',
      tokenBudget: 4096,
    })

    const cut = response.nodes.find((node) => node.id === 'node-cut')
    expect(cut?.included).toBe(false)
    expect(cut?.excludedByBudget).toBe(false)
    expect(response.candidates.map((candidate) => candidate.id)).toEqual([ENTRY_ID])
    const explanation = response.explanations.find((entry) => entry.nodeId === 'node-cut')
    expect(explanation?.finalReasonCode).toBe('EXPIRED_NODE')
    expect(explanation?.failingRuleId).toBe('temporal')
    expect(explanation?.ruleResults).toHaveLength(2)
    expect(explanation?.ruleResults[1]).toMatchObject({
      ruleId: 'temporal',
      passed: false,
      reasonCode: 'EXPIRED_NODE',
      reason: 'Node is outside its validity window',
    })
  })

  it('truncates rule-passing nodes when the budget is too small and keeps the entry node', async () => {
    const nodeIds = [ENTRY_ID, 'node-a']
    graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    const passing = [makeCandidate(ENTRY_ID, 50, 0), makeCandidate('node-a', 80, 1)]
    rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: passing,
      explanations: EXPLANATIONS.slice(0, 1),
      metrics: makeMetrics(2),
      executedStages: ['isolation'],
    })

    const response = await service.assemble(USER, {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs',
      tokenBudget: 32,
    })

    expect(response.truncated).toBe(true)
    expect(response.candidates).toHaveLength(1)
    expect(response.candidates[0]?.id).toBe(ENTRY_ID)
    const cut = response.nodes.find((node) => node.id === 'node-a')
    expect(cut?.included).toBe(false)
    expect(cut?.excludedByBudget).toBe(true)
  })

  it('produces identical packages for identical inputs (determinism)', async () => {
    const nodeIds = [ENTRY_ID, 'node-a']
    graph.reachableNodes.mockResolvedValue(makeReachability(nodeIds))
    knowledge.findByWorkspace.mockResolvedValue(nodeIds.map((id) => makeEntity(id)))
    rules.execute.mockResolvedValue({
      requestId: 'req-1',
      entryNodeIds: [ENTRY_ID],
      candidates: [makeCandidate(ENTRY_ID, 50, 0)],
      explanations: EXPLANATIONS.slice(0, 1),
      metrics: makeMetrics(1),
      executedStages: ['isolation'],
    })

    const input = {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      maxDepth: 3,
      strategy: 'bfs' as const,
      tokenBudget: 4096,
      evaluatedAt: '2026-06-15T12:00:00.000Z',
    }
    const first = await service.assemble(USER, input)
    const second = await service.assemble(USER, input)
    // Every package gets a fresh id, but the assembled content is identical.
    expect(first.packageId).not.toBe(second.packageId)
    expect({ ...first, packageId: 'x' }).toEqual({ ...second, packageId: 'x' })
  })
})
