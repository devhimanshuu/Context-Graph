/* Prisma-backed repositories for Agent Identity (Phase 14). */

import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type {
  AgentIdentity,
  AgentIdentityStatus,
  AgentEnvironment,
  AgentCredential,
  AgentIdentityCapability,
  IdentityCapability,
  AgentSession,
  AgentSessionStatus,
  CreateAgentIdentityInput,
  UpdateAgentIdentityInput,
} from '@contextgraph/types'
import {
  IAgentIdentityRepository,
  IAgentCredentialRepository,
  IAgentCapabilityRepository,
  IAgentSessionRepository,
} from '../domain/agent-identity.interfaces'

// ─── Helpers ─────────────────────────────────────────────────────────────

interface PrismaIdentityRow {
  id: string
  organizationId: string
  name: string
  slug: string
  description: string | null
  purpose: string | null
  environment: string
  status: string
  ownerUserId: string | null
  createdAt: Date
  updatedAt: Date
  lastUsedAt: Date | null
}

function mapIdentity(row: PrismaIdentityRow): AgentIdentity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    purpose: row.purpose ?? null,
    environment: row.environment as AgentEnvironment,
    status: row.status as AgentIdentityStatus,
    ownerUserId: row.ownerUserId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  }
}

interface PrismaCredentialRow {
  id: string
  agentIdentityId: string
  name: string
  type: string
  status: string
  keyPrefix: string
  keyHash: string
  createdAt: Date
  expiresAt: Date | null
  lastUsedAt: Date | null
  revokedAt: Date | null
}

function mapCredential(row: PrismaCredentialRow): AgentCredential {
  return {
    id: row.id,
    agentIdentityId: row.agentIdentityId,
    name: row.name,
    type: row.type as AgentCredential['type'],
    status: row.status as AgentCredential['status'],
    keyPrefix: row.keyPrefix,
    keyHash: row.keyHash,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
  }
}

interface PrismaCapabilityRow {
  id: string
  agentIdentityId: string
  capability: string
  grantedBy: string | null
  grantedAt: Date
  expiresAt: Date | null
}

function mapCapability(row: PrismaCapabilityRow): AgentIdentityCapability {
  return {
    id: row.id,
    agentIdentityId: row.agentIdentityId,
    capability: row.capability as AgentIdentityCapability['capability'],
    grantedBy: row.grantedBy ?? null,
    grantedAt: row.grantedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  }
}

interface PrismaSessionRow {
  sessionId: string
  agentIdentityId: string
  credentialId: string
  organizationId: string
  environment: string
  capabilities: string[] | unknown
  createdAt: Date
  expiresAt: Date
  lastActivityAt: Date
  status: string
}

function mapSession(row: PrismaSessionRow): AgentSession {
  return {
    sessionId: row.sessionId,
    agentIdentityId: row.agentIdentityId,
    credentialId: row.credentialId,
    organizationId: row.organizationId,
    environment: row.environment as AgentSession['environment'],
    capabilities: row.capabilities as string[] as AgentSession['capabilities'],
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
    status: row.status as AgentSessionStatus,
  }
}

// ─── Shared Prisma Singleton ─────────────────────────────────────────────
// Lazy-initialized PrismaClient shared across all repositories in this file.
// Avoids circular dependency at module init time; in production, inject via DI.

let _prisma: PrismaClient | null = null

function getPrisma(): PrismaClient {
  if (_prisma === null) {
    _prisma = new PrismaClient()
  }
  return _prisma
}

// ─── Agent Identity Repository ───────────────────────────────────────────

@Injectable()
export class AgentIdentityPrismaRepository implements IAgentIdentityRepository {
  private get prisma() {
    return getPrisma()
  }

  async findById(id: string): Promise<AgentIdentity | null> {
    const row = await this.prisma.agentIdentity.findUnique({ where: { id } })
    return row !== null ? mapIdentity(row) : null
  }

