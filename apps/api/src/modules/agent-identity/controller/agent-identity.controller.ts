/* Agent Identity Controller — REST endpoints for agent management.

Provides:
  POST   /api/v1/agents                         — Create agent
  GET    /api/v1/agents                         — List agents
  GET    /api/v1/agents/:id                     — Get agent detail
  PATCH  /api/v1/agents/:id                     — Update agent
  POST   /api/v1/agents/:id/suspend             — Suspend agent
  POST   /api/v1/agents/:id/revoke              — Revoke agent
  POST   /api/v1/agents/:id/reactivate          — Reactivate agent
  POST   /api/v1/agents/:id/credentials         — Create credential
  POST   /api/v1/agents/:id/credentials/:cid/revoke — Revoke credential
  POST   /api/v1/agents/:id/credentials/:cid/rotate — Rotate credential
  GET    /api/v1/agents/:id/credentials         — List credentials
  GET    /api/v1/agents/:id/capabilities        — List capabilities
  POST   /api/v1/agents/:id/capabilities        — Grant capability
  DELETE /api/v1/agents/:id/capabilities/:cap   — Revoke capability
  GET    /api/v1/agents/me                      — Agent self-identity (API key auth)

Security: The global JwtAuthGuard enforces authentication and the user comes
from the verified JWT via @CurrentUser — no hardcoded principals. The
`/agents/me` endpoint authenticates with an agent API key instead of a JWT
and is marked @Public(). */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type {
  AuthenticatedUser,
  IdentityCapability,
  AgentIdentityStatus,
  AgentEnvironment,
} from '@contextgraph/types'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { Public } from '../../../common/decorators/public.decorator'
import { UnauthorizedException } from '../../../common/exceptions/unauthorized.exception'
import { AgentIdentityRegistry } from '../services/agent-identity-registry'
import { AgentCredentialService } from '../services/agent-credential.service'
import { AgentCapabilityService } from '../services/agent-capability.service'
import { AgentAuthService } from '../services/agent-auth.service'
import { CredentialHashService } from '../services/credential-hash.service'

@ApiBearerAuth()
@ApiTags('Agents')
@Controller('agents')
export class AgentIdentityController {
  constructor(
    private readonly registry: AgentIdentityRegistry,
    private readonly credentialService: AgentCredentialService,
    private readonly capabilityService: AgentCapabilityService,
    private readonly authService: AgentAuthService,
    private readonly hashService: CredentialHashService,
  ) {}

  @Post()
  async createAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      organizationId: string
      name: string
      slug: string
      description?: string
      purpose?: string
      environment: string
      ownerUserId?: string
    },
  ) {
    const agent = await this.registry.create(user, {
      organizationId: body.organizationId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      purpose: body.purpose,
      environment: body.environment as AgentEnvironment,
      ownerUserId: body.ownerUserId,
    })
    return { success: true, data: agent }
  }

  @Get()
  async listAgents(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('environment') environment?: string,
  ) {
    const agents = await this.registry.list(user.organizationId, {
      status: status as AgentIdentityStatus | undefined,
      environment: environment as AgentEnvironment | undefined,
    })

    return { success: true, data: agents }
  }

  @Get('count')
  async countAgents(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.registry.count(user.organizationId)
    return { success: true, data: { count } }
  }

  /** Agent self-identity — authenticated with the agent's API key, not a JWT. */
  @Public()
  @Get('me')
  async getAgentIdentity(headers: Record<string, string | undefined> = {}) {
    const apiKey = headers['x-api-key'] ?? headers['authorization']?.replace('Bearer ', '')
    if (apiKey === undefined)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'API key required' } }

    const session = await this.authService.authenticateApiKey(apiKey, headers)
    if (session === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }

    const agent = await this.registry.findById(session.agentIdentityId)
    const capabilities = await this.capabilityService.list(session.agentIdentityId)

    return {
      success: true,
      data: {
        agentIdentity: agent,
        organizationId: session.organizationId,
        environment: session.environment,
        capabilities,
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          lastActivityAt: session.lastActivityAt,
        },
      },
    }
  }

  @Get(':id')
  async getAgent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const agent = await this.registry.findById(id)
    if (agent === null)
      return { success: false, error: { code: 'NOT_FOUND', message: 'Agent not found' } }
    if (agent.organizationId !== user.organizationId)
      return { success: false, error: { code: 'FORBIDDEN', message: 'Wrong organization' } }

    return { success: true, data: agent }
  }

  @Patch(':id')
  async updateAgent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; purpose?: string; ownerUserId?: string },
  ) {
    const agent = await this.registry.update(user, id, body)
    return { success: true, data: agent }
  }

  @Post(':id/suspend')
  async suspendAgent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const agent = await this.registry.suspend(user, id)
    return { success: true, data: agent }
  }

  @Post(':id/revoke')
  async revokeAgent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const agent = await this.registry.revoke(user, id)
    return { success: true, data: agent }
  }

  @Post(':id/reactivate')
  async reactivateAgent(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const agent = await this.registry.reactivate(user, id)
    return { success: true, data: agent }
  }

  // ── Credentials ──────────────────────────────────────────────────────

  @Get(':id/credentials')
  async listCredentials(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.assertSameOrganization(user, id)
    const credentials = await this.credentialService.list(id)
    return { success: true, data: credentials }
  }

  @Post(':id/credentials')
  async createCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { name: string; expiresAt?: string },
  ) {
    const result = await this.credentialService.create(user, id, {
      name: body.name,
      expiresAt: body.expiresAt ?? undefined,
    })

    // Return the full key ONLY in this response — it will never be shown again
    return { success: true, data: result }
  }

  @Post(':id/credentials/:credentialId/revoke')
  async revokeCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('credentialId') credentialId: string,
  ) {
    await this.credentialService.revoke(user, id, credentialId)
    return { success: true, data: { revoked: true } }
  }

  @Post(':id/credentials/:credentialId/rotate')
  async rotateCredential(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('credentialId') credentialId: string,
  ) {
    const result = await this.credentialService.rotate(user, id, credentialId)
    return { success: true, data: result }
  }

  // ── Capabilities ────────────────────────────────────────────────────

  @Get(':id/capabilities')
  async listCapabilities(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.assertSameOrganization(user, id)
    const capabilities = await this.capabilityService.list(id)
    return { success: true, data: capabilities }
  }

  @Post(':id/capabilities')
  async grantCapability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { capability: IdentityCapability; expiresAt?: string },
  ) {
    const cap = await this.capabilityService.grant(
      user,
      id,
      body.capability,
      body.expiresAt ? new Date(body.expiresAt) : null,
    )
    return { success: true, data: cap }
  }

  @Delete(':id/capabilities/:capability')
  async revokeCapability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('capability') capability: string,
  ) {
    await this.capabilityService.revoke(user, id, capability as IdentityCapability)
    return { success: true, data: { revoked: true } }
  }

  /** Tenant guard for read paths that bypass the service-layer checks. */
  private async assertSameOrganization(user: AuthenticatedUser, agentId: string): Promise<void> {
    const agent = await this.registry.findById(agentId)
    if (agent !== null && agent.organizationId !== user.organizationId) {
      throw new UnauthorizedException('Agent belongs to a different organization')
    }
  }
}
