/* Team repository — Prisma-based persistence for organization teams. */

import { Injectable } from '@nestjs/common'
import type { Team, TeamMembership, TeamStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type { ITeamRepository, TeamCreateData } from '../domain/governance.interfaces'

function toTeam(row: Record<string, unknown>): Team {
  return {
    teamId: row.id as string,
    organizationId: row.organizationId as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    status: row.status as TeamStatus,
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  }
}

function toTeamMembership(row: Record<string, unknown>): TeamMembership {
  return {
    membershipId: row.id as string,
    teamId: row.teamId as string,
    userId: row.userId as string,
    role: row.role as string,
    joinedAt: row.joinedAt instanceof Date ? row.joinedAt.toISOString() : (row.joinedAt as string),
  }
}

@Injectable()
export class TeamPrismaRepository implements ITeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: TeamCreateData): Promise<Team> {
    const row = await this.prisma.team.create({
      data: { organizationId: data.organizationId, name: data.name, description: data.description },
    })
    return toTeam(row as unknown as Record<string, unknown>)
  }

  async findById(teamId: EntityId): Promise<Team | null> {
    const row = await this.prisma.team.findUnique({ where: { id: teamId } })
    return row === null ? null : toTeam(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(organizationId: EntityId): Promise<readonly Team[]> {
    const rows = await this.prisma.team.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => toTeam(r as unknown as Record<string, unknown>))
  }

  async update(teamId: EntityId, data: Partial<TeamCreateData>): Promise<Team> {
    const row = await this.prisma.team.update({ where: { id: teamId }, data })
    return toTeam(row as unknown as Record<string, unknown>)
  }

  async delete(teamId: EntityId): Promise<void> {
    await this.prisma.team.update({ where: { id: teamId }, data: { status: 'ARCHIVED' } })
  }

  async addMember(teamId: EntityId, userId: EntityId, role = 'MEMBER'): Promise<TeamMembership> {
    const row = await this.prisma.teamMembership.create({
      data: { teamId, userId, role },
    })
    return toTeamMembership(row as unknown as Record<string, unknown>)
  }

  async removeMember(teamId: EntityId, userId: EntityId): Promise<void> {
    await this.prisma.teamMembership.deleteMany({ where: { teamId, userId } })
  }

  async getMembers(teamId: EntityId): Promise<readonly TeamMembership[]> {
    const rows = await this.prisma.teamMembership.findMany({ where: { teamId } })
    return rows.map((r) => toTeamMembership(r as unknown as Record<string, unknown>))
  }

  async getUserTeams(userId: EntityId, organizationId: EntityId): Promise<readonly Team[]> {
    const memberships = await this.prisma.teamMembership.findMany({
      where: { userId, team: { organizationId } },
      include: { team: true },
    })
    return memberships.map((m) => toTeam(m.team as unknown as Record<string, unknown>))
  }
}
