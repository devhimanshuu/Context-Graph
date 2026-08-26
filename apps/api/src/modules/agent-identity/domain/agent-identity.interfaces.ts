/* Agent Identity module — DI interfaces and abstract tokens. */

import type {
  AgentIdentity,
  AgentIdentityStatus,
  AgentEnvironment,
  AgentCredential,
  AgentIdentityCapability,
  IdentityCapability,
  AgentSession,
  AgentSessionStatus,
  CreatedCredential,
  CreateAgentIdentityInput,
  UpdateAgentIdentityInput,
  CreateCredentialInput,
} from '@contextgraph/types'
import type { AuthenticatedUser } from '@contextgraph/types'

// ─── Repository Interface ────────────────────────────────────────────────

export abstract class IAgentIdentityRepository {
  abstract findById(id: string): Promise<AgentIdentity | null>
  abstract findBySlug(organizationId: string, slug: string): Promise<AgentIdentity | null>
  abstract list(
    organizationId: string,
    filters?: {
      status?: AgentIdentityStatus
      environment?: AgentEnvironment
    },
  ): Promise<AgentIdentity[]>
  abstract create(input: CreateAgentIdentityInput): Promise<AgentIdentity>
  abstract update(id: string, input: UpdateAgentIdentityInput): Promise<AgentIdentity>
  abstract updateStatus(id: string, status: AgentIdentityStatus): Promise<AgentIdentity>
  abstract updateLastUsedAt(id: string): Promise<void>
  abstract count(organizationId: string): Promise<number>
}

// ─── Credential Repository ───────────────────────────────────────────────

export abstract class IAgentCredentialRepository {
  abstract findById(id: string): Promise<AgentCredential | null>
  abstract findByKeyPrefix(keyPrefix: string): Promise<AgentCredential | null>
  abstract list(agentIdentityId: string): Promise<AgentCredential[]>
  abstract create(data: {
    agentIdentityId: string
    name: string
    keyPrefix: string
    keyHash: string
    expiresAt?: Date | null
  }): Promise<AgentCredential>
  abstract updateStatus(id: string, status: 'ACTIVE' | 'REVOKED' | 'EXPIRED'): Promise<void>
  abstract updateLastUsedAt(id: string): Promise<void>
  abstract count(agentIdentityId: string): Promise<number>
}

// ─── Capability Repository ───────────────────────────────────────────────

export abstract class IAgentCapabilityRepository {
  abstract list(agentIdentityId: string): Promise<AgentIdentityCapability[]>
  abstract find(
    agentIdentityId: string,
    capability: string,
  ): Promise<AgentIdentityCapability | null>
  abstract grant(data: {
    agentIdentityId: string
    capability: string
    grantedBy?: string | null
    expiresAt?: Date | null
  }): Promise<AgentIdentityCapability>
  abstract revoke(agentIdentityId: string, capability: string): Promise<void>
  abstract listCapabilities(agentIdentityId: string): Promise<IdentityCapability[]>
}

// ─── Session Repository ──────────────────────────────────────────────────

export abstract class IAgentSessionRepository {
  abstract findById(sessionId: string): Promise<AgentSession | null>
  abstract create(data: {
    agentIdentityId: string
    credentialId: string
    organizationId: string
    environment: string
    capabilities: readonly string[]
    expiresAt: Date
  }): Promise<AgentSession>
  abstract updateStatus(sessionId: string, status: AgentSessionStatus): Promise<void>
  abstract updateLastActivity(sessionId: string): Promise<void>
  abstract invalidateByAgentIdentity(agentIdentityId: string): Promise<void>
  abstract listActive(organizationId: string): Promise<AgentSession[]>
}

// ─── Registry Service Interface ──────────────────────────────────────────

export abstract class IAgentIdentityRegistry {
  abstract findById(id: string): Promise<AgentIdentity | null>
  abstract findBySlug(organizationId: string, slug: string): Promise<AgentIdentity | null>
  abstract list(
    organizationId: string,
    filters?: {
      status?: AgentIdentityStatus
      environment?: AgentEnvironment
    },
  ): Promise<AgentIdentity[]>
  abstract create(actor: AuthenticatedUser, input: CreateAgentIdentityInput): Promise<AgentIdentity>
  abstract update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateAgentIdentityInput,
  ): Promise<AgentIdentity>
  abstract suspend(actor: AuthenticatedUser, id: string): Promise<AgentIdentity>
  abstract revoke(actor: AuthenticatedUser, id: string): Promise<AgentIdentity>
  abstract reactivate(actor: AuthenticatedUser, id: string): Promise<AgentIdentity>
  abstract count(organizationId: string): Promise<number>
}

// ─── Credential Service Interface ────────────────────────────────────────

export abstract class IAgentCredentialService {
  abstract create(
    actor: AuthenticatedUser,
    agentId: string,
    input: CreateCredentialInput,
  ): Promise<CreatedCredential>
  abstract revoke(actor: AuthenticatedUser, agentId: string, credentialId: string): Promise<void>
  abstract list(agentId: string): Promise<AgentCredential[]>
  abstract rotate(
    actor: AuthenticatedUser,
    agentId: string,
    credentialId: string,
  ): Promise<CreatedCredential>
}

// ─── Capability Service Interface ────────────────────────────────────────

export abstract class IAgentCapabilityService {
  abstract list(agentId: string): Promise<AgentIdentityCapability[]>
  abstract grant(
    actor: AuthenticatedUser,
    agentId: string,
    capability: IdentityCapability,
    expiresAt?: Date | null,
  ): Promise<AgentIdentityCapability>
  abstract revoke(
    actor: AuthenticatedUser,
    agentId: string,
    capability: IdentityCapability,
  ): Promise<void>
}

// ─── Authentication Service Interface ────────────────────────────────────

export abstract class IAgentAuthService {
  abstract authenticateApiKey(
    apiKey: string,
    headers: Record<string, string | undefined>,
  ): Promise<AgentSession | null>
  abstract validateSession(sessionId: string): Promise<AgentSession | null>
  abstract invalidateSession(sessionId: string): Promise<void>
  abstract invalidateAllSessions(agentIdentityId: string): Promise<void>
}
