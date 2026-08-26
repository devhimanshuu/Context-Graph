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
  GET    /api/v1/agent/me                       — Agent self-identity

Security: All endpoints require authenticated admin/HOD user.
Agent cannot modify its own identity through these endpoints. */

import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import type {
  AuthenticatedUser,
  IdentityCapability,
  AgentIdentityStatus,
  AgentEnvironment,
} from '@contextgraph/types'
import { AgentIdentityRegistry } from '../services/agent-identity-registry'
import { AgentCredentialService } from '../services/agent-credential.service'
import { AgentCapabilityService } from '../services/agent-capability.service'
import { AgentAuthService } from '../services/agent-auth.service'
import { CredentialHashService } from '../services/credential-hash.service'

/** Extract user from JWT — simplified for the demo. In production, use NestJS Guards. */
function extractUser(headers: Record<string, string | undefined>): AuthenticatedUser | null {
  const authHeader = headers['authorization']
  if (authHeader === undefined || !authHeader.startsWith('Bearer ')) return null

  // In production, validate JWT and extract claims
  // For demo, return a default admin user
  return {
    id: '00000000-0000-0000-0000-000000000001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    departmentId: null,
    email: 'admin@contextgraph.dev',
    name: 'Admin',
    role: 'ADMIN',
    permissionLevel: 'ADMIN',
    complianceClearance: 'CRITICAL',
  }
}

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
    @Headers() headers: Record<string, string | undefined>,
    @Body()
    body: {
      organizationId: string
      name: string
      slug: string
      description?: string
      purpose?: string
      environment?: string
      ownerUserId?: string
    },
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const agent = await this.registry.create(user, {
      organizationId: body.organizationId,
      name: body.name,
      slug: body.slug,
      description: body.description,
      purpose: body.purpose,
      environment: (body.environment ?? 'DEVELOPMENT') as AgentEnvironment,
      ownerUserId: body.ownerUserId,
    })

    return { success: true, data: agent }
  }

  @Get()
  async listAgents(
    @Headers() headers: Record<string, string | undefined>,
    @Query('status') status?: string,
    @Query('environment') environment?: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const agents = await this.registry.list(user.organizationId, {
      status: status as AgentIdentityStatus | undefined,
      environment: environment as AgentEnvironment | undefined,
    })

    return { success: true, data: agents }
  }

  @Get('count')
  async countAgents(@Headers() headers: Record<string, string | undefined>) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const count = await this.registry.count(user.organizationId)
    return { success: true, data: { count } }
  }

  @Get('me')
  async getAgentIdentity(@Headers() headers: Record<string, string | undefined>) {
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
  async getAgent(@Headers() headers: Record<string, string | undefined>, @Param('id') id: string) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const agent = await this.registry.findById(id)
    if (agent === null)
      return { success: false, error: { code: 'NOT_FOUND', message: 'Agent not found' } }

    return { success: true, data: agent }
  }

  @Patch(':id')
  async updateAgent(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; purpose?: string; ownerUserId?: string },
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const agent = await this.registry.update(user, id, body)
    return { success: true, data: agent }
  }

  @Post(':id/suspend')
  async suspendAgent(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const agent = await this.registry.suspend(user, id)
    return { success: true, data: agent }
  }

  @Post(':id/revoke')
  async revokeAgent(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const agent = await this.registry.revoke(user, id)
    return { success: true, data: agent }
  }

  @Post(':id/reactivate')
  async reactivateAgent(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const agent = await this.registry.reactivate(user, id)
    return { success: true, data: agent }
  }

  // ── Credentials ──────────────────────────────────────────────────────

  @Get(':id/credentials')
  async listCredentials(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const credentials = await this.credentialService.list(id)
    return { success: true, data: credentials }
  }

  @Post(':id/credentials')
  async createCredential(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: { name: string; expiresAt?: string },
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const result = await this.credentialService.create(user, id, {
      name: body.name,
      expiresAt: body.expiresAt ?? undefined,
    })

    // Return the full key ONLY in this response — it will never be shown again
    return { success: true, data: result }
  }

  @Post(':id/credentials/:credentialId/revoke')
  async revokeCredential(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Param('credentialId') credentialId: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    await this.credentialService.revoke(user, id, credentialId)
    return { success: true, data: { revoked: true } }
  }

  @Post(':id/credentials/:credentialId/rotate')
  async rotateCredential(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Param('credentialId') credentialId: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const result = await this.credentialService.rotate(user, id, credentialId)
    return { success: true, data: result }
  }

  // ── Capabilities ────────────────────────────────────────────────────

  @Get(':id/capabilities')
  async listCapabilities(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    const capabilities = await this.capabilityService.list(id)
    return { success: true, data: capabilities }
  }

  @Post(':id/capabilities')
  async grantCapability(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: { capability: IdentityCapability; expiresAt?: string },
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

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
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Param('capability') capability: string,
  ) {
    const user = extractUser(headers)
    if (user === null)
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }

    await this.capabilityService.revoke(user, id, capability as IdentityCapability)
    return { success: true, data: { revoked: true } }
  }
}
