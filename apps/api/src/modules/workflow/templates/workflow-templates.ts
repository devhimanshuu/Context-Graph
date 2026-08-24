/* Workflow templates — pre-built workflow definitions for common enterprise patterns.

These templates provide starting points that users can customize.
Templates are NOT executable — they must be customized and published.
*/

import type { WorkflowNode, WorkflowEdge, WorkflowExecutionPolicy } from '@contextgraph/types'
import { DEFAULT_RETRY_POLICY } from '@contextgraph/types'

interface WorkflowTemplate {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly nodes: readonly WorkflowNode[]
  readonly edges: readonly WorkflowEdge[]
  readonly executionPolicy: WorkflowExecutionPolicy
}

const START_NODE_ID = 'start-node'
const END_NODE_ID = 'end-node'

function startEnd(): { start: WorkflowNode; end: WorkflowNode } {
  return {
    start: {
      nodeId: START_NODE_ID,
      type: 'START',
      name: 'Start',
      configuration: {},
      dependencies: [],
      timeoutMs: 0,
      retryPolicy: DEFAULT_RETRY_POLICY,
      failurePolicy: 'FAIL_WORKFLOW',
    },
    end: {
      nodeId: END_NODE_ID,
      type: 'END',
      name: 'End',
      configuration: {},
      dependencies: [],
      timeoutMs: 0,
      retryPolicy: DEFAULT_RETRY_POLICY,
      failurePolicy: 'FAIL_WORKFLOW',
    },
  }
}

// ---------------------------------------------------------------------------
// Enterprise Research Workflow
// ---------------------------------------------------------------------------

const ENTERPRISE_RESEARCH_NODES: WorkflowNode[] = (() => {
  const { start, end } = startEnd()
  return [
    start,
    {
      nodeId: 'parallel-search',
      type: 'PARALLEL',
      name: 'Start Parallel Search',
      configuration: {},
      dependencies: [START_NODE_ID],
      timeoutMs: 5_000,
      retryPolicy: DEFAULT_RETRY_POLICY,
      failurePolicy: 'FAIL_WORKFLOW',
    },
    {
      nodeId: 'graph-search',
      type: 'CONTEXT_REQUEST',
      name: 'Graph Search',
      configuration: { query: '${input.query}', strategy: 'GRAPH', maxCandidates: 20 },
      dependencies: ['parallel-search'],
      timeoutMs: 30_000,
      retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
      failurePolicy: 'SKIP_NODE',
    },
    {
      nodeId: 'semantic-search',
      type: 'CONTEXT_REQUEST',
      name: 'Semantic Search',
      configuration: { query: '${input.query}', strategy: 'SEMANTIC', maxCandidates: 20 },
      dependencies: ['parallel-search'],
      timeoutMs: 30_000,
      retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
      failurePolicy: 'SKIP_NODE',
    },
    {
      nodeId: 'merge-search',
      type: 'MERGE',
      name: 'Merge Search Results',
      configuration: { strategy: 'ALL_REQUIRED' },
      dependencies: ['graph-search', 'semantic-search'],
      timeoutMs: 5_000,
      retryPolicy: DEFAULT_RETRY_POLICY,
      failurePolicy: 'FAIL_WORKFLOW',
    },
    {
      nodeId: 'research-agent',
      type: 'AGENT',
      name: 'Research Agent',
      configuration: {
        agentType: 'RESEARCHER',
        task: 'Analyze the retrieved context and identify the most relevant findings',
        systemPrompt:
          'You are a research analyst. Analyze the provided context and produce structured findings.',
        maxIterations: 5,
      },
      dependencies: ['merge-search'],
      timeoutMs: 60_000,
      retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
      failurePolicy: 'FAIL_WORKFLOW',
    },
    {
      nodeId: 'analysis-agent',
      type: 'AGENT',
      name: 'Analysis Agent',
      configuration: {
        agentType: 'ANALYST',
        task: 'Produce a comprehensive analysis based on the research findings',
        systemPrompt: 'You are a senior analyst. Produce a thorough, well-structured analysis.',
        maxIterations: 3,
      },
      dependencies: ['research-agent'],
      timeoutMs: 60_000,
      retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
      failurePolicy: 'FAIL_WORKFLOW',
    },
    {
      nodeId: 'verify-results',
      type: 'VERIFICATION',
      name: 'Verify Results',
      configuration: {
        checks: ['output_exists', 'sources_authorized', 'policy_compliant'],
      },
      dependencies: ['analysis-agent'],
      timeoutMs: 10_000,
      retryPolicy: DEFAULT_RETRY_POLICY,
      failurePolicy: 'WAIT_FOR_HUMAN',
    },
    {
      nodeId: 'confidence-check',
      type: 'CONDITION',
      name: 'Confidence Check',
      configuration: {
        condition: JSON.stringify({ field: 'confidence', operator: '>=', value: 0.7 }),
        trueBranchTarget: END_NODE_ID,
        falseBranchTarget: null,
      },
      dependencies: ['verify-results'],
      timeoutMs: 1_000,
      retryPolicy: DEFAULT_RETRY_POLICY,
      failurePolicy: 'FAIL_WORKFLOW',
    },
    end,
  ]
})()

