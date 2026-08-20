import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type { AuthenticatedUser } from '@contextgraph/types'
import type { RetrievalQuery, RetrievedCandidate } from '../domain/retrieval.types'
import { IGraphRetriever } from '../domain/retrieval.interfaces'
import { IGraphService } from '../../graph/graph.service'
import { IKnowledgeRepository } from '../../knowledge/knowledge.repository'

/**
 * Graph Retriever — retrieves nodes via graph traversal.
 *
 * Wraps the existing Graph Engine to discover nodes based on:
 * - Entry node
 * - Graph relationships
 * - Graph distance
 * - Organization
 * - Metadata
 *
 * Does NOT duplicate BFS — reuses the existing Graph Engine.
 */
@Injectable()
export class GraphRetriever extends IGraphRetriever {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(IGraphService) private readonly graphService: IGraphService,
    @Inject(IKnowledgeRepository) private readonly knowledgeRepository: IKnowledgeRepository,
  ) {
    super()
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievedCandidate[]> {
    const startTime = Date.now()

    this.logger.debug('Graph retrieval', {
      organizationId: query.organizationId,
      workspaceId: query.workspaceId,
      entryNodeId: query.entryNodeId,
      topK: query.topK.graphTopK,
    })

    if (!query.entryNodeId) {
      this.logger.debug('No entry node specified, returning empty graph results')
      return []
    }

    try {
      // Use the existing graph service to compute reachability
      const reachability = await this.graphService.reachableNodes(
        { organizationId: query.organizationId, id: query.userId } as AuthenticatedUser,
        query.workspaceId,
        {
          entryNodeId: query.entryNodeId,
          maxDepth: 5,
          strategy: 'bfs',
        },
      )

      // Get knowledge nodes for the reachable nodes
      const nodeIds = reachability.nodeIds.slice(0, query.topK.graphTopK)
      if (nodeIds.length === 0) {
        return []
      }

      const nodes = await this.knowledgeRepository.findByWorkspace(
        query.organizationId,
        query.workspaceId,
      )

      const nodeMap = new Map(nodes.map((node) => [node.id, node]))

      // Convert to RetrievedCandidate format
      const candidates: RetrievedCandidate[] = []
      for (const nodeId of nodeIds) {
        const node = nodeMap.get(nodeId)
        if (!node) continue

        candidates.push({
          nodeId: node.id,
          title: node.title,
          content: node.content,
          type: String(node.type),
          status: String(node.status),
          importance: node.importance,
          organizationId: node.organizationId,
          departmentId: node.departmentId,
          workspaceId: node.workspaceId,
          complianceTags: [...node.complianceTags],
          retrievalMethod: 'GRAPH' as const,
          graphDistance: reachability.distances[nodeId] ?? null,
          semanticSimilarity: null,
          lexicalScore: null,
          fusedScore: 0,
          rank: 0,
          explanation: {
            method: 'GRAPH' as const,
            graphDistance: reachability.distances[nodeId] ?? null,
            semanticSimilarity: null,
            lexicalScore: null,
            fusedRank: 0,
            metadataMatches: [],
            authorizationResult: {
              allowed: true,
              reason: 'Graph reachable',
              permissionLevel: null,
              complianceClearance: null,
            },
            ruleResult: null,
          },
        })
      }

      const latencyMs = Date.now() - startTime
      this.logger.debug('Graph retrieval complete', {
        candidates: candidates.length,
        latencyMs,
      })

      return candidates
    } catch (error) {
      this.logger.error('Graph retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return []
    }
  }
}
