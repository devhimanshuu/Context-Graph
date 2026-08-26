/* Agent Capability Service — manages explicit capability grants for agents.

Capabilities are operation-level permissions (context.resolve, graph.read, etc.).
They are separate from the Permission Engine's resource-level authorization.

Flow:
  Credential → authenticates → AgentIdentity → capabilities → Permission Engine

The Permission Engine remains the final authority for resource-level access. */

import { Inject, Injectable } from '@nestjs/common'
import type {
  AgentIdentityCapability,
  IdentityCapability,
  AuthenticatedUser,
} from '@contextgraph/types'
import {
  IAgentIdentityRepository,
  IAgentCapabilityRepository,
} from '../domain/agent-identity.interfaces'
import { ForbiddenException } from '../../../common/exceptions/forbidden.exception'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'

@Injectable()
export class AgentCapabilityService {
  constructor(
    @Inject(IAgentIdentityRepository)
    private readonly identityRepo: IAgentIdentityRepository,
    @Inject(IAgentCapabilityRepository)
    private readonly capabilityRepo: IAgentCapabilityRepository,
  ) {}

  async list(agentId: string): Promise<AgentIdentityCapability[]> {
    return this.capabilityRepo.list(agentId)
  }

  async listCapabilities(agentId: string): Promise<IdentityCapability[]> {
    return this.capabilityRepo.listCapabilities(agentId) as Promise<IdentityCapability[]>
  }

  async grant(
    actor: AuthenticatedUser,
    agentId: string,
    capability: IdentityCapability,
    expiresAt?: Date | null,
  ): Promise<AgentIdentityCapability> {
    const agent = await this.identityRepo.findById(agentId)
    if (agent === null) throw new NotFoundException('Agent not found')
    if (agent.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot grant capability to agent in another organization')
    }

    return this.capabilityRepo.grant({
      agentIdentityId: agentId,
      capability,
      grantedBy: actor.id,
      expiresAt,
    })
  }

  async revoke(
    actor: AuthenticatedUser,
    agentId: string,
    capability: IdentityCapability,
  ): Promise<void> {
    const agent = await this.identityRepo.findById(agentId)
    if (agent === null) throw new NotFoundException('Agent not found')
    if (agent.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot revoke capability from agent in another organization')
    }

    const existing = await this.capabilityRepo.find(agentId, capability)
    if (existing === null) throw new NotFoundException('Capability not found on this agent')

    await this.capabilityRepo.revoke(agentId, capability)
  }
}
