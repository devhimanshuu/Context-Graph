/* Policy repository — Prisma-based persistence for governance policies. */

import { Injectable } from '@nestjs/common'
import type { Policy, PolicyType, PolicyStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type { IPolicyRepository, PolicyCreateData } from '../domain/governance.interfaces'

function toPolicy(row: Record<string, unknown>): Policy {
  return {
    policyId: row.id as string,
    organizationId: row.organizationId as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    type: row.type as PolicyType,
    version: row.version as number,
    status: row.status as PolicyStatus,
    configuration: (row.configuration as Record<string, unknown>) ?? {},
    createdBy: (row.createdBy as string) ?? '',
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  }
}

@Injectable()
export class PolicyPrismaRepository implements IPolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: PolicyCreateData): Promise<Policy> {
    const latestVersion = await this.prisma.governancePolicy.findFirst({
      where: { organizationId: data.organizationId, name: data.name },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const nextVersion = (latestVersion?.version ?? 0) + 1

    const row = await this.prisma.governancePolicy.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        type: data.type,
        version: nextVersion,
        status: 'DRAFT',
        configuration: data.configuration as never,
        createdBy: data.createdBy,
      },
    })
    return toPolicy(row as unknown as Record<string, unknown>)
  }

  async findById(policyId: EntityId): Promise<Policy | null> {
    const row = await this.prisma.governancePolicy.findUnique({ where: { id: policyId } })
    return row === null ? null : toPolicy(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(
    organizationId: EntityId,
    type?: PolicyType,
  ): Promise<readonly Policy[]> {
    const where: Record<string, unknown> = { organizationId }
    if (type) where.type = type
    const rows = await this.prisma.governancePolicy.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => toPolicy(r as unknown as Record<string, unknown>))
  }

  async findByNameAndVersion(
    organizationId: EntityId,
    name: string,
    version: number,
  ): Promise<Policy | null> {
    const row = await this.prisma.governancePolicy.findUnique({
      where: { organizationId_name_version: { organizationId, name, version } },
    })
    return row === null ? null : toPolicy(row as unknown as Record<string, unknown>)
  }

  async findActivePolicies(
    organizationId: EntityId,
    type?: PolicyType,
  ): Promise<readonly Policy[]> {
    const where: Record<string, unknown> = { organizationId, status: 'ACTIVE' }
    if (type) where.type = type
    const rows = await this.prisma.governancePolicy.findMany({ where: where as never })
    return rows.map((r) => toPolicy(r as unknown as Record<string, unknown>))
  }

  async updateStatus(policyId: EntityId, status: PolicyStatus): Promise<void> {
    await this.prisma.governancePolicy.update({ where: { id: policyId }, data: { status } })
  }

  async incrementVersion(organizationId: EntityId, name: string): Promise<number> {
    const latest = await this.prisma.governancePolicy.findFirst({
      where: { organizationId, name },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    return (latest?.version ?? 0) + 1
  }

  async delete(policyId: EntityId): Promise<void> {
    await this.prisma.governancePolicy.update({
      where: { id: policyId },
      data: { status: 'ARCHIVED' },
    })
  }
}
