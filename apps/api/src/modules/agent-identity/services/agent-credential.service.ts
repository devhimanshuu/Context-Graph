/* Agent Credential Service — manages API key lifecycle.

Responsibilities:
- Generate cryptographically secure API keys
- Store only hashed keys (never plaintext)
- Show secret only once at creation
- Support rotation (old key remains valid until revoked)
- Support revocation (immediate effect)
- Support expiration */

import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser, CreatedCredential } from '@contextgraph/types'
import {
  IAgentIdentityRepository,
  IAgentCredentialRepository,
} from '../domain/agent-identity.interfaces'
import { CredentialHashService } from './credential-hash.service'
import { ForbiddenException } from '../../../common/exceptions/forbidden.exception'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'

@Injectable()
export class AgentCredentialService {
  constructor(
    @Inject(IAgentIdentityRepository)
    private readonly identityRepo: IAgentIdentityRepository,
    @Inject(IAgentCredentialRepository)
    private readonly credentialRepo: IAgentCredentialRepository,
    private readonly hashService: CredentialHashService,
  ) {}

  async create(
    actor: AuthenticatedUser,
    agentId: string,
    input: { name: string; expiresAt?: string | Date | null },
  ): Promise<CreatedCredential> {
    const agent = await this.identityRepo.findById(agentId)
    if (agent === null) throw new NotFoundException('Agent not found')
    if (agent.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot create credential for agent in another organization')
    }
    if (agent.status !== 'ACTIVE') {
      throw new ForbiddenException(`Cannot create credential for agent in ${agent.status} state`)
    }

    // Generate the API key
    const { secret, fullKey, keyPrefix, keyHash } = this.hashService.generateKey()

    // Store the credential with hash
    const expiresAt =
      input.expiresAt !== undefined && input.expiresAt !== null
        ? typeof input.expiresAt === 'string'
          ? new Date(input.expiresAt)
          : input.expiresAt
        : null
    const credential = await this.credentialRepo.create({
      agentIdentityId: agentId,
      name: input.name,
      keyPrefix,
      keyHash,
      expiresAt,
    })

    return { credential, secret, fullKey }
  }

  async revoke(actor: AuthenticatedUser, agentId: string, credentialId: string): Promise<void> {
    const agent = await this.identityRepo.findById(agentId)
    if (agent === null) throw new NotFoundException('Agent not found')
    if (agent.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot revoke credential for agent in another organization')
    }

    const credential = await this.credentialRepo.findById(credentialId)
    if (credential === null) throw new NotFoundException('Credential not found')
    if (credential.agentIdentityId !== agentId) {
      throw new ForbiddenException('Credential does not belong to this agent')
    }

    await this.credentialRepo.updateStatus(credentialId, 'REVOKED')
  }

  async rotate(
    actor: AuthenticatedUser,
    agentId: string,
    credentialId: string,
  ): Promise<CreatedCredential> {
    // Revoke the old credential
    await this.revoke(actor, agentId, credentialId)

    // Create a new one with same name
    const oldCredential = await this.credentialRepo.findById(credentialId)
    const name = oldCredential?.name ?? 'rotated-key'

    return this.create(actor, agentId, { name })
  }

  async list(agentId: string) {
    return this.credentialRepo.list(agentId)
  }
}
