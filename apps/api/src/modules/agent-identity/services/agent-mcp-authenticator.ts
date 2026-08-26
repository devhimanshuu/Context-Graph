/* Production MCP Authenticator — uses AgentIdentity for credential-based authentication.

Flow:
  MCP Request → extract API key → AgentAuthService.authenticateApiKey() →
  → AgentSession → McpSession (for MCP tools)

This replaces the development authenticator in production.
It maintains the same IMcpAuthenticator interface. */

import { Inject, Injectable } from '@nestjs/common'
import type { McpSession } from '@contextgraph/types'
import { McpAuthMethod, McpCapability } from '@contextgraph/types'
import { ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import { IMcpAuthenticator } from '../../mcp/domain/mcp.interfaces'
import { AgentAuthService } from './agent-auth.service'

/** Mapping from IdentityCapability to McpCapability. */
const CAPABILITY_MAP: Record<string, McpCapability> = {
  'context.resolve': McpCapability.CONTEXT_RESOLVE,
  'graph.read': McpCapability.GRAPH_READ,
  'pipeline.read': McpCapability.PIPELINE_READ,
  'pipeline.replay': McpCapability.PIPELINE_REPLAY,
  'knowledge.propose': McpCapability.CONTEXT_RESOLVE, // knowledge.propose grants resolve
  'knowledge.read': McpCapability.CONTEXT_RESOLVE,
  'action.check': McpCapability.CONTEXT_RESOLVE,
  'events.subscribe': McpCapability.GRAPH_READ,
}

@Injectable()
export class AgentMcpAuthenticator implements IMcpAuthenticator {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly agentAuthService: AgentAuthService,
  ) {}

  isProductionSafe(): boolean {
    return true
  }

  async authenticate(headers: Record<string, string | undefined>): Promise<McpSession | null> {
    // Extract API key from headers
    const apiKey = headers['x-api-key'] ?? headers['authorization']?.replace('Bearer ', '')

    if (apiKey === undefined || apiKey.length === 0) {
      this.logger.debug('MCP authentication: no API key provided')
      return null
    }

    // Authenticate through the Agent Identity system
    const session = await this.agentAuthService.authenticateApiKey(apiKey, headers)

    if (session === null) {
      this.logger.warn('MCP authentication failed: invalid or revoked credential')
      return null
    }

    // Map identity capabilities to MCP capabilities
    const mcpCapabilities = session.capabilities
      .map((cap) => CAPABILITY_MAP[cap])
      .filter((cap): cap is McpCapability => cap !== undefined)

    // Ensure at least one capability
    if (mcpCapabilities.length === 0) {
      this.logger.warn('MCP authentication: agent has no MCP-compatible capabilities')
      return null
    }

    const now = new Date().toISOString()

    const mcpSession: McpSession = {
      sessionId: session.sessionId,
      principalId: session.agentIdentityId,
      organizationId: session.organizationId,
      serviceAccountId: session.agentIdentityId,
      capabilities: mcpCapabilities,
      authMethod: McpAuthMethod.API_KEY,
      createdAt: now,
      expiresAt: session.expiresAt,
    }

    this.logger.debug('MCP session established (agent identity)', {
      sessionId: mcpSession.sessionId,
      principalId: mcpSession.principalId,
      organizationId: mcpSession.organizationId,
      environment: session.environment,
      capabilities: mcpCapabilities,
    })

    return mcpSession
  }
}
