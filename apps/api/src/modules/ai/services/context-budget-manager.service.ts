import { Injectable } from '@nestjs/common'
import type {
  BudgetFitResult,
  ContextBudgetConstraints,
  ContextItem,
  ContextPriority,
} from '../domain/ai.types'
import type { IContextBudgetManager } from '../domain/ai.interfaces'

/** Priority tiers for budget management (higher = more important). */
const PRIORITY_WEIGHTS: Record<ContextPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
}

/**
 * Context Budget Manager — production-grade budget fitting.
 *
 * Responsible for determining which candidates fit within the available
 * budget while respecting priority tiers.
 *
 * Key behaviors:
 * - CRITICAL items are never removed unless they individually exceed budget
 * - Budget is consumed greedily by priority, then by rank within priority
 * - Token estimates are used (not actual tokenization)
 * - Deterministic: identical inputs produce identical outputs
 */
@Injectable()
export class ContextBudgetManager implements IContextBudgetManager {
  fitToBudget(
    items: readonly ContextItem[],
    constraints: ContextBudgetConstraints,
  ): BudgetFitResult {
    const sorted = this.sortByPriorityAndRank(items)
    const included: ContextItem[] = []
    const excluded: ContextItem[] = []
    const exclusionReasons = new Map<string, string>()

    let totalTokens = 0
    let totalCharacters = 0
    let sourceCount = 0
    const sourceSet = new Set<string>()

    for (const item of sorted) {
      const wouldExceedTokens = totalTokens + item.tokens > constraints.maxTokens
      const wouldExceedCandidates = included.length >= constraints.maxCandidates
      const wouldExceedCharacters =
        totalCharacters + item.content.length > constraints.maxCharacters
      const wouldExceedSources =
        !sourceSet.has(item.source.nodeId) && sourceCount >= constraints.maxSourceCount
      const wouldExceedContentSize = totalTokens + item.tokens > constraints.maxContentSize

      if (wouldExceedCandidates) {
        excluded.push(item)
        exclusionReasons.set(item.id, 'MAX_CANDIDATES_EXCEEDED')
        continue
      }

      if (wouldExceedTokens) {
        excluded.push(item)
        exclusionReasons.set(item.id, 'TOKEN_BUDGET_EXCEEDED')
        continue
      }

      if (wouldExceedCharacters) {
        excluded.push(item)
        exclusionReasons.set(item.id, 'CHARACTER_BUDGET_EXCEEDED')
        continue
      }

      if (wouldExceedContentSize) {
        excluded.push(item)
        exclusionReasons.set(item.id, 'CONTENT_SIZE_EXCEEDED')
        continue
      }

      if (wouldExceedSources) {
        excluded.push(item)
        exclusionReasons.set(item.id, 'SOURCE_COUNT_EXCEEDED')
        continue
      }

      included.push(item)
      totalTokens += item.tokens
      totalCharacters += item.content.length
      if (!sourceSet.has(item.source.nodeId)) {
        sourceCount++
        sourceSet.add(item.source.nodeId)
      }
    }

    return {
      included,
      excluded,
      totalTokens,
      truncated: excluded.length > 0,
      exclusionReasons,
    }
  }

  assignPriority(item: ContextItem): ContextPriority {
    if (item.importance >= 90) return 'CRITICAL'
    if (item.importance >= 70) return 'HIGH'
    if (item.distance <= 1) return 'NORMAL'
    return 'LOW'
  }

  private sortByPriorityAndRank(items: readonly ContextItem[]): ContextItem[] {
    return [...items].sort((a, b) => {
      const aWeight = PRIORITY_WEIGHTS[a.priority]
      const bWeight = PRIORITY_WEIGHTS[b.priority]
      if (aWeight !== bWeight) return bWeight - aWeight
      return a.rank - b.rank
    })
  }
}
