/* In-memory budget checker — verifies actions are within organizational budget limits.

In production, this would query the GovernanceModule's BudgetRepository.
For Phase 10, we use an in-memory store to demonstrate the architecture. */

import { Injectable } from '@nestjs/common'
import { IBudgetChecker } from '../domain/guardrails.interfaces'

interface BudgetEntry {
  organizationId: string
  currentUsage: number
  limit: number
}

@Injectable()
export class InMemoryBudgetChecker implements IBudgetChecker {
  private readonly budgets = new Map<string, BudgetEntry>()

  async checkBudget(
    organizationId: string,
    action: string,
    estimatedCost: number,
  ): Promise<{ withinBudget: boolean; currentUsage: number; limit: number; message: string }> {
    const entry = this.budgets.get(organizationId)

    if (entry === undefined) {
      // No budget configured = allow (fail-open for budget specifically).
      return {
        withinBudget: true,
        currentUsage: 0,
        limit: Infinity,
        message: 'No budget configured',
      }
    }

    const projectedUsage = entry.currentUsage + estimatedCost
    if (projectedUsage > entry.limit) {
      return {
        withinBudget: false,
        currentUsage: entry.currentUsage,
        limit: entry.limit,
        message: `Budget exceeded: current $${entry.currentUsage.toFixed(2)} + estimated $${estimatedCost.toFixed(2)} exceeds limit $${entry.limit.toFixed(2)}`,
      }
    }

    return {
      withinBudget: true,
      currentUsage: entry.currentUsage,
      limit: entry.limit,
      message: 'Within budget',
    }
  }

  setBudget(organizationId: string, currentUsage: number, limit: number): void {
    this.budgets.set(organizationId, { organizationId, currentUsage, limit })
  }

  clear(): void {
    this.budgets.clear()
  }
}
