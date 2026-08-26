/* Reference Agents Module — wires the reference multi-agent system.

Provides:
- 4 reference agents (research, analysis, decision, synthesis)
- Lightweight supervisor/orchestrator
- Agent identity registry
- REST API endpoints

Dependencies:
- PipelineModule (for context retrieval)
- GuardrailsModule (for action check)
- WriteBackModule (for governed proposals)

This module demonstrates how external agents consume ContextGraph.
ContextGraph remains independent of any agent framework. */

import { Module } from '@nestjs/common'
import { PipelineModule } from '../pipeline/pipeline.module'
import { GuardrailsModule } from '../guardrails/guardrails.module'
import { WriteBackModule } from '../writeback/writeback.module'
import { ReferenceAgentsController } from './controller/reference-agents.controller'
import {
  ReferenceAgentRegistryService,
  AgentIdentityProvider,
} from './services/agent-registry.service'

@Module({
  imports: [PipelineModule, GuardrailsModule, WriteBackModule],
  controllers: [ReferenceAgentsController],
  providers: [AgentIdentityProvider, ReferenceAgentRegistryService],
  exports: [ReferenceAgentRegistryService, AgentIdentityProvider],
})
export class ReferenceAgentsModule {}
