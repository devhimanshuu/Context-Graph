/* Agent Identity Registry — lifecycle management for agent identities.

Responsibilities:
- Create / update / suspend / revoke / archive agent identities
- Validate organization scope
- Prevent hard-deletion of identities with historical references
- Audit every lifecycle event */

import { Inject, Injectable } from '@nestjs/common'
import type {
  AgentIdentity,
  AgentIdentityStatus,
  AgentEnvironment,
  CreateAgentIdentityInput,
  UpdateAgentIdentityInput,
  AuthenticatedUser,
} from '@contextgraph/types'
import {
  IAgentIdentityRepository,
  IAgentSessionRepository,
} from '../domain/agent-identity.interfaces'
import { ForbiddenException } from '../../../common/exceptions/forbidden.exception'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'

@Injectable()
export class AgentIdentityRegistry {
  constructor(
    @Inject(IAgentIdentityRepository)
    private readonly repo: IAgentIdentityRepository,
    @Inject(IAgentSessionRepository)
    private readonly sessionRepo: IAgentSessionRepository,
  ) {}

  async findById(id: string): Promise<AgentIdentity | null> {
    return this.repo.findById(id)
  }

  async findBySlug(organizationId: string, slug: string): Promise<AgentIdentity | null> {
    return this.repo.findBySlug(organizationId, slug)
  }

  async list(
    organizationId: string,
    filters?: {
      status?: AgentIdentityStatus
      environment?: AgentEnvironment
    },
  ): Promise<AgentIdentity[]> {
    return this.repo.list(organizationId, filters)
  }

  async count(organizationId: string): Promise<number> {
    return this.repo.count(organizationId)
  }

  async create(actor: AuthenticatedUser, input: CreateAgentIdentityInput): Promise<AgentIdentity> {
    // Verify organization ownership
    if (input.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot create agent in another organization')
    }

    // Check slug uniqueness within org
    const existing = await this.repo.findBySlug(input.organizationId, input.slug)
    if (existing !== null) {
      throw new ForbiddenException('Agent slug already exists in this organization')
    }

    return this.repo.create(input)
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateAgentIdentityInput,
  ): Promise<AgentIdentity> {
    const agent = await this.repo.findById(id)
    if (agent === null) throw new NotFoundException('Agent not found')
    if (agent.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot update agent in another organization')
    }

    return this.repo.update(id, input)
  }

  async suspend(actor: AuthenticatedUser, id: string): Promise<AgentIdentity> {
    const agent = await this.repo.findById(id)
    if (agent === null) throw new NotFoundException('Agent not found')
    if (agent.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot suspend agent in another organization')
    }
    if (agent.status !== 'ACTIVE') {
      throw new ForbiddenException(`Cannot suspend agent in ${agent.status} state`)
    }

    // Invalidate all active sessions
    await this.sessionRepo.invalidateByAgentIdentity(id)

    return this.repo.updateStatus(id, 'SUSPENDED')
  }

  async revoke(actor: AuthenticatedUser, id: string): Promise<AgentIdentity> {
    const agent = await this.repo.findById(id)
    if (agent === null) throw new NotFoundException('Agent not found')
    if (agent.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot revoke agent in another organization')
    }

    // Invalidate all active sessions
    await this.sessionRepo.invalidateByAgentIdentity(id)

    return this.repo.updateStatus(id, 'REVOKED')
  }

  async reactivate(actor: AuthenticatedUser, id: string): Promise<AgentIdentity> {
    const agent = await this.repo.findById(id)
    if (agent === null) throw new NotFoundException('Agent not found')
    if (agent.organizationId !== actor.organizationId) {
      throw new ForbiddenException('Cannot reactivate agent in another organization')
    }
    if (agent.status !== 'SUSPENDED') {
      throw new ForbiddenException(`Cannot reactivate agent in ${agent.status} state`)
    }

    return this.repo.updateStatus(id, 'ACTIVE')
  }
}