const ENTERPRISE_RESEARCH_EDGES: WorkflowEdge[] = [
  {
    edgeId: 'e-start-parallel',
    sourceNodeId: START_NODE_ID,
    targetNodeId: 'parallel-search',
    condition: null,
  },
  {
    edgeId: 'e-parallel-graph',
    sourceNodeId: 'parallel-search',
    targetNodeId: 'graph-search',
    condition: null,
  },
  {
    edgeId: 'e-parallel-semantic',
    sourceNodeId: 'parallel-search',
    targetNodeId: 'semantic-search',
    condition: null,
  },
  {
    edgeId: 'e-graph-merge',
    sourceNodeId: 'graph-search',
    targetNodeId: 'merge-search',
    condition: null,
  },
  {
    edgeId: 'e-semantic-merge',
    sourceNodeId: 'semantic-search',
    targetNodeId: 'merge-search',
    condition: null,
  },
  {
    edgeId: 'e-merge-research',
    sourceNodeId: 'merge-search',
    targetNodeId: 'research-agent',
    condition: null,
  },
  {
    edgeId: 'e-research-analysis',
    sourceNodeId: 'research-agent',
    targetNodeId: 'analysis-agent',
    condition: null,
  },
  {
    edgeId: 'e-analysis-verify',
    sourceNodeId: 'analysis-agent',
    targetNodeId: 'verify-results',
    condition: null,
  },
  {
    edgeId: 'e-verify-condition',
    sourceNodeId: 'verify-results',
    targetNodeId: 'confidence-check',
    condition: null,
  },
  {
    edgeId: 'e-condition-end',
    sourceNodeId: 'confidence-check',
    targetNodeId: END_NODE_ID,
    condition: null,
  },
]

// ---------------------------------------------------------------------------
// Document Analysis Workflow
// ---------------------------------------------------------------------------

const DOCUMENT_ANALYSIS_NODES: WorkflowNode[] = (() => {
  const { start, end } = startEnd()
  return [
    start,
    {
      nodeId: 'extract',
      type: 'TOOL',
      name: 'Extract Content',
      configuration: { toolName: 'context-search', input: { query: '${input.documentId}' } },
      dependencies: [START_NODE_ID],
      timeoutMs: 30_000,
      retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 3 },
      failurePolicy: 'FAIL_WORKFLOW',
    },
    {
      nodeId: 'analyze-agent',
      type: 'AGENT',
      name: 'Document Analysis Agent',
      configuration: {
        agentType: 'ANALYST',
        task: 'Analyze the extracted document content and identify key knowledge entities',
        systemPrompt:
          'You are a document analysis expert. Extract key facts, constraints, and decisions.',
        maxIterations: 3,
      },
      dependencies: ['extract'],
      timeoutMs: 60_000,
      retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
      failurePolicy: 'FAIL_WORKFLOW',
    },
    {
      nodeId: 'verify-doc',
      type: 'VERIFICATION',
      name: 'Verify Document Quality',
      configuration: {
        checks: ['output_exists', 'policy_compliant'],
      },
      dependencies: ['analyze-agent'],
      timeoutMs: 10_000,
      retryPolicy: DEFAULT_RETRY_POLICY,
      failurePolicy: 'SKIP_NODE',
    },
    end,
  ]
})()

const DOCUMENT_ANALYSIS_EDGES: WorkflowEdge[] = [
  {
    edgeId: 'e-start-extract',
    sourceNodeId: START_NODE_ID,
    targetNodeId: 'extract',
    condition: null,
  },
  {
    edgeId: 'e-extract-analyze',
    sourceNodeId: 'extract',
    targetNodeId: 'analyze-agent',
    condition: null,
  },
  {
    edgeId: 'e-analyze-verify',
    sourceNodeId: 'analyze-agent',
    targetNodeId: 'verify-doc',
    condition: null,
  },
  {
    edgeId: 'e-verify-end',
    sourceNodeId: 'verify-doc',
    targetNodeId: END_NODE_ID,
    condition: null,
  },
]

