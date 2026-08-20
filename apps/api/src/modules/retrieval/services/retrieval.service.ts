import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import type { AuthenticatedUser } from '@contextgraph/types'
import type { RetrievalQuery, RetrievalResult, RetrievedCandidate } from '../domain/retrieval.types'
import { IHybridRetriever } from '../domain/retrieval.interfaces'

/**
 * Retrieval Service — orchestrates hybrid retrieval with authorization.
 *
 * Architecture:
 * User Query
 *   ↓
 * Authentication
 *   ↓
 * Authorization Context
 *   ↓
 * Hybrid Retrieval
 *   ↓
 * Candidate Discovery
 *   ↓
 * Permission Filtering
 *   ↓
 * Deterministic Rules
 *   ↓
 * Candidate Ranking
 *   ↓
 * Context Assembly
 *   ↓
 * LLM
 *
 * Security:
 * - Authorization happens BEFORE retrieval results are returned
 * - Cross-tenant data is never returned
 * - Retrieved candidates are untrusted until authorized
 */
@Injectable()
export class RetrievalService {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(IHybridRetriever) private readonly hybridRetriever: IHybridRetriever,
  ) {}

  /**
   * Execute a hybrid retrieval query.
   */
  async retrieve(
    user: AuthenticatedUser,
    query: Omit<RetrievalQuery, 'userId' | 'organizationId' | 'timestamp'>,
  ): Promise<RetrievalResult> {
    const startTime = Date.now()

    this.logger.debug('Executing retrieval', {
      userId: user.id,
      organizationId: user.organizationId,
      mode: query.mode,
      queryLength: query.userQuery.length,
    })

    // Build full query with authenticated context
    const fullQuery: RetrievalQuery = {
      ...query,
      userId: user.id,
      organizationId: user.organizationId,
      timestamp: new Date().toISOString(),
    }

    // Execute hybrid retrieval
    const result = await this.hybridRetriever.retrieve(fullQuery)

    // Filter candidates by authorization
    const authorizedCandidates = await this.filterByAuthorization(result.candidates, user)

    // Update metrics
    const totalLatencyMs = Date.now() - startTime
    const finalResult: RetrievalResult = {
      ...result,
      candidates: authorizedCandidates,
      totalResults: authorizedCandidates.length,
      metrics: {
        ...result.metrics,
        queryLatencyMs: totalLatencyMs,
        authorizationLatencyMs: totalLatencyMs - result.metrics.queryLatencyMs,
      },
    }

    this.logger.debug('Retrieval complete', {
      totalResults: result.totalResults,
      authorizedResults: authorizedCandidates.length,
      totalLatencyMs,
    })

    return finalResult
  }

  /**
   * Filter candidates by authorization.
   *
   * This is a critical security step:
   * - Every candidate must be authorized before being returned
   * - Authorization checks organization, permissions, and compliance
   * - Unauthorized candidates are removed from results
   */
  private async filterByAuthorization(
    candidates: readonly RetrievedCandidate[],
    user: AuthenticatedUser,
  ): Promise<RetrievedCandidate[]> {
    const authorizationStart = Date.now()

    // For now, basic authorization: ensure organization matches
    // In production, this would use the full Permission Engine
    const authorized = candidates.filter((candidate) => {
      // Organization must match
      if (candidate.organizationId !== user.organizationId) {
        this.logger.debug('Removing cross-tenant candidate', {
          nodeId: candidate.nodeId,
          candidateOrg: candidate.organizationId,
          userOrg: user.organizationId,
        })
        return false
      }

      // TODO: Add full permission evaluation
      // - Check user roles and permissions
      // - Check compliance tag access
      // - Check department-level access

      return true
    })

    const authorizationLatencyMs = Date.now() - authorizationStart
    this.logger.debug('Authorization complete', {
      inputCandidates: candidates.length,
      authorizedCandidates: authorized.length,
      authorizationLatencyMs,
    })

    return authorized
  }
}
