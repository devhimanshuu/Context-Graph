/* Membership repository — Prisma-based persistence for multi-org user management. */

import { Injectable } from '@nestjs/common'
import type { UserMembership, MembershipStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type { IMembershipRepository, MembershipCreateData } from '../domain/governance.interfaces'

function toMembership(row: Record<string, unknown>): UserMembership {
  return {
    membershipId: row.id as string,
    userId: row.userId as string,
    organizationId: row.organizationId as string,
    role: row.role as string,
    status: row.status as MembershipStatus,
    invitedBy: (row.invitedBy as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    joinedAt: row.joinedAt instanceof Date ? row.joinedAt.toISOString() : (row.joinedAt as string),
  }
}

@Injectable()
export class MembershipPrismaRepository implements IMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: MembershipCreateData): Promise<UserMembership> {
    const row = await this.prisma.membership.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        role: data.role,
        status: 'ACTIVE',
        invitedBy: data.invitedBy,
      },
    })
    return toMembership(row as unknown as Record<string, unknown>)
  }

  async findById(membershipId: EntityId): Promise<UserMembership | null> {
    const row = await this.prisma.membership.findUnique({ where: { id: membershipId } })
    return row === null ? null : toMembership(row as unknown as Record<string, unknown>)
  }

  async findByUser(userId: EntityId): Promise<readonly UserMembership[]> {
    const rows = await this.prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => toMembership(r as unknown as Record<string, unknown>))
  }

  async findByOrganization(organizationId: EntityId): Promise<readonly UserMembership[]> {
    const rows = await this.prisma.membership.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => toMembership(r as unknown as Record<string, unknown>))
  }

  async findByUserAndOrganization(
    userId: EntityId,
    organizationId: EntityId,
  ): Promise<UserMembership | null> {
    const row = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    })
    return row === null ? null : toMembership(row as unknown as Record<string, unknown>)
  }

  async updateStatus(membershipId: EntityId, status: MembershipStatus): Promise<void> {
    await this.prisma.membership.update({ where: { id: membershipId }, data: { status } })
  }

  async updateRole(membershipId: EntityId, role: string): Promise<void> {
    await this.prisma.membership.update({ where: { id: membershipId }, data: { role } })
  }

  async remove(membershipId: EntityId): Promise<void> {
    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: 'REMOVED' },
    })
  }

  async countByOrganization(organizationId: EntityId): Promise<number> {
    return this.prisma.membership.count({ where: { organizationId, status: 'ACTIVE' } })
  }
}