// ---------------------------------------------------------------------------
// Exported templates
// ---------------------------------------------------------------------------

export const WORKFLOW_TEMPLATES: readonly WorkflowTemplate[] = [
  {
    id: 'enterprise-research',
    name: 'Enterprise Research Workflow',
    description: 'Multi-source research with parallel retrieval, analysis, and verification',
    category: 'Research',
    nodes: ENTERPRISE_RESEARCH_NODES,
    edges: ENTERPRISE_RESEARCH_EDGES,
    executionPolicy: {
      maxNodes: 20,
      maxParallelNodes: 5,
      maxAgentCalls: 5,
      maxToolCalls: 20,
      maxIterations: 20,
      maxTokens: 50_000,
      maxCost: 5.0,
      maxDurationMs: 300_000,
    },
  },
  {
    id: 'document-analysis',
    name: 'Document Analysis Workflow',
    description: 'Extract, analyze, and verify knowledge from documents',
    category: 'Ingestion',
    nodes: DOCUMENT_ANALYSIS_NODES,
    edges: DOCUMENT_ANALYSIS_EDGES,
    executionPolicy: {
      maxNodes: 10,
      maxParallelNodes: 2,
      maxAgentCalls: 3,
      maxToolCalls: 10,
      maxIterations: 10,
      maxTokens: 30_000,
      maxCost: 2.0,
      maxDurationMs: 180_000,
    },
  },
  {
    id: 'knowledge-investigation',
    name: 'Knowledge Investigation Workflow',
    description: 'Investigate knowledge gaps and verify claims across the knowledge graph',
    category: 'Quality',
    nodes: (() => {
      const { start, end } = startEnd()
      return [
        start,
        {
          nodeId: 'graph-explore',
          type: 'TOOL',
          name: 'Explore Knowledge Graph',
          configuration: { toolName: 'graph-explore', input: { query: '${input.topic}' } },
          dependencies: [START_NODE_ID],
          timeoutMs: 15_000,
          retryPolicy: DEFAULT_RETRY_POLICY,
          failurePolicy: 'FAIL_WORKFLOW',
        },
        {
          nodeId: 'retrieve-context',
          type: 'CONTEXT_REQUEST',
          name: 'Retrieve Context',
          configuration: { query: '${input.topic}', strategy: 'HYBRID', maxCandidates: 15 },
          dependencies: ['graph-explore'],
          timeoutMs: 20_000,
          retryPolicy: DEFAULT_RETRY_POLICY,
          failurePolicy: 'FAIL_WORKFLOW',
        },
        {
          nodeId: 'verify-agent',
          type: 'AGENT',
          name: 'Verification Agent',
          configuration: {
            agentType: 'VERIFIER',
            task: 'Verify the consistency and accuracy of the knowledge retrieved',
            systemPrompt: 'You are a knowledge quality expert. Identify inconsistencies and gaps.',
            maxIterations: 2,
          },
          dependencies: ['retrieve-context'],
          timeoutMs: 45_000,
          retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
          failurePolicy: 'SKIP_NODE',
        },
        end,
      ]
    })(),
    edges: [
      {
        edgeId: 'ei-start',
        sourceNodeId: START_NODE_ID,
        targetNodeId: 'graph-explore',
        condition: null,
      },
      {
        edgeId: 'ei-explore-ctx',
        sourceNodeId: 'graph-explore',
        targetNodeId: 'retrieve-context',
        condition: null,
      },
      {
        edgeId: 'ei-ctx-verify',
        sourceNodeId: 'retrieve-context',
        targetNodeId: 'verify-agent',
        condition: null,
      },
      {
        edgeId: 'ei-verify-end',
        sourceNodeId: 'verify-agent',
        targetNodeId: END_NODE_ID,
        condition: null,
      },
    ],
    executionPolicy: {
      maxNodes: 10,
      maxParallelNodes: 3,
      maxAgentCalls: 3,
      maxToolCalls: 10,
      maxIterations: 15,
      maxTokens: 30_000,
      maxCost: 3.0,
      maxDurationMs: 200_000,
    },
  },
]
