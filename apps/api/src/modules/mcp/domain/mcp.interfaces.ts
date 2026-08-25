/* MCP domain interfaces — DI tokens and abstract contracts for the MCP server adapter. */

import type {
  McpSession,
  McpToolDefinition,
  McpToolResult,
  McpAuditEvent,
} from '@contextgraph/types'

// ─── MCP Authenticator ───────────────────────────────────────────────────────

/**
 * Establishes the identity of the calling agent from MCP transport-level
 * credentials (headers, tokens, API keys). The authenticator is the ONLY
 * source of trusted identity — tool arguments are NEVER accepted as identity.
 */
export abstract class IMcpAuthenticator {
  /**
   * Authenticate an incoming MCP request and resolve the session.
   * Returns null if authentication fails (caller maps to appropriate error).
   */
  abstract authenticate(headers: Record<string, string | undefined>): Promise<McpSession | null>

  /** Check if this authenticator is safe for production use. */
  abstract isProductionSafe(): boolean
}

// ─── MCP Tool ────────────────────────────────────────────────────────────────

/**
 * The contract every MCP tool must implement. Tools are thin adapters over
 * existing application services — they never contain business logic.
 */
export abstract class IMcpTool {
  /** Tool metadata for registration and discovery. */
  abstract readonly definition: McpToolDefinition

  /** Execute the tool with validated input and an authenticated session. */
  abstract execute(
    session: McpSession,
    input: Record<string, unknown>,
    requestId: string,
  ): Promise<McpToolResult>
}

// ─── MCP Tool Registry ───────────────────────────────────────────────────────

/**
 * Central registry for MCP tools. Only explicitly registered tools can
 * be invoked — the registry is the authorization boundary for tool access.
 */
export abstract class IMcpToolRegistry {
  /** Register a tool. Throws if the tool name is already registered. */
  abstract register(tool: IMcpTool): void

  /** Get a tool by name. Returns undefined if not registered. */
  abstract get(name: string): IMcpTool | undefined

  /** Get all registered tools. */
  abstract getAll(): readonly IMcpTool[]

  /** Get tool definitions (safe for external exposure). */
  abstract getDefinitions(): readonly McpToolDefinition[]

  /** Check if a tool is registered. */
  abstract has(name: string): boolean
}

// ─── MCP Audit Logger ────────────────────────────────────────────────────────

/**
 * Records MCP tool invocations for audit trail. Every tool call must be
 * logged with session, outcome, and latency.
 */
export abstract class IMcpAuditLogger {
  abstract recordEvent(event: McpAuditEvent): Promise<void>
}

// ─── MCP Rate Limiter ────────────────────────────────────────────────────────

/**
 * Per-tool and per-session rate limiting. Different tools can have different
 * rate limits based on their cost and risk profile.
 */
export abstract class IMcpRateLimiter {
  /**
   * Check if the request is allowed under the rate limit.
   * Returns { allowed: true } or { allowed: false, retryAfterMs: number }.
   */
  abstract check(
    sessionId: string,
    toolName: string,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }>
}

// ─── MCP Observability ───────────────────────────────────────────────────────

/**
 * Tracks MCP-specific metrics: tool call counts, latency, errors,
 * authorization denials, rate limit events.
 */
export abstract class IMcpObservability {
  abstract recordToolCall(toolName: string, success: boolean, latencyMs: number): void
  abstract recordAuthDenial(toolName: string): void
  abstract recordRateLimit(toolName: string): void
  abstract recordError(toolName: string, errorType: string): void
}
