/* Agent Authentication Service — verifies credentials and creates sessions.

Flow:
  API Key → hash/verify → find credential → find agent identity →
  check status → check expiry → resolve capabilities → create session → return

Security:
- Never trust client-supplied identity fields
- Agent identity is resolved server-side from the credential
- Capabilities come from the agent's stored capability grants
- Sessions expire and can be revoked
- Suspended/revoked agents cannot authenticate */

import { Inject, Injectable } from '@nestjs/common'
import type { AgentSession, AgentIdentity, AgentCredential } from '@contextgraph/types'
import {
  IAgentIdentityRepository,
  IAgentCredentialRepository,
  IAgentCapabilityRepository,
  IAgentSessionRepository,
} from '../domain/agent-identity.interfaces'
import { CredentialHashService } from './credential-hash.service'

@Injectable()
export class AgentAuthService {
  constructor(
    @Inject(IAgentIdentityRepository)
    private readonly identityRepo: IAgentIdentityRepository,
    @Inject(IAgentCredentialRepository)
    private readonly credentialRepo: IAgentCredentialRepository,
    @Inject(IAgentCapabilityRepository)
    private readonly capabilityRepo: IAgentCapabilityRepository,
    @Inject(IAgentSessionRepository)
    private readonly sessionRepo: IAgentSessionRepository,
    private readonly hashService: CredentialHashService,
  ) {}

  /**
   * Authenticate an API key and create a session.
   * Returns null if authentication fails (never throws for auth failures).
   */
  async authenticateApiKey(
    apiKey: string,
    _headers: Record<string, string | undefined>,
  ): Promise<AgentSession | null> {
    // 1. Validate key format
    if (!this.hashService.isValidKeyFormat(apiKey)) {
      return null
    }

    // 2. Find credential by scanning active credentials
    //    In production, we'd use a more efficient lookup by prefix.
    // For now, we iterate through known agents in the organization
    // A production implementation would use a credential index

    // 3. Verify the key against stored hashes
    // This is done by trying the hash against all active credentials
    // For performance, we cache verified credentials
    const credentials = await this.findAndVerifyCredential(apiKey)
    if (credentials === null) return null

    const { credential, agentIdentity } = credentials

    // 4. Check agent identity status
    if (agentIdentity.status !== 'ACTIVE') {
      return null
    }

    // 5. Check credential expiry
    if (credential.expiresAt !== null && new Date(credential.expiresAt) < new Date()) {
      return null
    }

    // 6. Resolve capabilities from agent's granted capabilities
    const capabilities = await this.capabilityRepo.listCapabilities(agentIdentity.id)

    // 7. Create session
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    const session = await this.sessionRepo.create({
      agentIdentityId: agentIdentity.id,
      credentialId: credential.id,
      organizationId: agentIdentity.organizationId,
      environment: agentIdentity.environment,
      capabilities: capabilities as readonly string[],
      expiresAt,
    })

    // 8. Update last used timestamps
    await this.credentialRepo.updateLastUsedAt(credential.id)
    await this.identityRepo.updateLastUsedAt(agentIdentity.id)

    return session
  }

  /**
   * Validate an existing session.
   * Returns null if the session is invalid, expired, or revoked.
   */
  async validateSession(sessionId: string): Promise<AgentSession | null> {
    const session = await this.sessionRepo.findById(sessionId)
    if (session === null) return null
    if (session.status !== 'ACTIVE') return null
    if (new Date(session.expiresAt) < new Date()) return null

    // Update last activity
    await this.sessionRepo.updateLastActivity(sessionId)

    return session
  }

  /**
   * Invalidate a single session.
   */
  async invalidateSession(sessionId: string): Promise<void> {
    await this.sessionRepo.updateStatus(sessionId, 'REVOKED')
  }

  /**
   * Invalidate all sessions for an agent identity.
   */
  async invalidateAllSessions(agentIdentityId: string): Promise<void> {
    await this.sessionRepo.invalidateByAgentIdentity(agentIdentityId)
  }

  /**
   * Find and verify a credential by trying the API key against stored hashes.
   * Returns the credential and its agent identity if found.
   */
  private async findAndVerifyCredential(apiKey: string): Promise<{
    credential: AgentCredential
    agentIdentity: AgentIdentity
  } | null> {
    // In production, we'd use a more efficient approach:
    // - Store a credential lookup index (keyPrefix → credentialId)
    // - Or use a credential cache with TTL
    //
    // For now, we scan active credentials in the organization.
    // The keyPrefix stored in the credential helps narrow the search.

    const keyPrefix = apiKey.slice(0, 12) + '••••••'

    // Try to find credential by prefix
    const credential = await this.credentialRepo.findByKeyPrefix(keyPrefix)
    if (credential === null) return null

    // Verify the full key against the stored hash
    const isValid = this.hashService.verifyKey(apiKey, credential.keyHash)
    if (!isValid) return null

    // Load the agent identity
    const agentIdentity = await this.identityRepo.findById(credential.agentIdentityId)
    if (agentIdentity === null) return null

    return { credential, agentIdentity }
  }
}
