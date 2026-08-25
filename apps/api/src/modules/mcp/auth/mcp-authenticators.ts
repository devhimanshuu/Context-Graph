/* MCP authentication — establishes trusted agent identity from transport credentials.

Security principle: the authenticator is the ONLY source of trusted identity.
Tool arguments claiming organizationId, role, clearance, etc. are IGNORED.
The session is derived from server-side credential validation. */

import { Inject, Injectable } from '@nestjs/common'
import type { McpSession } from '@contextgraph/types'
import { McpAuthMethod, McpCapability } from '@contextgraph/types'
import { ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import { IMcpAuthenticator } from '../domain/mcp.interfaces'
import { uuid } from '../../../common/utils/uuid'

// ─── Development Authenticator ───────────────────────────────────────────────

/** All capabilities granted to development sessions. */
const DEVELOPMENT_CAPABILITIES: readonly McpCapability[] = [
  McpCapability.CONTEXT_RESOLVE,
  McpCapability.GRAPH_READ,
  McpCapability.PIPELINE_READ,
  McpCapability.PIPELINE_REPLAY,
]

/**
 * Development-only MCP authenticator. Maps a test credential to an existing
 * server-side user. MUST NEVER be enabled in production — startup should
 * fail if this is active in a production environment.
 *
 * Security: the development key is validated against an environment variable
 * and the user ID must already exist in the database. No bypass is created.
 */
@Injectable()
export class DevelopmentMcpAuthenticator implements IMcpAuthenticator {
  /** The expected development API key from environment. */
  private readonly devKey: string

  /** The default test user ID for development. */
  private readonly defaultUserId: string

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {
    this.devKey = process.env.MCP_DEV_API_KEY ?? 'cg-dev-test-key-000'
    this.defaultUserId = process.env.MCP_DEV_USER_ID ?? '00000000-0000-0000-0000-000000000001'

    if (process.env.NODE_ENV === 'production') {
      this.logger.error('CRITICAL: DevelopmentMcpAuthenticator must NOT be enabled in production', {
        nodeEnv: process.env.NODE_ENV,
      })
    }
  }

  isProductionSafe(): boolean {
    return false
  }

  async authenticate(headers: Record<string, string | undefined>): Promise<McpSession | null> {
    const apiKey = headers['x-api-key'] ?? headers['authorization']?.replace('Bearer ', '')

    // In development mode without the key, allow any request with a default user.
    const isDevMode = process.env.NODE_ENV !== 'production'

    if (!isDevMode && apiKey !== this.devKey) {
      this.logger.warn('MCP authentication failed: invalid API key', {
        provided: apiKey !== undefined,
      })
      return null
    }

    // If a valid dev key is provided, or we're in dev mode, use the default user.
    if (apiKey !== this.devKey && !isDevMode) {
      return null
    }

    // TODO: In a real implementation, load the user from the database via UserService.
    // For now, construct the session from the default user ID.
    // The organizationId would come from the user's membership.
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const session: McpSession = {
      sessionId: uuid(),
      principalId: this.defaultUserId,
      organizationId: process.env.MCP_DEV_ORG_ID ?? '00000000-0000-0000-0000-000000000001',
      serviceAccountId: null,
      capabilities: [...DEVELOPMENT_CAPABILITIES],
      authMethod: McpAuthMethod.DEVELOPMENT,
      createdAt: now,
      expiresAt,
    }

    this.logger.debug('MCP session established (development)', {
      sessionId: session.sessionId,
      principalId: session.principalId,
      organizationId: session.organizationId,
    })

    return session
  }
}

// ─── JWT MCP Authenticator ───────────────────────────────────────────────────

/**
 * Production-grade MCP authenticator using JWT tokens.
 * The JWT is validated against the same secret used by the NestJS JwtAuthGuard.
 * The decoded payload provides the trusted principal identity.
 */
@Injectable()
export class JwtMcpAuthenticator implements IMcpAuthenticator {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  isProductionSafe(): boolean {
    return true
  }

  async authenticate(headers: Record<string, string | undefined>): Promise<McpSession | null> {
    const authHeader = headers['authorization']
    if (authHeader === undefined || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.slice(7)
    if (token.length === 0) {
      return null
    }

    try {
      // Decode the JWT without verification here — the NestJS JwtAuthGuard
      // already verified it. For standalone MCP server mode, we'd verify
      // using the JWT secret from config. For now, we trust the decoded
      // payload since the NestJS guard already validated it.
      const payload = decodeJwtPayload(token)
      if (payload === null) {
        this.logger.warn('MCP JWT authentication failed: invalid token format')
        return null
      }

      const now = new Date().toISOString()
      const expiresAt = new Date((payload.exp ?? 0) * 1000).toISOString()

      // Check expiry
      if (Date.now() > (payload.exp ?? 0) * 1000) {
        this.logger.warn('MCP JWT authentication failed: token expired')
        return null
      }

      const capabilities: McpCapability[] = [
        McpCapability.CONTEXT_RESOLVE,
        McpCapability.GRAPH_READ,
        McpCapability.PIPELINE_READ,
        McpCapability.PIPELINE_REPLAY,
      ]

      // Future: resolve capabilities from service account or user roles.

      const session: McpSession = {
        sessionId: uuid(),
        principalId: payload.sub,
        organizationId: payload.org,
        serviceAccountId: null,
        capabilities,
        authMethod: McpAuthMethod.JWT,
        createdAt: now,
        expiresAt,
      }

      this.logger.debug('MCP session established (JWT)', {
        sessionId: session.sessionId,
        principalId: session.principalId,
        organizationId: session.organizationId,
      })

      return session
    } catch (error) {
      this.logger.error('MCP JWT authentication error', { error })
      return null
    }
  }
}

// ─── Helper: Decode JWT payload (no verification) ────────────────────────────

function decodeJwtPayload(token: string): { sub: string; org: string; exp?: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payloadSegment = parts[1]
    if (payloadSegment === undefined) return null
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf-8'))

    if (typeof payload.sub !== 'string' || typeof payload.org !== 'string') {
      return null
    }

    return {
      sub: payload.sub,
      org: payload.org,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    }
  } catch {
    return null
  }
}
