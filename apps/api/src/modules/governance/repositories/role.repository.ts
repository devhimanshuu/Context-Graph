/* Role repository — Prisma-based persistence for custom roles. */

import { Injectable } from '@nestjs/common'
import type { CustomRole, RoleStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type { IRoleRepository, RoleCreateData } from '../domain/governance.interfaces'

function toCustomRole(row: Record<string, unknown>): CustomRole {
  return {
    roleId: row.id as string,
    organizationId: row.organizationId as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    permissions: (row.permissions as string[]) ?? [],
    isBuiltIn: row.isBuiltIn as boolean,
    status: row.status as RoleStatus,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  }
}

@Injectable()
export class RolePrismaRepository implements IRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: RoleCreateData): Promise<CustomRole> {
    const row = await this.prisma.customRole.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        permissions: data.permissions,
      },
    })
    return toCustomRole(row as unknown as Record<string, unknown>)
  }

  async findById(roleId: EntityId): Promise<CustomRole | null> {
    const row = await this.prisma.customRole.findUnique({ where: { id: roleId } })
    return row === null ? null : toCustomRole(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(organizationId: EntityId): Promise<readonly CustomRole[]> {
    const rows = await this.prisma.customRole.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((r) => toCustomRole(r as unknown as Record<string, unknown>))
  }

  async findByName(organizationId: EntityId, name: string): Promise<CustomRole | null> {
    const row = await this.prisma.customRole.findUnique({
      where: { organizationId_name: { organizationId, name } },
    })
    return row === null ? null : toCustomRole(row as unknown as Record<string, unknown>)
  }

  async update(roleId: EntityId, data: Partial<RoleCreateData>): Promise<CustomRole> {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.permissions !== undefined) updateData.permissions = data.permissions
    const row = await this.prisma.customRole.update({ where: { id: roleId }, data: updateData })
    return toCustomRole(row as unknown as Record<string, unknown>)
  }

  async delete(roleId: EntityId): Promise<void> {
    await this.prisma.customRole.update({ where: { id: roleId }, data: { status: 'ARCHIVED' } })
  }

  async countUsersWithRole(organizationId: EntityId, roleName: string): Promise<number> {
    return this.prisma.membership.count({
      where: { organizationId, role: roleName, status: 'ACTIVE' },
    })
  }
}
