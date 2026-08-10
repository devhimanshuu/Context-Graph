import { Injectable } from '@nestjs/common'
import {
  type ComplianceClearance,
  type EntityId,
  type Metadata,
  type OrganizationStatus,
  type PermissionLevel,
  type Role,
  type Timestamp,
  type UserStatus,
} from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'

/** Raw principal record loaded from the database — the only trusted source for compilation. */
export interface AuthorizationUserData {
  readonly id: EntityId
  readonly organizationId: EntityId
  readonly departmentId: EntityId | null
  readonly role: Role
  readonly permissionLevel: PermissionLevel
  readonly complianceClearance: ComplianceClearance
  readonly status: UserStatus
  readonly metadata: Metadata
  readonly updatedAt: Timestamp
}

/**
 * Persistence contract of the authorization engine. The compiler depends on
 * this interface (dependency inversion); the Prisma implementation below is
 * swappable (cached reader, read replica, event-sourced projection).
 * It deliberately exposes coarse loads — one user, one department subtree,
 * one organization — so a full context compiles in a bounded number of
 * queries, never one per evaluated resource.
 */
export abstract class IAuthorizationDataRepository {
  abstract loadUser(userId: EntityId): Promise<AuthorizationUserData | null>
  abstract loadDepartmentSubtree(
    organizationId: EntityId,
    departmentId: EntityId,
  ): Promise<EntityId[]>
  abstract loadOrganizationStatus(organizationId: EntityId): Promise<OrganizationStatus | null>
}

@Injectable()
export class PrismaAuthorizationDataRepository implements IAuthorizationDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadUser(userId: EntityId): Promise<AuthorizationUserData | null> {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    })
    if (row === null) return null
    return {
      id: row.id,
      organizationId: row.organizationId,
      departmentId: row.departmentId,
      role: row.role,
      permissionLevel: row.permissionLevel,
      complianceClearance: row.complianceClearance,
      status: row.status,
      metadata: row.metadata as Metadata,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async loadDepartmentSubtree(
    organizationId: EntityId,
    departmentId: EntityId,
  ): Promise<EntityId[]> {
    // One query for the whole org chart (departments are small), then an
    // iterative descent — no N+1, no recursion, deterministic result.
    const departments = await this.prisma.department.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, parentId: true },
    })
    const childrenByParent = new Map<EntityId, EntityId[]>()
    for (const department of departments) {
      const parentId = department.parentId
      if (parentId === null) continue
      const siblings = childrenByParent.get(parentId)
      if (siblings === undefined) {
        childrenByParent.set(parentId, [department.id])
      } else {
        siblings.push(department.id)
      }
    }
    const descendants: EntityId[] = []
    const queue = [departmentId]
    while (queue.length > 0) {
      const current = queue.shift()
      if (current === undefined) break
      const children = childrenByParent.get(current)
      if (children === undefined) continue
      for (const child of children) {
        descendants.push(child)
        queue.push(child)
      }
    }
    return descendants
  }

  async loadOrganizationStatus(organizationId: EntityId): Promise<OrganizationStatus | null> {
    const row = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { status: true },
    })
    return row === null ? null : row.status
  }
}
