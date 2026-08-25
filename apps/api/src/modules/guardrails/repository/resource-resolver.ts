/* In-memory resource resolver — resolves target resource attributes for guardrail evaluation.

In production, this would call the appropriate module's repository (KnowledgeModule,
DocumentModule, etc.) to load the resource. For Phase 10, we use an in-memory store
to demonstrate the architecture without duplicating business logic. */

import { Injectable } from '@nestjs/common'
import type { EntityId, TargetResourceContext } from '@contextgraph/types'

import { IResourceResolver } from '../domain/guardrails.interfaces'

@Injectable()
export class InMemoryResourceResolver implements IResourceResolver {
  private readonly resources = new Map<string, TargetResourceContext>()

  async resolve(
    organizationId: EntityId,
    targetType: string,
    targetId: string,
  ): Promise<TargetResourceContext | null> {
    const key = `${organizationId}:${targetType}:${targetId}`
    return this.resources.get(key) ?? null
  }

  add(resource: TargetResourceContext): void {
    const key = `${resource.organizationId}:${resource.resourceType}:${resource.resourceId}`
    this.resources.set(key, resource)
  }

  clear(): void {
    this.resources.clear()
  }
}
