'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bot,
  Plus,
  RefreshCw,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'

interface AgentIdentity {
  id: string
  name: string
  slug: string
  description: string | null
  environment: string
  status: string
  ownerUserId: string | null
  createdAt: string
  lastUsedAt: string | null
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ACTIVE: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  SUSPENDED: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  REVOKED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ARCHIVED: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' },
}

const ENV_COLORS: Record<string, string> = {
  DEVELOPMENT: 'bg-blue-100 text-blue-700',
  STAGING: 'bg-amber-100 text-amber-700',
  PRODUCTION: 'bg-red-100 text-red-700',
}

export default function AgentIdentityPage() {
  const [agents, setAgents] = useState<AgentIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newEnv, setNewEnv] = useState('DEVELOPMENT')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/agents', {
        headers: { Authorization: 'Bearer demo-token' },
      })
      const data = await res.json()
      setAgents(data.data ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAgents()
  }, [fetchAgents])

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return
    setCreating(true)
    try {
      await fetch('/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer demo-token' },
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000001',
          name: newName.trim(),
          slug: newSlug.trim(),
          description: newDesc.trim() || undefined,
          environment: newEnv,
        }),
      })
      setShowCreate(false)
      setNewName('')
      setNewSlug('')
      setNewDesc('')
      void fetchAgents()
    } catch {
      // silent
    } finally {
      setCreating(false)
    }
  }

  const totalActive = agents.filter((a) => a.status === 'ACTIVE').length
  const totalSuspended = agents.filter((a) => a.status === 'SUSPENDED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Identities</h1>
          <p className="text-muted-foreground mt-1">
            Manage workload identities for AI agents — create, configure, authenticate, and audit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void fetchAgents()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Bot className="text-primary h-8 w-8" />
            <div>
              <div className="text-2xl font-bold">{agents.length}</div>
              <div className="text-muted-foreground text-xs">Total Agents</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <div>
              <div className="text-2xl font-bold text-emerald-600">{totalActive}</div>
              <div className="text-muted-foreground text-xs">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold text-amber-600">{totalSuspended}</div>
              <div className="text-muted-foreground text-xs">Suspended</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Shield className="h-8 w-8 text-violet-500" />
            <div>
              <div className="text-2xl font-bold">—</div>
              <div className="text-muted-foreground text-xs">Active Sessions</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm">Create Agent Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    setNewSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '-')
                        .slice(0, 50),
                    )
                  }}
                  placeholder="research-agent-prod"
                  className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Slug *</label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="research-agent-prod"
                  className="bg-background w-full rounded-md border px-3 py-2 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Environment</label>
                <select
                  value={newEnv}
                  onChange={(e) => setNewEnv(e.target.value)}
                  className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="DEVELOPMENT">Development</option>
                  <option value="STAGING">Staging</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Purpose of this agent"
                  className="bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => void handleCreate()}
                disabled={!newName.trim() || creating}
                size="sm"
              >
                {creating ? 'Creating...' : 'Create Agent'}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)} size="sm">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Identities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              Loading agents...
            </div>
          ) : agents.length === 0 ? (
            <div className="text-muted-foreground flex h-32 flex-col items-center justify-center gap-2">
              <Bot className="h-8 w-8" />
              <p>No agent identities yet</p>
              <p className="text-xs">
                Create your first agent to get started with MCP authentication
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => {
                const cfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.ACTIVE
                const StatusIcon = cfg.icon
                return (
                  <Link
                    key={agent.id}
                    href={`/dashboard/agents/identity/${agent.id}`}
                    className="hover:bg-muted/50 flex items-center gap-4 rounded-lg border p-4 transition-colors"
                  >
                    <div
                      className={`${cfg.bg} flex h-10 w-10 items-center justify-center rounded-lg`}
                    >
                      <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{agent.name}</span>
                        <Badge variant="outline" className={ENV_COLORS[agent.environment] ?? ''}>
                          {agent.environment}
                        </Badge>
                        <Badge variant={agent.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {agent.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        <span className="font-mono">{agent.slug}</span>
                        {agent.description && <span> · {agent.description}</span>}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-[10px]">
                        <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
                        {agent.lastUsedAt && (
                          <span>Last used {new Date(agent.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Key className="text-muted-foreground h-4 w-4" />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
