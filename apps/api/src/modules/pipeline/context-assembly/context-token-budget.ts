/**
 * Deterministic token budgeting for context packages.
 *
 * Pure functions — no I/O, no clock, no randomness — so a package is
 * byte-identical for identical inputs. Estimation is a documented heuristic
 * (~4 chars/token, the standard LLM approximation); it is intentionally NOT a
 * tokenizer so it stays fast and dependency-free at 100k-node scale.
 */

/** Fixed per-node structural overhead (JSON envelope, headers, separators). */
export const NODE_TOKEN_OVERHEAD = 12

/** Approximate tokens for a text chunk (~4 chars per token). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

/** A node eligible for the budget fitter (tokens precomputed). */
export interface BudgetCandidate {
  readonly id: string
  readonly importance: number
  /** Null when unknown (unbounded distance sorts last). */
  readonly distance: number | null
  readonly tokens: number
}

export interface BudgetFitResult {
  /** Node ids included within the budget, in package order. */
  readonly includedIds: readonly string[]
  /** Node ids that passed the rules but did not fit the budget. */
  readonly excludedIds: readonly string[]
  /** Total tokens of the included set. */
  readonly tokensUsed: number
  /** True when at least one rule-passing node did not fit the budget. */
  readonly truncated: boolean
}

/**
 * Fits rule-passing candidates into the token budget.
 *
 * Ordering is deterministic: the entry node is always first (it anchors the
 * package), then higher importance, then shorter distance, then id as the
 * final tie-break. The entry node is included even if it alone exceeds the
 * budget — a minimal but valid package is always produced.
 */
export function fitToBudget(
  candidates: readonly BudgetCandidate[],
  budget: number,
  entryNodeId: string,
): BudgetFitResult {
  const ordered = [...candidates].sort((a, b) => {
    const aEntry = a.id === entryNodeId ? 0 : 1
    const bEntry = b.id === entryNodeId ? 0 : 1
    if (aEntry !== bEntry) return aEntry - bEntry
    if (b.importance !== a.importance) return b.importance - a.importance
    const aDistance = a.distance ?? Number.POSITIVE_INFINITY
    const bDistance = b.distance ?? Number.POSITIVE_INFINITY
    if (aDistance !== bDistance) return aDistance - bDistance
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  const includedIds: string[] = []
  const excludedIds: string[] = []
  let tokensUsed = 0

  for (const candidate of ordered) {
    const fits = candidate.id === entryNodeId || tokensUsed + candidate.tokens <= budget
    if (fits) {
      includedIds.push(candidate.id)
      tokensUsed += candidate.tokens
    } else {
      excludedIds.push(candidate.id)
    }
  }

  return {
    includedIds,
    excludedIds,
    tokensUsed,
    truncated: excludedIds.length > 0,
  }
}
