import { Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { fitToBudget } from '../context-assembly/context-token-budget'

/** A candidate eligible for the budget fitter. */
export interface BudgetItem {
  readonly id: EntityId
  readonly importance: number
  /** Null when unknown (unbounded distance sorts last). */
  readonly distance: number | null
  readonly tokens: number
}

export interface ContextBudgetResult {
  /** Included ids, in deterministic package order (entry first). */
  readonly includedIds: readonly EntityId[]
  /** Rule-passing ids that did not fit the budget. */
  readonly excludedIds: readonly EntityId[]
  readonly tokensUsed: number
  /** True when at least one candidate did not fit the budget. */
  readonly truncated: boolean
}

/**
 * Context budget abstraction. Future constraints (max nodes, max characters,
 * priority tiers, provider-specific limits) implement this contract without
 * touching the orchestrator. The default binding fits candidates into a token
 * budget.
 */
export abstract class IContextBudget {
  abstract apply(
    items: readonly BudgetItem[],
    budget: number,
    entryNodeId: EntityId,
  ): Promise<ContextBudgetResult>
}

/**
 * Deterministic token budget. Delegates to the pure fitter used by the
 * context-assembly surface so both paths share one algorithm: entry node
 * first (always included), then importance desc, distance asc, id tie-break.
 */
@Injectable()
export class TokenContextBudget extends IContextBudget {
  async apply(
    items: readonly BudgetItem[],
    budget: number,
    entryNodeId: EntityId,
  ): Promise<ContextBudgetResult> {
    const fit = fitToBudget(items, budget, entryNodeId)
    return {
      includedIds: [...fit.includedIds],
      excludedIds: [...fit.excludedIds],
      tokensUsed: fit.tokensUsed,
      truncated: fit.truncated,
    }
  }
}