  async findBySlug(organizationId: string, slug: string): Promise<AgentIdentity | null> {
    const row = await this.prisma.agentIdentity.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
    })
    return row !== null ? mapIdentity(row) : null
  }

  async list(
    organizationId: string,
    filters?: {
      status?: AgentIdentityStatus
      environment?: AgentEnvironment
    },
  ): Promise<AgentIdentity[]> {
    const where: {
      organizationId: string
      status?: AgentIdentityStatus
      environment?: AgentEnvironment
    } = { organizationId }
    if (filters?.status !== undefined) where.status = filters.status
    if (filters?.environment !== undefined) where.environment = filters.environment
    const rows = await this.prisma.agentIdentity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(mapIdentity)
  }

  async create(input: CreateAgentIdentityInput): Promise<AgentIdentity> {
    const row = await this.prisma.agentIdentity.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        purpose: input.purpose ?? null,
        environment: input.environment,
        status: 'ACTIVE',
        ownerUserId: input.ownerUserId ?? null,
      },
    })
    return mapIdentity(row)
  }

  async update(id: string, input: UpdateAgentIdentityInput): Promise<AgentIdentity> {
    const row = await this.prisma.agentIdentity.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.purpose !== undefined && { purpose: input.purpose }),
        ...(input.ownerUserId !== undefined && { ownerUserId: input.ownerUserId }),
      },
    })
    return mapIdentity(row)
  }

  async updateStatus(id: string, status: AgentIdentityStatus): Promise<AgentIdentity> {
    const row = await this.prisma.agentIdentity.update({
      where: { id },
      data: { status },
    })
    return mapIdentity(row)
  }

  async updateLastUsedAt(id: string): Promise<void> {
    await this.prisma.agentIdentity.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    })
  }

  async count(organizationId: string): Promise<number> {
    return this.prisma.agentIdentity.count({ where: { organizationId } })
  }
}

// ─── Credential Repository ───────────────────────────────────────────────

@Injectable()
export class AgentCredentialPrismaRepository implements IAgentCredentialRepository {
  private get prisma() {
    return getPrisma()
  }

  async findById(id: string): Promise<AgentCredential | null> {
    const row = await this.prisma.agentCredential.findUnique({ where: { id } })
    return row !== null ? mapCredential(row) : null
  }

  async findByKeyPrefix(keyPrefix: string): Promise<AgentCredential | null> {
    const row = await this.prisma.agentCredential.findFirst({
      where: { keyPrefix, status: 'ACTIVE' },
    })
    return row !== null ? mapCredential(row) : null
  }

  async list(agentIdentityId: string): Promise<AgentCredential[]> {
    const rows = await this.prisma.agentCredential.findMany({
      where: { agentIdentityId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(mapCredential)
  }

  async create(data: {
    agentIdentityId: string
    name: string
    keyPrefix: string
    keyHash: string
    expiresAt?: Date | null
  }): Promise<AgentCredential> {
    const row = await this.prisma.agentCredential.create({
      data: {
        agentIdentityId: data.agentIdentityId,
        name: data.name,
        type: 'API_KEY',
        status: 'ACTIVE',
        keyPrefix: data.keyPrefix,
        keyHash: data.keyHash,
        expiresAt: data.expiresAt ?? null,
      },
    })
    return mapCredential(row)
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'): Promise<void> {
    await this.prisma.agentCredential.update({
      where: { id },
      data: {
        status,
        ...(status === 'REVOKED' && { revokedAt: new Date() }),
      },
    })
  }

  async updateLastUsedAt(id: string): Promise<void> {
    await this.prisma.agentCredential.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    })
  }

  async count(agentIdentityId: string): Promise<number> {
    return this.prisma.agentCredential.count({ where: { agentIdentityId } })
  }
}

// ─── Capability Repository ───────────────────────────────────────────────

@Injectable()
export class AgentCapabilityPrismaRepository implements IAgentCapabilityRepository {
  private get prisma() {
    return getPrisma()
  }

