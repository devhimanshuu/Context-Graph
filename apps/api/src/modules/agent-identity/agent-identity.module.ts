/* Agent Identity Module — Phase 14 composition boundary.

Provides:
- Agent identity CRUD and lifecycle management
- Secure credential management (hashing, rotation, revocation)
- Capability management
- Session management
- Production MCP authenticator
- REST endpoints for agent management

Dependencies:
- Logger (for audit and observability)
- No business logic dependencies on other modules

This module is imported by:
- McpModule (for production authentication)
- AppModule (for REST endpoints) */

import { Module } from '@nestjs/common'

// Repositories
import {
  AgentIdentityPrismaRepository,
  AgentCredentialPrismaRepository,
  AgentCapabilityPrismaRepository,
  AgentSessionPrismaRepository,
} from './repository/agent-identity.repository'

// DI Tokens
import {
  IAgentIdentityRepository,
  IAgentCredentialRepository,
  IAgentCapabilityRepository,
  IAgentSessionRepository,
} from './domain/agent-identity.interfaces'

// Services
import { CredentialHashService } from './services/credential-hash.service'
import { AgentIdentityRegistry } from './services/agent-identity-registry'
import { AgentCredentialService } from './services/agent-credential.service'
import { AgentCapabilityService } from './services/agent-capability.service'
import { AgentAuthService } from './services/agent-auth.service'
import { AgentMcpAuthenticator } from './services/agent-mcp-authenticator'

// Controller
import { AgentIdentityController } from './controller/agent-identity.controller'

@Module({
  controllers: [AgentIdentityController],
  providers: [
    // Repositories
    { provide: IAgentIdentityRepository, useClass: AgentIdentityPrismaRepository },
    { provide: IAgentCredentialRepository, useClass: AgentCredentialPrismaRepository },
    { provide: IAgentCapabilityRepository, useClass: AgentCapabilityPrismaRepository },
    { provide: IAgentSessionRepository, useClass: AgentSessionPrismaRepository },

    // Services
    CredentialHashService,
    AgentIdentityRegistry,
    AgentCredentialService,
    AgentCapabilityService,
    AgentAuthService,
    AgentMcpAuthenticator,
  ],
  exports: [
    AgentIdentityRegistry,
    AgentCredentialService,
    AgentCapabilityService,
    AgentAuthService,
    AgentMcpAuthenticator,
    CredentialHashService,
    IAgentIdentityRepository,
    IAgentCredentialRepository,
    IAgentCapabilityRepository,
    IAgentSessionRepository,
  ],
})
export class AgentIdentityModule {}
