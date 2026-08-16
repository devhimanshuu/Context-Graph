import { ERROR_CODES } from '@contextgraph/shared'
import { CandidateException } from '../../../common/exceptions/pipeline/candidate.exception'

/**
 * A candidate could not be built (e.g. a rule-passing node without the
 * fields assembly requires). Fail fast — a malformed candidate must never
 * reach a context package silently.
 */
export class CandidateBuildException extends CandidateException {
  override readonly code = ERROR_CODES.CANDIDATE

  constructor(
    message = 'Candidate assembly failed',
    details?: { nodeId?: string; cause?: unknown },
  ) {
    super(message, details)
  }
}

/**
 * Candidate ranking failed (e.g. an impossible configuration such as a
 * negative weight). Ranking is deterministic; any configuration error is a
 * programmer error and must surface loudly.
 */
export class CandidateRankingException extends CandidateException {
  override readonly code = ERROR_CODES.CANDIDATE_RANKING

  constructor(message = 'Candidate ranking failed', details?: unknown) {
    super(message, details)
  }
}
