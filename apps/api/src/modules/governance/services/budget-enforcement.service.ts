/* Budget enforcement service — checks budgets before expensive operations.

Budget checks must happen BEFORE execution, not after.
If budget cannot be verified, the operation is BLOCKED (fail-closed).
*/

import { Injectable, Inject } from '@nestjs/common'
import type { EntityId, Metadata, BudgetType, BudgetStatus } from '@contextgraph/types'
import {
  IBudgetEnforcementService,
  BudgetCheckResult,
  IBudgetRepository,
} from '../domain/governance.interfaces'

@Injectable()
export class BudgetEnforcementService implements IBudgetEnforcementService {
  constructor(@Inject(IBudgetRepository) private readonly budgetRepo: IBudgetRepository) {}

  async checkBudget(
    organizationId: EntityId,
    type: BudgetType,
    targetId: EntityId | null,
    estimatedCost: number,
  ): Promise<BudgetCheckResult> {
    // Find applicable budget
    const budget = await this.budgetRepo.findByTarget(organizationId, type, targetId)

    if (!budget) {
      // No budget configured — allow (no restriction)
      return {
        allowed: true,
        reason: null,
        currentUsage: 0,
        limit: Infinity,
        remaining: Infinity,
        status: 'NORMAL',
      }
    }

    // Check if already blocked
    if (budget.status === 'BLOCKED') {
      return {
        allowed: false,
        reason: `Budget limit exceeded for ${type}`,
        currentUsage: budget.currentUsage,
        limit: budget.limit,
        remaining: 0,
        status: 'BLOCKED',
      }
    }

    // Check if this operation would exceed the limit
    const projectedUsage = budget.currentUsage + estimatedCost
    if (projectedUsage > budget.limit) {
      return {
        allowed: false,
        reason: `Operation ($${estimatedCost.toFixed(4)}) would exceed budget limit ($${budget.limit.toFixed(2)}, current: $${budget.currentUsage.toFixed(4)})`,
        currentUsage: budget.currentUsage,
        limit: budget.limit,
        remaining: Math.max(0, budget.limit - budget.currentUsage),
        status: 'LIMIT_REACHED',
      }
    }

    // Check warning threshold
    const usageRatio = projectedUsage / budget.limit
    const status: BudgetStatus = usageRatio >= budget.warningThreshold ? 'WARNING' : 'NORMAL'

    return {
      allowed: true,
      reason:
        status === 'WARNING'
          ? `Approaching budget limit (${(usageRatio * 100).toFixed(1)}%)`
          : null,
      currentUsage: budget.currentUsage,
      limit: budget.limit,
      remaining: budget.limit - projectedUsage,
      status,
    }
  }

  async recordUsage(
    organizationId: EntityId,
    userId: EntityId,
    cost: number,
    _metadata: Metadata,
  ): Promise<void> {
    // Update organization-level budget
    const orgBudgets = await this.budgetRepo.findByOrganization(organizationId, 'ORGANIZATION')
    for (const budget of orgBudgets) {
      await this.budgetRepo.updateUsage(budget.budgetId, cost)
    }

    // Update user-level budget
    const userBudgets = await this.budgetRepo.findByOrganization(organizationId, 'USER')
    for (const budget of userBudgets) {
      if (budget.targetId === userId) {
        await this.budgetRepo.updateUsage(budget.budgetId, cost)
      }
    }
  }
}
