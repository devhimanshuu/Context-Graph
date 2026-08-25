/* In-memory constraint repository — stores active policy constraints.

In production, this would be backed by PostgreSQL via Prisma.
For Phase 10, we use an in-memory store with seed data to demonstrate the architecture. */

import { Injectable } from '@nestjs/common'
import type { ConstraintDefinition } from '@contextgraph/types'
import { IConstraintRepository } from '../domain/guardrails.interfaces'

@Injectable()
export class InMemoryConstraintRepository implements IConstraintRepository {
  private readonly constraints: ConstraintDefinition[] = []

  async findActiveByOrganization(
    organizationId: string,
    action?: string,
  ): Promise<readonly ConstraintDefinition[]> {
    return this.constraints.filter(
      (c) =>
        c.organizationId === organizationId &&
        c.status === 'ACTIVE' &&
        (action === undefined || c.action === action),
    )
  }

  async findByOrganizationAndAction(
    organizationId: string,
    action: string,
  ): Promise<readonly ConstraintDefinition[]> {
    return this.constraints.filter(
      (c) => c.organizationId === organizationId && c.action === action && c.status === 'ACTIVE',
    )
  }

  add(constraint: ConstraintDefinition): void {
    this.constraints.push(constraint)
  }

  clear(): void {
    this.constraints.length = 0
  }
}
