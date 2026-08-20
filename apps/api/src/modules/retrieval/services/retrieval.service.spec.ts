import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { RetrievalService } from './retrieval.service'
import { IHybridRetriever } from '../domain/retrieval.interfaces'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { AuthenticatedUser } from '@contextgraph/types'
import type { RetrievalResult, RetrievedCandidate } from '../domain/retrieval.types'

describe('RetrievalService', () => {
  let service: RetrievalService
  let mockHybridRetriever: IHybridRetriever

  const mockLogger = {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'test@example.com',
    organizationId: 'org-1',
    roles: ['USER'],
  }

  const mockCandidate: RetrievedCandidate = {
    nodeId: 'node-1',
    title: 'Test Node',
    content: 'Test content',
    type: 'POLICY',
    status: 'ACTIVE',
    importance: 0.8,
    organizationId: 'org-1',
    departmentId: 'dept-1',
    workspaceId: 'ws-1',
    complianceTags: ['HIPAA'],
    retrievalMethod: 'HYBRID',
    graphDistance: 2,
    semanticSimilarity: 0.85,
    lexicalScore: 0.7,
    fusedScore: 0.9,
    rank: 1,
    explanation: {
      method: 'HYBRID',
      graphDistance: 2,
      semanticSimilarity: 0.85,
      lexicalScore: 0.7,
      fusedRank: 1,
      metadataMatches: [],
      authorizationResult: {
        allowed: true,
        reason: 'Graph reachable',
        permissionLevel: null,
        complianceClearance: null,
      },
      ruleResult: null,
    },
  }

  const mockResult: RetrievalResult = {
    candidates: [mockCandidate],
    mode: 'HYBRID',
    totalResults: 1,
    graphResults: [mockCandidate],
    semanticResults: [],
    lexicalResults: [],
    fusionMetadata: {
      strategy: 'RRF',
      graphWeight: 1.0,
      semanticWeight: 1.0,
      lexicalWeight: 1.0,
      totalCandidates: 1,
      fusedCandidates: 1,
    },
    metrics: {
      queryLatencyMs: 100,
      embeddingLatencyMs: 50,
      vectorSearchLatencyMs: 30,
      lexicalSearchLatencyMs: 20,
      graphRetrievalLatencyMs: 40,
      fusionLatencyMs: 10,
      authorizationLatencyMs: 5,
      ruleFilteringLatencyMs: 5,
      finalCandidateCount: 1,
      cacheHitRate: 0,
    },
  }

  beforeEach(async () => {
    mockHybridRetriever = {
      retrieve: vi.fn().mockResolvedValue(mockResult),
      fuseResults: vi.fn().mockReturnValue([mockCandidate]),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrievalService,
        {
          provide: IHybridRetriever,
          useValue: mockHybridRetriever,
        },
        {
          provide: LOGGER,
          useValue: mockLogger,
        },
      ],
    }).compile()

    service = module.get<RetrievalService>(RetrievalService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('retrieve', () => {
    it('should execute retrieval and return authorized results', async () => {
      const query = {
        userQuery: 'test query',
        workspaceId: 'ws-1',
        topK: {
          graphTopK: 20,
          semanticTopK: 20,
          lexicalTopK: 20,
          finalTopK: 50,
        },
        filters: {},
        mode: 'HYBRID' as const,
        configuration: {
          enableGraph: true,
          enableSemantic: true,
          enableLexical: true,
          semanticWeight: 1.0,
          graphWeight: 1.0,
          lexicalWeight: 1.0,
          minSimilarity: 0.5,
        },
      }

      const result = await service.retrieve(mockUser, query)

      expect(result).toBeDefined()
      expect(result.candidates).toHaveLength(1)
      expect(result.candidates[0].nodeId).toBe('node-1')
      expect(mockHybridRetriever.retrieve).toHaveBeenCalledWith(
        expect.objectContaining({
          userQuery: 'test query',
          userId: mockUser.id,
          organizationId: mockUser.organizationId,
        }),
      )
    })

    it('should filter out cross-tenant candidates', async () => {
      const crossTenantCandidate: RetrievedCandidate = {
        ...mockCandidate,
        nodeId: 'node-2',
        organizationId: 'org-2', // Different organization
      }

      vi.mocked(mockHybridRetriever.retrieve).mockResolvedValue({
        ...mockResult,
        candidates: [mockCandidate, crossTenantCandidate],
      })

      const query = {
        userQuery: 'test query',
        workspaceId: 'ws-1',
        topK: {
          graphTopK: 20,
          semanticTopK: 20,
          lexicalTopK: 20,
          finalTopK: 50,
        },
        filters: {},
        mode: 'HYBRID' as const,
        configuration: {
          enableGraph: true,
          enableSemantic: true,
          enableLexical: true,
          semanticWeight: 1.0,
          graphWeight: 1.0,
          lexicalWeight: 1.0,
          minSimilarity: 0.5,
        },
      }

      const result = await service.retrieve(mockUser, query)

      expect(result.candidates).toHaveLength(1)
      expect(result.candidates[0].organizationId).toBe('org-1')
    })

    it('should handle empty results', async () => {
      vi.mocked(mockHybridRetriever.retrieve).mockResolvedValue({
        ...mockResult,
        candidates: [],
        totalResults: 0,
      })

      const query = {
        userQuery: 'nonexistent query',
        workspaceId: 'ws-1',
        topK: {
          graphTopK: 20,
          semanticTopK: 20,
          lexicalTopK: 20,
          finalTopK: 50,
        },
        filters: {},
        mode: 'HYBRID' as const,
        configuration: {
          enableGraph: true,
          enableSemantic: true,
          enableLexical: true,
          semanticWeight: 1.0,
          graphWeight: 1.0,
          lexicalWeight: 1.0,
          minSimilarity: 0.5,
        },
      }

      const result = await service.retrieve(mockUser, query)

      expect(result.candidates).toHaveLength(0)
      expect(result.totalResults).toBe(0)
    })
  })
})
