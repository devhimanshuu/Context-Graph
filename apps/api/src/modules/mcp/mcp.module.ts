/* MCP module — wires the MCP server adapter into the NestJS application.

The module registers:
  - Authentication (development + JWT authenticators)
  - Tool registry with all 4 Phase 9 tools
  - Rate limiter, audit logger, observability
  - Request handler (central orchestrator)
  - Controller (HTTP transport)

Security: The module does NOT contain business logic. It only provides
DI wiring and tool registration. All authorization is delegated to
existing ContextGraph engines. */

import { Module, OnModuleInit } from '@nestjs/common'
import { McpController } from './mcp.controller'
import { McpToolRegistry } from './registry/mcp-tool-registry'
import {
  McpRequestHandler,
  MCP_AUTHENTICATOR,
  MCP_TOOL_REGISTRY,
  MCP_RATE_LIMITER,
  MCP_AUDIT_LOGGER,
  MCP_OBSERVABILITY,
} from './services/mcp-request-handler'
import { DevelopmentMcpAuthenticator, JwtMcpAuthenticator } from './auth/mcp-authenticators'
import { McpObservability } from './services/mcp-observability'
import { McpRateLimiter } from './services/mcp-rate-limiter'
import { McpAuditLogger } from './services/mcp-audit-logger'
import { ResolveContextTool } from './tools/resolve-context.tool'
import { GetSubgraphTool } from './tools/get-subgraph.tool'
import { GetRunTool } from './tools/get-run.tool'
import { ReplayRunTool } from './tools/replay-run.tool'
import { CheckActionTool } from './tools/check-action.tool'
import { ProposeNodeTool } from './tools/propose-node.tool'
import { IMcpToolRegistry } from './domain/mcp.interfaces'
import { PipelineModule } from '../pipeline/pipeline.module'
import { GraphModule } from '../graph/graph.module'
import { GuardrailsModule } from '../guardrails/guardrails.module'
import { WriteBackModule } from '../writeback/writeback.module'
import { AgentIdentityModule } from '../agent-identity/agent-identity.module'
import { AgentMcpAuthenticator } from '../agent-identity/services/agent-mcp-authenticator'

/**
 * Selects the appropriate authenticator based on environment.
 * In production, only JWT authentication is allowed.
 */
function createAuthenticator() {
  const isProduction = process.env.NODE_ENV === 'production'
  if (isProduction) {
    // Phase 14: Use the production agent identity authenticator.
    return AgentMcpAuthenticator
  }
  // In development, use the development authenticator.
  return DevelopmentMcpAuthenticator
}

@Module({
  imports: [PipelineModule, GraphModule, GuardrailsModule, WriteBackModule, AgentIdentityModule],
  controllers: [McpController],
  providers: [
    // Registry (as abstract class + token for handler injection).
    { provide: IMcpToolRegistry, useClass: McpToolRegistry },
    { provide: MCP_TOOL_REGISTRY, useExisting: IMcpToolRegistry },

    // Authentication.
    // In production, use AgentMcpAuthenticator (Phase 14 agent identity system).
    // In development, fall back to the development authenticator.
    { provide: MCP_AUTHENTICATOR, useClass: createAuthenticator() },
    DevelopmentMcpAuthenticator,
    JwtMcpAuthenticator,
    AgentMcpAuthenticator,

    // Infrastructure services.
    { provide: MCP_RATE_LIMITER, useClass: McpRateLimiter },
    { provide: MCP_AUDIT_LOGGER, useClass: McpAuditLogger },
    { provide: MCP_OBSERVABILITY, useClass: McpObservability },

    // Request handler.
    McpRequestHandler,

    // Tools.
    ResolveContextTool,
    GetSubgraphTool,
    GetRunTool,
    ReplayRunTool,
    CheckActionTool,
    ProposeNodeTool,
  ],
})
export class McpModule implements OnModuleInit {
  constructor(
    private readonly registry: McpToolRegistry,
    private readonly resolveContextTool: ResolveContextTool,
    private readonly getSubgraphTool: GetSubgraphTool,
    private readonly getRunTool: GetRunTool,
    private readonly replayRunTool: ReplayRunTool,
    private readonly checkActionTool: CheckActionTool,
    private readonly proposeNodeTool: ProposeNodeTool,
  ) {}

  onModuleInit(): void {
    // Auto-register all Phase 9 + Phase 10 + Phase 11 tools.
    this.registry.register(this.resolveContextTool)
    this.registry.register(this.getSubgraphTool)
    this.registry.register(this.getRunTool)
    this.registry.register(this.replayRunTool)
    this.registry.register(this.checkActionTool)
    this.registry.register(this.proposeNodeTool)
  }
}
