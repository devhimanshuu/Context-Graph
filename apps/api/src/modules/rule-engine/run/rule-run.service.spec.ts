import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ComplianceClearance,
  NodeStatus,
  NodeType,
  PermissionLevel,
  Role,
  type AuthenticatedUser,
} from '@contextgraph/types'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'
import { KnowledgeNodeEntity } from '../../knowledge/knowledge.entity'
import { IKnowledgeRepository } from '../../knowledge/knowledge.repository'
import { IRuleEngineService } from '../services/rule-engine.service'
import { InclusionReason } from '../domain/inclusion-reason'
import type { RuleEngineResponse } from '../domain/rule-engine-run'
import { RuleRunService } from './rule-run.service'

const ORG_ID = 'org-a'
const WORKSPACE_ID = 'ws-1'

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

function makeEntity(id: string, title = `Node ${id}`): KnowledgeNodeEntity {
  return new KnowledgeNodeEntity(
    id,
    ORG_ID,
    WORKSPACE_ID,
    'dept-1',
    title,
    'Content',
    NodeType.FACT,
    NodeStatus.ACTIVE,
    60,
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

function makeEngineResponse(): RuleEngineResponse {
  return {
    requestId: 'req-1',
    entryNodeIds: ['node-1'],
    candidates: [
      {
        id: 'node-1',
        organizationId: ORG_ID,
        workspaceId: WORKSPACE_ID,
        departmentId: 'dept-1',
        title: 'Node node-1',
        type: NodeType.FACT,
        status: NodeStatus.ACTIVE,
        importance: 60,
        derivabilityScore: 40,
        complianceTags: ['INTERNAL'],
        validFrom: null,
        validTo: null,
        ownerId: 'user-1',
        inclusionReason: InclusionReason.EXPLICIT_CONTEXT,
        distance: null,
        metadata: {},
      },
    ],
    explanations: [
      {
        nodeId: 'node-1',
        included: true,
        finalReasonCode: null,
        failingRuleId: null,
        ruleResults: [
          {
            ruleId: 'isolation',
            nodeId: 'node-1',
            passed: true,
            reason: 'ok',
            reasonCode: 'PASSED',
            evaluatedAt: '2026-06-15T12:00:00.000Z',
          },
        ],
      },
    ],
    metrics: {
      initialCount: 2,
      injectedCount: 0,
      finalCount: 1,
      totalDurationMs: 1.2,
      countsAfterStage: [
        { stageId: 'global-injection', count: 2 },
        { stageId: 'isolation', count: 2 },
        { stageId: 'derivability', count: 1 },
      ],
      removedByRule: { derivability: 1 },
      removedByReason: { DERIVABLE_CONTENT: 1 },
      ruleDurationsMs: { isolation: 0.1, derivability: 0.2 },
    },
    executedStages: ['global-injection', 'isolation', 'derivability'],
  }
}

describe('RuleRunService', () => {
  let knowledge: { findByWorkspace: ReturnType<typeof vi.fn> }
  let engine: { execute: ReturnType<typeof vi.fn> }
  let service: RuleRunService

  beforeEach(() => {
    knowledge = { findByWorkspace: vi.fn() }
    engine = { execute: vi.fn() }
    service = new RuleRunService(
      knowledge as unknown as IKnowledgeRepository,
      engine as unknown as IRuleEngineService,
    )
  })

  it('resolves ids server-side, maps with EXPLICIT_CONTEXT, and returns the full funnel', async () => {
    knowledge.findByWorkspace.mockResolvedValue([
      makeEntity('node-1'),
      makeEntity('node-2'),
      makeEntity('node-3'),
    ])
    engine.execute.mockResolvedValue(makeEngineResponse())

    const response = await service.run(USER, {
      workspaceId: WORKSPACE_ID,
      nodeIds: ['node-1', 'node-2'],
      entryNodeIds: ['node-1'],
      evaluatedAt: '2026-06-15T12:00:00.000Z',
    })

    // The engine received server-mapped candidates, not client data.
    const request = engine.execute.mock.calls[0]?.[1]
    expect(request.workspaceId).toBe(WORKSPACE_ID)
    expect(request.nodes).toHaveLength(2)
    expect(request.nodes[0]?.inclusionReason).toBe(InclusionReason.EXPLICIT_CONTEXT)
    expect(request.nodes[0]?.distance).toBeNull()
    expect(request.nodes[1]?.title).toBe('Node node-2')

    expect(response.nodes).toHaveLength(2)
    expect(response.nodes[0]).toMatchObject({ id: 'node-1', title: 'Node node-1', type: 'FACT' })
    expect(response.candidates).toHaveLength(1)
    expect(response.candidates[0]?.complianceTags).toEqual(['INTERNAL'])
    expect(response.metrics.countsAfterStage).toEqual([
      { stageId: 'global-injection', count: 2 },
      { stageId: 'isolation', count: 2 },
      { stageId: 'derivability', count: 1 },
    ])
    expect(response.metrics.removedByReason).toEqual({ DERIVABLE_CONTENT: 1 })
    expect(response.explanations[0]?.ruleResults[0]).toMatchObject({
      ruleId: 'isolation',
      passed: true,
    })
    expect(response.entryNodeIds).toEqual(['node-1'])
    expect(response.executedStages).toEqual(['global-injection', 'isolation', 'derivability'])
  })

  it('skips node ids that do not exist in the workspace', async () => {
    knowledge.findByWorkspace.mockResolvedValue([makeEntity('node-1')])
    engine.execute.mockResolvedValue(makeEngineResponse())

    const response = await service.run(USER, {
      workspaceId: WORKSPACE_ID,
      nodeIds: ['node-1', 'missing-1', 'missing-2'],
    })

    expect(engine.execute.mock.calls[0]?.[1].nodes).toHaveLength(1)
    expect(engine.execute.mock.calls[0]?.[1].nodes[0]?.id).toBe('node-1')
    expect(response.nodes).toHaveLength(1)
  })

  it('throws NotFound when none of the requested ids exist', async () => {
    knowledge.findByWorkspace.mockResolvedValue([makeEntity('node-1')])

    await expect(
      service.run(USER, { workspaceId: WORKSPACE_ID, nodeIds: ['missing-1'] }),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(engine.execute).not.toHaveBeenCalled()
  })
})
