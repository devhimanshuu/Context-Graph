/* Specialized agent registry — manages capability isolation for workflow agents.

Each specialized agent has:
  - Explicit capabilities
  - Allowed tools
  - Execution limits
  - Input/output schemas

Agents are NOT self-configuring. The registry defines what each agent can do.
*/

import { Injectable } from '@nestjs/common'
import type { SpecializedAgentType, SpecializedAgentDefinition } from '@contextgraph/types'

@Injectable()
export class SpecializedAgentRegistry {
  private readonly agents = new Map<SpecializedAgentType, SpecializedAgentDefinition>()

  constructor() {
    this.registerDefaults()
  }

  get(type: SpecializedAgentType): SpecializedAgentDefinition | null {
    return this.agents.get(type) ?? null
  }

  getAll(): readonly SpecializedAgentDefinition[] {
    return [...this.agents.values()]
  }

  isToolAllowed(agentType: SpecializedAgentType, toolName: string): boolean {
    const agent = this.agents.get(agentType)
    if (!agent) return false
    return agent.allowedTools.includes(toolName)
  }

  hasCapability(agentType: SpecializedAgentType, capability: string): boolean {
    const agent = this.agents.get(agentType)
    if (!agent) return false
    return agent.capabilities.includes(capability)
  }

  private registerDefaults(): void {
    this.agents.set('RESEARCHER', {
      type: 'RESEARCHER',
      name: 'Research Agent',
      description: 'Discovers relevant information from the knowledge graph and document corpus',
      capabilities: ['CONTEXT_READ', 'GRAPH_READ', 'KNOWLEDGE_READ', 'DOCUMENT_READ'],
      allowedTools: ['context-search', 'graph-explore', 'knowledge-lookup'],
      maxIterations: 5,
      maxToolCalls: 10,
      maxTokens: 15_000,
      inputSchema: { query: 'string', scope: 'string?' },
      outputSchema: { findings: 'array', confidence: 'number', sources: 'array' },
    })

    this.agents.set('ANALYST', {
      type: 'ANALYST',
      name: 'Analysis Agent',
      description: 'Analyzes authorized information and extracts insights',
      capabilities: ['CONTEXT_READ', 'KNOWLEDGE_READ', 'CALCULATOR'],
      allowedTools: ['context-search', 'knowledge-lookup', 'calculator'],
      maxIterations: 3,
      maxToolCalls: 5,
      maxTokens: 10_000,
      inputSchema: { findings: 'array', task: 'string' },
      outputSchema: { analysis: 'string', confidence: 'number', keyInsights: 'array' },
    })

    this.agents.set('RETRIEVER', {
      type: 'RETRIEVER',
      name: 'Retrieval Agent',
      description: 'Retrieves specific context through hybrid search strategies',
      capabilities: ['CONTEXT_READ', 'GRAPH_READ'],
      allowedTools: ['context-search', 'graph-explore'],
      maxIterations: 3,
      maxToolCalls: 8,
      maxTokens: 8_000,
      inputSchema: { query: 'string', strategy: 'string', maxResults: 'number?' },
      outputSchema: { results: 'array', totalFound: 'number', strategy: 'string' },
    })

    this.agents.set('VERIFIER', {
      type: 'VERIFIER',
      name: 'Verification Agent',
      description: 'Verifies results against authorization policies and data quality rules',
      capabilities: ['CONTEXT_READ', 'POLICY_READ'],
      allowedTools: ['context-search', 'policy-check'],
      maxIterations: 2,
      maxToolCalls: 3,
      maxTokens: 5_000,
      inputSchema: { results: 'array', claims: 'array' },
      outputSchema: { verified: 'boolean', issues: 'array', confidence: 'number' },
    })

    this.agents.set('SYNTHESIZER', {
      type: 'SYNTHESIZER',
      name: 'Synthesis Agent',
      description: 'Produces the final coherent response from gathered analysis',
      capabilities: ['CONTEXT_READ'],
      allowedTools: ['context-search'],
      maxIterations: 2,
      maxToolCalls: 2,
      maxTokens: 12_000,
      inputSchema: { analysis: 'string', findings: 'array', requirements: 'string' },
      outputSchema: { response: 'string', citations: 'array', confidence: 'number' },
    })
  }
}
