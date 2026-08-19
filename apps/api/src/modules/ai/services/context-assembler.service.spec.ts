import { describe, it, expect, beforeEach } from 'vitest'
import { ContextAssembler } from './context-assembler.service'
import type { AssembleContextInput, AssembleCandidateInput } from '../domain/ai.interfaces'

describe('ContextAssembler', () => {
  let assembler: ContextAssembler

  beforeEach(() => {
    assembler = new ContextAssembler({
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    } as unknown as import('../../../common/interfaces/logger.interface').ILogger)
  })

  const createMockCandidate = (
    overrides: Partial<AssembleCandidateInput> = {},
  ): AssembleCandidateInput => ({
    id: 'node-1',
    title: 'Test Node',
    content: 'Test content',
    type: 'FACT',
    importance: 50,
    distance: 1,
    compressionHint: 'FULL',
    inclusionReason: 'GRAPH_TRAVERSAL',
    complianceTags: ['INTERNAL'],
    organizationId: 'org-1',
    departmentId: null,
    workspaceId: 'workspace-1',
    version: null,
    rank: 1,
    tokens: 100,
    ...overrides,
  })

  const createMockInput = (candidates: AssembleCandidateInput[] = []): AssembleContextInput => ({
    candidates,
    entryNodeId: 'node-1',
    workspaceId: 'workspace-1',
    organizationId: 'org-1',
    contextVersion: '1.0.0',
  })

  it('should assemble empty candidates', async () => {
    const input = createMockInput([])
    const result = await assembler.assemble(input)

    expect(result.items).toHaveLength(0)
    expect(result.totalTokens).toBe(0)
    expect(result.sourceCount).toBe(0)
    expect(result.contextVersion).toBe('1.0.0')
  })

  it('should assemble single candidate', async () => {
    const candidate = createMockCandidate()
    const input = createMockInput([candidate])
    const result = await assembler.assemble(input)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('node-1')
    expect(result.items[0].title).toBe('Test Node')
    expect(result.items[0].tokens).toBe(100)
  })

  it('should assign CRITICAL priority for high importance', async () => {
    const candidate = createMockCandidate({ importance: 95 })
    const input = createMockInput([candidate])
    const result = await assembler.assemble(input)

    expect(result.items[0].priority).toBe('CRITICAL')
  })

  it('should assign HIGH priority for medium-high importance', async () => {
    const candidate = createMockCandidate({ importance: 75 })
    const input = createMockInput([candidate])
    const result = await assembler.assemble(input)

    expect(result.items[0].priority).toBe('HIGH')
  })

  it('should assign NORMAL priority for near distance', async () => {
    const candidate = createMockCandidate({ importance: 50, distance: 0 })
    const input = createMockInput([candidate])
    const result = await assembler.assemble(input)

    expect(result.items[0].priority).toBe('NORMAL')
  })

  it('should assign LOW priority for far distance', async () => {
    const candidate = createMockCandidate({ importance: 50, distance: 3 })
    const input = createMockInput([candidate])
    const result = await assembler.assemble(input)

    expect(result.items[0].priority).toBe('LOW')
  })

  it('should order by priority then rank', async () => {
    const candidates = [
      createMockCandidate({ id: 'node-1', importance: 50, rank: 2 }),
      createMockCandidate({ id: 'node-2', importance: 95, rank: 3 }),
      createMockCandidate({ id: 'node-3', importance: 75, rank: 1 }),
    ]
    const input = createMockInput(candidates)
    const result = await assembler.assemble(input)

    // Should be ordered: CRITICAL (95), HIGH (75), NORMAL (50)
    expect(result.items[0].id).toBe('node-2') // CRITICAL
    expect(result.items[1].id).toBe('node-3') // HIGH
    expect(result.items[2].id).toBe('node-1') // NORMAL
  })

  it('should include source attribution', async () => {
    const candidate = createMockCandidate({
      organizationId: 'org-1',
      departmentId: 'dept-1',
      workspaceId: 'workspace-1',
      version: '1.0.0',
    })
    const input = createMockInput([candidate])
    const result = await assembler.assemble(input)

    expect(result.items[0].source.organizationId).toBe('org-1')
    expect(result.items[0].source.departmentId).toBe('dept-1')
    expect(result.items[0].source.workspaceId).toBe('workspace-1')
    expect(result.items[0].source.version).toBe('1.0.0')
  })

  it('should compute deterministic context hash', async () => {
    const candidates = [
      createMockCandidate({ id: 'node-1', rank: 1 }),
      createMockCandidate({ id: 'node-2', rank: 2 }),
    ]
    const input = createMockInput(candidates)

    const result1 = await assembler.assemble(input)
    const result2 = await assembler.assemble(input)

    expect(result1.contextHash).toBe(result2.contextHash)
  })

  it('should calculate total tokens', async () => {
    const candidates = [
      createMockCandidate({ tokens: 100 }),
      createMockCandidate({ id: 'node-2', tokens: 200 }),
    ]
    const input = createMockInput(candidates)
    const result = await assembler.assemble(input)

    expect(result.totalTokens).toBe(300)
  })

  it('should count unique sources', async () => {
    const candidates = [
      createMockCandidate({
        id: 'node-1',
        source: {
          nodeId: 'node-1',
          organizationId: 'org-1',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
      }),
      createMockCandidate({
        id: 'node-2',
        source: {
          nodeId: 'node-2',
          organizationId: 'org-1',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
      }),
      createMockCandidate({
        id: 'node-3',
        source: {
          nodeId: 'node-3',
          organizationId: 'org-2',
          departmentId: null,
          workspaceId: 'ws-1',
          version: null,
        },
      }),
    ]
    const input = createMockInput(candidates)
    const result = await assembler.assemble(input)

    expect(result.sourceCount).toBe(3) // Each node is a unique source
  })
})
