/* Budget repository — Prisma-based persistence for cost budgets. */

import { Injectable } from '@nestjs/common'
import type { Budget, BudgetType, BudgetStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type { IBudgetRepository, BudgetCreateData } from '../domain/governance.interfaces'

function toBudget(row: Record<string, unknown>): Budget {
  return {
    budgetId: row.id as string,
    organizationId: row.organizationId as string,
    type: row.type as BudgetType,
    targetType: (row.targetType as string) ?? null,
    targetId: (row.targetId as string) ?? null,
    limit: row.limit as number,
    period: row.period as Budget['period'],
    currentUsage: row.currentUsage as number,
    status: row.status as BudgetStatus,
    warningThreshold: row.warningThreshold as number,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  }
}

@Injectable()
export class BudgetPrismaRepository implements IBudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: BudgetCreateData): Promise<Budget> {
    const row = await this.prisma.budget.create({
      data: {
        organizationId: data.organizationId,
        type: data.type,
        targetType: data.targetType,
        targetId: data.targetId,
        limit: data.limit,
        period: data.period,
        warningThreshold: data.warningThreshold,
      },
    })
    return toBudget(row as unknown as Record<string, unknown>)
  }

  async findById(budgetId: EntityId): Promise<Budget | null> {
    const row = await this.prisma.budget.findUnique({ where: { id: budgetId } })
    return row === null ? null : toBudget(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(
    organizationId: EntityId,
    type?: BudgetType,
  ): Promise<readonly Budget[]> {
    const where: Record<string, unknown> = { organizationId }
    if (type) where.type = type
    const rows = await this.prisma.budget.findMany({ where: where as never })
    return rows.map((r) => toBudget(r as unknown as Record<string, unknown>))
  }

  async findByTarget(
    organizationId: EntityId,
    type: BudgetType,
    targetId: EntityId | null,
  ): Promise<Budget | null> {
    const row = await this.prisma.budget.findFirst({
      where: { organizationId, type, targetId },
    })
    return row === null ? null : toBudget(row as unknown as Record<string, unknown>)
  }

  async updateUsage(budgetId: EntityId, amount: number): Promise<Budget> {
    const row = await this.prisma.budget.update({
      where: { id: budgetId },
      data: { currentUsage: { increment: amount } },
    })
    // Auto-update status based on usage
    let status: Budget['status'] = 'NORMAL'
    if ((row.currentUsage as number) >= (row.limit as number)) {
      status = 'BLOCKED'
    } else if (
      (row.currentUsage as number) >=
      (row.limit as number) * (row.warningThreshold as number)
    ) {
      status = 'WARNING'
    }
    if (status !== 'NORMAL') {
      await this.updateStatus(budgetId, status)
    }
    return toBudget({ ...row, status } as Record<string, unknown>)
  }

  async updateStatus(budgetId: EntityId, status: BudgetStatus): Promise<void> {
    await this.prisma.budget.update({ where: { id: budgetId }, data: { status } })
  }

  async delete(budgetId: EntityId): Promise<void> {
    await this.prisma.budget.delete({ where: { id: budgetId } })
  }
}
