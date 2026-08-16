import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeStatus, NodeType } from '@contextgraph/types'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'
import { PipelineRunEntity } from './pipeline-run.entity'
import { type IPipelineRunRepository } from './pipeline-run.repository'
import { type IPipelineRunService, PipelineRunService } from './pipeline-run.service'
import type { RecordPipelineRunInput } from './pipeline-run.service'

const ORG_ID = 'org-1'
const WORKSPACE_ID = 'ws-1'

function makeEntity(overrides: Partial<PipelineRunEntity> = {}): PipelineRunEntity {
  const entity = new PipelineRunEntity(
    'run-1',
    ORG_ID,
    WORKSPACE_ID,
    'user-1',
    'req-1',
    'pkg-1',
    'contextgraph-v1',
    'DEBUG',
    'bfs',
    'node-entry',
    3,
    2048,
    30,
    '2026-06-15T12:00:00.000Z',
    'completed',
    null,
    { workspaceId: WORKSPACE_ID, entryNodeId: 'node-entry' },
    [
      {
        stageId: 'validation',
        stageName: 'Request validation',
        status: 'completed',
        outputCount: 1,
        durationMs: 0.1,
      },
    ],
    {
      totalDurationMs: 12,
      stagesExecuted: 10,
      reachableNodes: 4,
      authorizedNodes: 4,
      injectedNodes: 0,
      ruleCandidates: 3,
      builtCandidates: 3,
      rankedCandidates: 3,
      includedCandidates: 3,
      excludedByRules: 1,
      excludedByBudget: 0,
      excludedByRank: 0,
      ruleEngineDurationMs: 2,
      stageDurationsMs: { validation: 0.1 },
    },
    [
      {
        candidateId: 'node-entry',
        title: 'Entry',
        content: 'Content',
        type: NodeType.FACT,
        status: NodeStatus.ACTIVE,
        importance: 50,
        distance: 0,
        derivabilityScore: 40,
        complianceTags: ['INTERNAL'],
        inclusionReason: 'LOCAL_REACHABILITY',
        compressionHint: 'FULL',
        score: 1,
        rank: 1,
        tokens: 23,
      },
    ],
    [
      {
        nodeId: 'node-cut',
        included: false,
        finalReasonCode: 'DERIVABLE_CONTENT',
        failingRuleId: 'derivability',
        excludedByBudget: false,
      },
    ],
    null,
    512,
    '2026-06-15T12:00:01.000Z',
  )
  return Object.assign(entity, overrides) as PipelineRunEntity
}

function makeInput(overrides: Partial<RecordPipelineRunInput> = {}): RecordPipelineRunInput {
  return {
    organizationId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    actorId: 'user-1',
    requestId: 'req-1',
    packageId: 'pkg-1',
    version: 'contextgraph-v1',
    mode: 'DEBUG',
    strategy: 'bfs',
    entryNodeId: 'node-entry',
    maxDepth: 3,
    tokenBudget: 2048,
    maxCandidates: 30,
    evaluatedAt: '2026-06-15T12:00:00.000Z',
    status: 'completed',
    failedStageId: null,
    request: { workspaceId: WORKSPACE_ID, entryNodeId: 'node-entry' },
    trace: [],
    metrics: null,
    candidates: null,
    exclusions: null,
    error: null,
    tokensUsed: 512,
    ...overrides,
  }
}

function makeRepository(): IPipelineRunRepository {
  return {
    record: vi.fn(async () => makeEntity()),
    findByRequestId: vi.fn(async () => makeEntity()),
    findByWorkspace: vi.fn(async () => [makeEntity()]),
  } as unknown as IPipelineRunRepository
}

describe('PipelineRunService', () => {
  let service: IPipelineRunService
  let repository: IPipelineRunRepository

  beforeEach(() => {
    repository = makeRepository()
    service = new PipelineRunService(repository)
  })

  it('records a run through the append-only repository', async () => {
    const input = makeInput()
    const entity = await service.record(input)
    expect(entity.requestId).toBe('req-1')
    expect(repository.record).toHaveBeenCalledWith(input)
  })

  it('finds a completed run by request id within the organization', async () => {
    const run = await service.findByRequestId(ORG_ID, 'req-1')
    expect(run.requestId).toBe('req-1')
    expect(run.status).toBe('completed')
    expect(run.metrics?.includedCandidates).toBe(3)
    expect(run.candidates).toHaveLength(1)
    expect(run.trace).toHaveLength(1)
    expect(repository.findByRequestId).toHaveBeenCalledWith(ORG_ID, 'req-1')
  })

  it('throws NotFoundException for an unknown request id', async () => {
    vi.mocked(repository.findByRequestId).mockResolvedValueOnce(null)
    await expect(service.findByRequestId(ORG_ID, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('lists runs for a workspace, newest first, with pagination', async () => {
    const runs = await service.listByWorkspace(ORG_ID, {
      workspaceId: WORKSPACE_ID,
      page: 2,
      limit: 10,
    })
    expect(runs).toHaveLength(1)
    expect(runs[0]?.requestId).toBe('req-1')
    expect(repository.findByWorkspace).toHaveBeenCalledWith(ORG_ID, {
      workspaceId: WORKSPACE_ID,
      page: 2,
      limit: 10,
    })
  })

  it('persists failed runs with an error but never a partial package', async () => {
    const input = makeInput({
      status: 'failed',
      packageId: null,
      failedStageId: 'rule-engine',
      metrics: null,
      candidates: null,
      exclusions: null,
      error: { code: 'ERR_PIPELINE', message: 'rule engine exploded' },
      tokensUsed: 0,
    })
    const failed = makeEntity({
      id: 'run-2',
      status: 'failed',
      packageId: null,
      failedStageId: 'rule-engine',
      metrics: null,
      candidates: [],
      exclusions: [],
      error: { code: 'ERR_PIPELINE', message: 'rule engine exploded' },
      tokensUsed: 0,
    })
    vi.mocked(repository.record).mockResolvedValueOnce(failed)

    const entity = await service.record(input)
    expect(entity.status).toBe('failed')
    expect(entity.packageId).toBeNull()
    expect(entity.metrics).toBeNull()
    expect(entity.error?.code).toBe('ERR_PIPELINE')
  })

  it('reconstructs the ContextPackage of a completed run for formatting', async () => {
    const pkg = await service.reconstructPackage(ORG_ID, 'req-1')
    expect(pkg.requestId).toBe('req-1')
    expect(pkg.version).toBe('contextgraph-v1')
    expect(pkg.candidates).toHaveLength(1)
    expect(pkg.candidates[0]?.candidateId).toBe('node-entry')
    expect(pkg.candidates[0]?.compressionHint).toBe('FULL')
    expect(pkg.tokensUsed).toBe(512)
    expect(pkg.exclusions).toHaveLength(1)
    expect(pkg.summary.funnel).toEqual({
      reachable: 4,
      authorized: 4,
      ruleCandidates: 3,
      included: 3,
    })
    expect(repository.findByRequestId).toHaveBeenCalledWith(ORG_ID, 'req-1')
  })

  it('refuses to reconstruct a failed run (no package to format)', async () => {
    vi.mocked(repository.findByRequestId).mockResolvedValueOnce(
      makeEntity({ status: 'failed', metrics: null }),
    )
    await expect(service.reconstructPackage(ORG_ID, 'req-1')).rejects.toThrow(
      'Pipeline run has no package to format',
    )
  })
})