  async list(agentIdentityId: string): Promise<AgentIdentityCapability[]> {
    const rows = await this.prisma.agentIdentityCapability.findMany({
      where: { agentIdentityId },
      orderBy: { grantedAt: 'desc' },
    })
    return rows.map(mapCapability)
  }

  async find(agentIdentityId: string, capability: string): Promise<AgentIdentityCapability | null> {
    const row = await this.prisma.agentIdentityCapability.findUnique({
      where: { agentIdentityId_capability: { agentIdentityId, capability } },
    })
    return row !== null ? mapCapability(row) : null
  }

  async grant(data: {
    agentIdentityId: string
    capability: string
    grantedBy?: string | null
    expiresAt?: Date | null
  }): Promise<AgentIdentityCapability> {
    const row = await this.prisma.agentIdentityCapability.upsert({
      where: {
        agentIdentityId_capability: {
          agentIdentityId: data.agentIdentityId,
          capability: data.capability,
        },
      },
      update: {
        expiresAt: data.expiresAt ?? null,
        grantedBy: data.grantedBy ?? null,
        grantedAt: new Date(),
      },
      create: {
        agentIdentityId: data.agentIdentityId,
        capability: data.capability,
        grantedBy: data.grantedBy ?? null,
        expiresAt: data.expiresAt ?? null,
      },
    })
    return mapCapability(row)
  }

  async revoke(agentIdentityId: string, capability: string): Promise<void> {
    await this.prisma.agentIdentityCapability.delete({
      where: { agentIdentityId_capability: { agentIdentityId, capability } },
    })
  }

  async listCapabilities(agentIdentityId: string): Promise<IdentityCapability[]> {
    const rows = await this.prisma.agentIdentityCapability.findMany({
      where: { agentIdentityId },
    })
    return rows.map((r) => r.capability as IdentityCapability)
  }
}

// ─── Session Repository ──────────────────────────────────────────────────

@Injectable()
export class AgentSessionPrismaRepository implements IAgentSessionRepository {
  private get prisma() {
    return getPrisma()
  }

  async findById(sessionId: string): Promise<AgentSession | null> {
    const row = await this.prisma.agentIdentitySession.findUnique({
      where: { sessionId },
    })
    return row !== null ? mapSession(row) : null
  }

  async create(data: {
    agentIdentityId: string
    credentialId: string
    organizationId: string
    environment: string
    capabilities: readonly string[]
    expiresAt: Date
  }): Promise<AgentSession> {
    const row = await this.prisma.agentIdentitySession.create({
      data: {
        agentIdentityId: data.agentIdentityId,
        credentialId: data.credentialId,
        organizationId: data.organizationId,
        environment: data.environment,
        capabilities: [...data.capabilities] as unknown as string[],
        status: 'ACTIVE',
        expiresAt: data.expiresAt,
      },
    })
    return mapSession(row)
  }

  async updateStatus(sessionId: string, status: AgentSessionStatus): Promise<void> {
    await this.prisma.agentIdentitySession.update({
      where: { sessionId },
      data: { status },
    })
  }

  async updateLastActivity(sessionId: string): Promise<void> {
    await this.prisma.agentIdentitySession.update({
      where: { sessionId },
      data: { lastActivityAt: new Date() },
    })
  }

  async invalidateByAgentIdentity(agentIdentityId: string): Promise<void> {
    await this.prisma.agentIdentitySession.updateMany({
      where: { agentIdentityId, status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    })
  }

  async listActive(organizationId: string): Promise<AgentSession[]> {
    const rows = await this.prisma.agentIdentitySession.findMany({
      where: { organizationId, status: 'ACTIVE' },
      orderBy: { lastActivityAt: 'desc' },
    })
    return rows.map(mapSession)
  }
}
