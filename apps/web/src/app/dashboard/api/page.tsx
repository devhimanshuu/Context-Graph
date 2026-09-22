'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/dashboard/page-header'
import { useApi } from '@/components/dashboard/api-provider'
import { API_BASE_URL } from '@/lib/api/client'
import { Copy, Plug, Terminal, Workflow } from 'lucide-react'

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7"
      onClick={() => {
        void navigator.clipboard
          .writeText(value)
          .then(() => toast.success(`${label} copied`))
          .catch(() => toast.error('Clipboard unavailable — select and copy manually'))
      }}
    >
      <Copy className="mr-1 h-3 w-3" /> Copy
    </Button>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-muted/60 overflow-x-auto rounded-md border p-3 font-mono text-xs leading-relaxed">
      {code}
    </pre>
  )
}

export default function ApiMcpPage() {
  const { token, bootstrap } = useApi()
  const orgId = bootstrap?.organizationId ?? '<organization-id>'

  // Redact the live token in rendered snippets — show a placeholder unless copied.
  const bearerForCopy = token ?? '<access-token>'

  const curlSnippet = `curl -X POST ${API_BASE_URL}/mcp \\
  -H "Authorization: Bearer ${bearerForCopy}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'`

  const jsSnippet = `const res = await fetch("${API_BASE_URL}/mcp", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${bearerForCopy}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "context.resolve",
      arguments: { /* tool arguments */ },
    },
  }),
});
const data = await res.json();`

  const restSnippet = `# List knowledge nodes
curl ${API_BASE_URL}/knowledge?workspaceId=${orgId} \\
  -H "Authorization: Bearer ${bearerForCopy}"

# Ask the AI (streaming)
curl -N ${API_BASE_URL}/ai/chat/stream \\
  -H "Authorization: Bearer ${bearerForCopy}" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What changed in the payments spec?", "workspaceId": "<workspace-id>"}'`

  const sseSnippet = `// Server-Sent Events (real-time governance events)
const es = new EventSource(
  "${API_BASE_URL}/events/stream?access_token=${bearerForCopy}",
);
es.onmessage = (event) => {
  const envelope = JSON.parse(event.data);
  console.log("event:", envelope.eventType);
};`

  return (
    <div className="space-y-6">
      <PageHeader
        title="API & MCP"
        description="Connect agents, scripts, and MCP clients to your ContextGraph organization."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">MCP endpoint</span>
            </div>
            <code className="text-muted-foreground mt-2 block truncate font-mono text-xs">
              POST {API_BASE_URL}/mcp
            </code>
            <p className="text-muted-foreground mt-2 text-xs">
              JSON-RPC 2.0: <span className="font-mono">tools/list</span>,{' '}
              <span className="font-mono">tools/call</span>, <span className="font-mono">ping</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-sky-500" />
              <span className="text-sm font-medium">REST API</span>
            </div>
            <code className="text-muted-foreground mt-2 block truncate font-mono text-xs">
              {API_BASE_URL}
            </code>
            <p className="text-muted-foreground mt-2 text-xs">
              JWT <span className="font-mono">Authorization: Bearer</span> on every request.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-fuchsia-500" />
              <span className="text-sm font-medium">Auth</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                JWT
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                Agent API keys
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                SSE query token
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              Create scoped agent keys under <span className="font-medium">Agent Identities</span>.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Connect an MCP client</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Works with any MCP-compatible agent runtime. List tools first, then call them.
            </CardDescription>
          </div>
          <CopyButton value={curlSnippet} label="curl snippet" />
        </CardHeader>
        <CardContent>
          <CodeBlock code={curlSnippet} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Call MCP from JavaScript</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Fetch wrapper for tools/call with your live base URL.
            </CardDescription>
          </div>
          <CopyButton value={jsSnippet} label="JavaScript snippet" />
        </CardHeader>
        <CardContent>
          <CodeBlock code={jsSnippet} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">REST quick start</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Knowledge listing and streaming AI chat with curl.
            </CardDescription>
          </div>
          <CopyButton value={restSnippet} label="REST snippet" />
        </CardHeader>
        <CardContent>
          <CodeBlock code={restSnippet} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Subscribe to events (SSE)</CardTitle>
            <CardDescription className="mt-1 text-xs">
              EventSource cannot send headers — pass the JWT as the{' '}
              <span className="font-mono">access_token</span> query parameter.
            </CardDescription>
          </div>
          <CopyButton value={sseSnippet} label="SSE snippet" />
        </CardHeader>
        <CardContent>
          <CodeBlock code={sseSnippet} />
        </CardContent>
      </Card>
    </div>
  )
}
