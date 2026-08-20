import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type { EntityId } from '@contextgraph/types'
import type { RetrievalQuery, RetrievedCandidate } from '../domain/retrieval.types'
import { ILexicalRetriever } from '../domain/retrieval.interfaces'

/**
 * Lexical Retriever — retrieves nodes via PostgreSQL full-text search.
 *
 * Uses PostgreSQL's built-in text search capabilities:
 * - tsvector/tsquery for full-text search
 * - Ranking by relevance (ts_rank)
 * - Organization-scoped queries for tenant isolation
 *
 * Supports:
 * - Keyword matching
 * - Phrase matching
 * - Weighted ranking
 */
@Injectable()
export class LexicalRetriever extends ILexicalRetriever {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject('PRISMA') private readonly prisma: Record<string, unknown>,
  ) {
    super()
  }

  async search(
    query: string,
    organizationId: EntityId,
    topK: number,
  ): Promise<RetrievedCandidate[]> {
    const startTime = Date.now()

    this.logger.debug('Lexical search', {
      organizationId,
      queryLength: query.length,
      topK,
    })

    try {
      const prismaClient = this.prisma as {
        $queryRawUnsafe: (query: string, ...args: unknown[]) => Promise<Record<string, unknown>[]>
      }

      // Use PostgreSQL full-text search with tsvector
      const searchQuery = `
        SELECT 
          node_id,
          title,
          content,
          type,
          status,
          importance,
          organization_id,
          department_id,
          workspace_id,
          compliance_tags,
          ts_rank(
            to_tsvector('english', content || ' ' || title),
            plainto_tsquery('english', $1)
          ) as rank
        FROM knowledge_nodes
        WHERE organization_id = $2
          AND status = 'ACTIVE'
          AND to_tsvector('english', content || ' ' || title) @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT $3
      `

      const results = await prismaClient.$queryRawUnsafe(searchQuery, query, organizationId, topK)

      const candidates: RetrievedCandidate[] = results.map((row, index) => ({
        nodeId: row.node_id as EntityId,
        title: row.title as string,
        content: row.content as string,
        type: row.type as string,
        status: row.status as string,
        importance: Number(row.importance),
        organizationId: row.organization_id as EntityId,
        departmentId: row.department_id as EntityId | null,
        workspaceId: row.workspace_id as EntityId,
        complianceTags: row.compliance_tags as string[],
        retrievalMethod: 'LEXICAL' as const,
        graphDistance: null,
        semanticSimilarity: null,
        lexicalScore: Number(row.rank),
        fusedScore: 0,
        rank: 0,
        explanation: {
          method: 'LEXICAL' as const,
          graphDistance: null,
          semanticSimilarity: null,
          lexicalScore: Number(row.rank),
          fusedRank: index + 1,
          metadataMatches: [],
          authorizationResult: {
            allowed: true,
            reason: 'Lexical match',
            permissionLevel: null,
            complianceClearance: null,
          },
          ruleResult: null,
        },
      }))

      const latencyMs = Date.now() - startTime
      this.logger.debug('Lexical search complete', {
        candidates: candidates.length,
        latencyMs,
      })

      return candidates
    } catch (error) {
      this.logger.error('Lexical search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return []
    }
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievedCandidate[]> {
    return this.search(query.userQuery, query.organizationId, query.topK.lexicalTopK)
  }
}
