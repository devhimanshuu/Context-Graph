'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Copy,
  CheckCircle,
  Terminal,
  Key,
  Server,
  Wrench,
  Zap,
  ChevronDown,
  ChevronRight,
  Code,
  Shield,
  ArrowRight,
} from 'lucide-react'

interface StepSectionProps {
  number: number
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
}

function StepSection({
  number,
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: StepSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
          {number}
        </div>
        <Icon className="text-muted-foreground h-4 w-4" />
        <span className="flex-1 text-sm font-medium">{title}</span>
        {open ? (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        )}
      </button>
      {open && <div className="border-t px-4 pt-3 pb-4">{children}</div>}
    </div>
  )
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="group relative">
      {label && (
        <div className="text-muted-foreground mb-1 flex items-center justify-between text-[10px]">
          <span className="font-medium">{label}</span>
          <button onClick={handleCopy} className="hover:text-foreground flex items-center gap-1">
            {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <pre className="bg-muted/50 overflow-x-auto rounded-md border p-3 font-mono text-[11px] leading-relaxed">
        {code}
      </pre>
    </div>
  )
}

export function ConnectionGuidePanel() {
  const apiBase = 'http://localhost:3001/api/v1'
  const mcpBase = `${apiBase}/mcp`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">Connect Your Agent</h3>
        <Badge variant="outline" className="text-[10px]">
          Guide
        </Badge>
      </div>
      <p className="text-muted-foreground text-xs">
        Step-by-step guide to connect an MCP-compatible AI agent or client to ContextGraph. The MCP
        server exposes governed context retrieval, graph exploration, action guardrails, and
        knowledge proposals through a standard JSON-RPC interface.
      </p>

      <div className="space-y-3">
        {/* Step 1: Start ContextGraph */}
        <StepSection number={1} title="Start ContextGraph API" icon={Server}>
          <p className="text-muted-foreground mb-3 text-xs">
            The MCP server runs as part of the ContextGraph NestJS API. Start it normally:
          </p>
          <CodeBlock
            label="Terminal"
            code={`# From the project root
cd apps/api
npm run dev

# The API starts on http://localhost:3001
# The MCP endpoint is at ${mcpBase}`}
          />
          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" asChild>
              <a href={`${mcpBase}/health`} target="_blank" rel="noreferrer">
                <Zap className="h-3 w-3" />
                Health Check: /api/v1/mcp/health
              </a>
            </Button>
          </div>
        </StepSection>

        {/* Step 2: Authenticate */}
        <StepSection number={2} title="Authenticate" icon={Key}>
          <p className="text-muted-foreground mb-3 text-xs">
            ContextGraph supports two authentication methods. In development, a simple API key
            works. In production, use JWT tokens.
          </p>

          <div className="space-y-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 text-xs font-medium text-amber-700">
                Development Authentication
              </div>
              <p className="mb-2 text-[11px] text-amber-600">
                Uses the MCP_DEV_API_KEY environment variable. Must NEVER be used in production.
              </p>
              <CodeBlock
                label="cURL — Development"
                code={`# Development: pass the dev API key
curl -X POST ${mcpBase} \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: cg-dev-test-key-000" \\
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/list",
    "params": {}
  }'`}
              />
            </div>

            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <div className="mb-1 text-xs font-medium text-emerald-700">
                Production Authentication (JWT)
              </div>
              <p className="mb-2 text-[11px] text-emerald-600">
                Obtain a JWT token through the standard login flow, then pass it as a Bearer token.
              </p>
              <CodeBlock
                label="cURL — Production"
                code={`# 1. Login to get a JWT token
TOKEN=$(curl -s -X POST ${apiBase}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"organizationId":"<org-id>","email":"agent@company.com"}' \\
  | jq -r '.data.accessToken')

# 2. Use the token with MCP
curl -X POST ${mcpBase} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/list",
    "params": {}
  }'`}
              />
            </div>
          </div>
        </StepSection>

        {/* Step 3: Discover Tools */}
        <StepSection number={3} title="Discover Available Tools" icon={Wrench}>
          <p className="text-muted-foreground mb-3 text-xs">
            The server exposes only the tools your authenticated session has capabilities for. Call{' '}
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">tools/list</code>{' '}
            to see what&apos;s available:
          </p>
          <CodeBlock
            label="JSON-RPC Request"
            code={`{
  "jsonrpc": "2.0",
  "id": "discover-1",
  "method": "tools/list",
  "params": {}
}`}
          />
          <p className="text-muted-foreground mt-2 mb-2 text-xs">
            The response includes tool definitions with input schemas:
          </p>
          <CodeBlock
            label="Response (truncated)"
            code={`{
  "jsonrpc": "2.0",
  "id": "discover-1",
  "result": {
    "tools": [
      {
        "name": "resolve_context",
        "description": "Retrieve organization knowledge...",
        "requiredCapabilities": ["context.resolve"],
        "readOnly": true,
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" },
            "workspaceId": { "type": "string" },
            "topK": { "type": "number" }
          },
          "required": ["query", "workspaceId"]
        }
      },
      {
        "name": "check_action",
        "description": "Evaluate action authorization...",
        ...
      }
    ]
  }
}`}
          />

          <div className="mt-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">Available Tools (6):</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: 'resolve_context', cap: 'context.resolve', readOnly: true },
                { name: 'get_subgraph', cap: 'graph.read', readOnly: true },
                { name: 'get_run', cap: 'pipeline.read', readOnly: true },
                { name: 'replay_run', cap: 'pipeline.replay', readOnly: true },
                { name: 'check_action', cap: 'context.resolve', readOnly: true },
                { name: 'propose_node', cap: 'knowledge.write', readOnly: false },
              ].map((tool) => (
                <div
                  key={tool.name}
                  className="flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px]"
                >
                  <Code className="text-muted-foreground h-3 w-3" />
                  <span className="font-mono font-medium">{tool.name}</span>
                  {!tool.readOnly && (
                    <Badge variant="destructive" className="px-1 py-0 text-[8px]">
                      writes
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </StepSection>

        {/* Step 4: Call a Tool */}
        <StepSection number={4} title="Call resolve_context" icon={Zap} defaultOpen={false}>
          <p className="text-muted-foreground mb-3 text-xs">
            The primary tool — retrieve governed, permission-filtered organizational context:
          </p>
          <CodeBlock
            label="JSON-RPC Request"
            code={`{
  "jsonrpc": "2.0",
  "id": "ctx-1",
  "method": "tools/call",
  "params": {
    "name": "resolve_context",
    "arguments": {
      "query": "post-incident deployment guidance",
      "workspaceId": "<workspace-uuid>",
      "topK": 10,
      "tokenBudget": 4096,
      "retrievalMode": "bfs"
    }
  }
}`}
          />
          <p className="text-muted-foreground mt-2 mb-2 text-xs">
            Response includes context items with provenance:
          </p>
          <CodeBlock
            label="Response (truncated)"
            code={`{
  "jsonrpc": "2.0",
  "id": "ctx-1",
  "result": {
    "toolCallId": "...",
    "toolName": "resolve_context",
    "status": "success",
    "data": {
      "packageId": "pkg_abc123",
      "pipelineRunId": "run_def456",
      "contextItems": [
        {
          "nodeId": "node_123",
          "title": "Post-Incident Deployment Checklist",
          "type": "FACT",
          "distance": 2,
          "importance": 0.95,
          "inclusionReason": "ORGANIZATION_SPECIFIC",
          "content": "After incident INC-1842..."
        }
      ],
      "summary": {
        "totalCandidates": 45,
        "includedCandidates": 10,
        "totalTokens": 2847
      },
      "funnel": {
        "reachable": 120,
        "authorized": 45,
        "ruleCandidates": 30,
        "included": 10
      }
    }
  }
}`}
          />
        </StepSection>

        {/* Step 5: Check an Action */}
        <StepSection number={5} title="Check an Action" icon={Shield} defaultOpen={false}>
          <p className="text-muted-foreground mb-3 text-xs">
            Ask whether the agent is permitted to perform a specific action — without executing it:
          </p>
          <CodeBlock
            label="JSON-RPC Request"
            code={`{
  "jsonrpc": "2.0",
  "id": "act-1",
  "method": "tools/call",
  "params": {
    "name": "check_action",
    "arguments": {
      "action": "PUBLISH_KNOWLEDGE",
      "targetType": "KNOWLEDGE_NODE",
      "targetId": "<node-uuid>",
      "purpose": "Publish deployment guidance"
    }
  }
}`}
          />
          <CodeBlock
            label="Response"
            code={`{
  "result": {
    "data": {
      "allowed": false,
      "decision": "REQUIRES_APPROVAL",
      "riskLevel": "HIGH",
      "reasonCode": "APPROVAL_REQUIRED",
      "explanation": "High-risk action requires human approval",
      "trace": [
        { "guardrail": "Authentication", "passed": true, "severity": "CRITICAL" },
        { "guardrail": "Capability", "passed": true, "severity": "CRITICAL" },
        { "guardrail": "Organization", "passed": true, "severity": "HIGH" },
        { "guardrail": "Permission Level", "passed": true, "severity": "HIGH" },
        { "guardrail": "Approval", "passed": false, "severity": "HIGH" }
      ],
      "approvalRequired": true,
      "approvalReason": "PUBLISH_KNOWLEDGE requires ADMIN approval"
    }
  }
}`}
          />
        </StepSection>

        {/* Step 6: Propose Knowledge */}
        <StepSection
          number={6}
          title="Propose a Knowledge Node"
          icon={Terminal}
          defaultOpen={false}
        >
          <p className="text-muted-foreground mb-3 text-xs">
            Submit governed knowledge proposals — validated against permissions, policies, and graph
            rules:
          </p>
          <CodeBlock
            label="JSON-RPC Request"
            code={`{
  "jsonrpc": "2.0",
  "id": "prop-1",
  "method": "tools/call",
  "params": {
    "name": "propose_node",
    "arguments": {
      "nodeType": "FACT",
      "title": "Service X restart resolves Y condition",
      "content": "During incident INC-1842, restarting service X after Y condition was resolved fixed the issue.",
      "classification": "INTERNAL",
      "workspaceId": "<workspace-uuid>",
      "purpose": "Capture post-incident learnings"
    }
  }
}`}
          />
          <CodeBlock
            label="Response"
            code={`{
  "result": {
    "data": {
      "proposalId": "prop_xyz789",
      "decision": "PUBLISHED",
      "status": "PUBLISHED",
      "nodeId": "node_new123",
      "approvalRequired": false,
      "validationTrace": [
        { "step": "identity", "passed": true },
        { "step": "capability", "passed": true },
        { "step": "organization", "passed": true },
        { "step": "schema", "passed": true },
        { "step": "content_hash", "passed": true },
        { "step": "duplicate_check", "passed": true },
        { "step": "classification", "passed": true },
        { "step": "compliance", "passed": true },
        { "step": "graph_validation", "passed": true },
        { "step": "policy", "passed": true },
        { "step": "approval", "passed": true }
      ]
    }
  }
}`}
          />
        </StepSection>

        {/* Step 7: Client SDKs */}
        <StepSection number={7} title="Client SDK Examples" icon={Code} defaultOpen={false}>
          <p className="text-muted-foreground mb-3 text-xs">
            Connect using any MCP-compatible client. Here are examples for common SDKs:
          </p>

          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium">TypeScript / Node.js</p>
              <CodeBlock
                label="TypeScript"
                code={`// Using the MCP TypeScript SDK
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

const transport = new StreamableHTTPClientTransport(
  new URL("${mcpBase}"),
  {
    requestInit: {
      headers: {
        "X-Api-Key": "cg-dev-test-key-000",
        // or "Authorization": "Bearer <jwt-token>"
      }
    }
  }
)

const client = new Client({ name: "my-agent", version: "1.0.0" })
await client.connect(transport)

// List tools
const { tools } = await client.listTools()
console.log("Available tools:", tools.map(t => t.name))

// Call resolve_context
const result = await client.callTool({
  name: "resolve_context",
  arguments: {
    query: "deployment guidance",
    workspaceId: "<workspace-uuid>",
    topK: 5
  }
})
console.log(result)`}
              />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium">Python</p>
              <CodeBlock
                label="Python"
                code={`import httpx

# Direct HTTP (no SDK required)
response = httpx.post(
    "${mcpBase}",
    headers={
        "Content-Type": "application/json",
        "X-Api-Key": "cg-dev-test-key-000"
    },
    json={
        "jsonrpc": "2.0",
        "id": "1",
        "method": "tools/call",
        "params": {
            "name": "resolve_context",
            "arguments": {
                "query": "deployment guidance",
                "workspaceId": "<workspace-uuid>",
                "topK": 5
            }
        }
    }
)
data = response.json()
print(data["result"]["data"]["contextItems"])`}
              />
            </div>
          </div>
        </StepSection>

        {/* Architecture Overview */}
        <StepSection number={8} title="Architecture Overview" icon={ArrowRight} defaultOpen={false}>
          <div className="bg-muted/30 rounded-md border p-4 font-mono text-[11px] leading-relaxed">
            <pre>{`AI Agent
    ↓
MCP Client (HTTP/JSON-RPC)
    ↓
ContextGraph MCP Server (/api/v1/mcp)
    ├── Authentication (JWT / Dev Key)
    ├── Capability Check
    ├── Rate Limiting
    ├── Audit Logging
    └── Tool Dispatch
         ↓
    Application Services
         ↓
    ┌────────────┬────────────┬────────────┬────────────┐
    │ Graph Eng  │ Permission │ Rule Eng   │ Pipeline   │
    │            │ Engine     │            │            │
    └────────────┴────────────┴────────────┴────────────┘
         ↓
    ContextPackage / ActionDecision / ProposalResult`}</pre>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded border p-2">
              <div className="font-medium">Security Model</div>
              <div className="text-muted-foreground mt-1">
                Agent identity derived from authenticated session. Tool arguments claiming
                organization/role/clearance are IGNORED.
              </div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium">Rate Limits</div>
              <div className="text-muted-foreground mt-1">
                resolve_context / check_action: 120 req/min. propose_node: 60 req/min. Configurable
                per-org in production.
              </div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium">Tenant Isolation</div>
              <div className="text-muted-foreground mt-1">
                All tool results scoped to the authenticated principal&apos;s organization.
                Cross-tenant access is always denied.
              </div>
            </div>
            <div className="rounded border p-2">
              <div className="font-medium">Audit Trail</div>
              <div className="text-muted-foreground mt-1">
                Every MCP tool call generates an immutable audit record with session ID, principal,
                tool, request, and outcome.
              </div>
            </div>
          </div>
        </StepSection>
      </div>
    </div>
  )
}
