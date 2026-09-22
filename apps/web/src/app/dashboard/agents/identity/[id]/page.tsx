'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApi } from '@/components/dashboard/api-provider'
import {
  ArrowLeft,
  Key,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Plus,
  RefreshCw,
} from 'lucide-react'

const ALL_CAPABILITIES = [
  'context.resolve',
  'graph.read',
  'pipeline.read',
  'pipeline.replay',
  'knowledge.propose',
  'knowledge.read',
  'action.check',
  'events.subscribe',
]

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ACTIVE: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  SUSPENDED: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  REVOKED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
}

const ENV_COLORS: Record<string, string> = {
  DEVELOPMENT: 'bg-blue-100 text-blue-700',
  STAGING: 'bg-amber-100 text-amber-700',
  PRODUCTION: 'bg-red-100 text-red-700',
}

export default function AgentIdentityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string
  const { client } = useApi()

  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [newCredName, setNewCredName] = useState('')
  const [creatingCred, setCreatingCred] = useState(false)
  const [grantCap, setGrantCap] = useState('')
  const [showGrantCap, setShowGrantCap] = useState(false)
  const [busy, setBusy] = useState(false)

  const agentQuery = useQuery({
    queryKey: ['agent-identity', agentId],
    queryFn: () => {
      if (client === null) throw new Error('Not signed in')
      return client.agentIdentityDetail(agentId)
    },
    retry: 1,
    enabled: client !== null,
  })

  const credentialsQuery = useQuery({
    queryKey: ['agent-identity', agentId, 'credentials'],
    queryFn: () => {
      if (client === null) throw new Error('Not signed in')
      return client.agentCredentials(agentId)
    },
    enabled: client !== null,
  })

  const capabilitiesQuery = useQuery({
    queryKey: ['agent-identity', agentId, 'capabilities'],
    queryFn: () => {
      if (client === null) throw new Error('Not signed in')
      return client.agentCapabilities(agentId)
    },
    enabled: client !== null,
  })

  const agent = agentQuery.data ?? null
  const credentials = credentialsQuery.data ?? []
  const capabilities = capabilitiesQuery.data ?? []

  const handleCreateCredential = async () => {
    if (!newCredName.trim() || client === null) return
    setCreatingCred(true)
    try {
      const created = await client.agentCreateCredential(agentId, { name: newCredName.trim() })
      setShowNewKey(created.fullKey)
      setNewCredName('')
      toast.success('Credential created — copy the key now, it will not be shown again')
      void credentialsQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create credential')
    } finally {
      setCreatingCred(false)
    }
  }

  const handleRevokeCredential = async (credentialId: string) => {
    if (client === null) return
    try {
      await client.agentRevokeCredential(agentId, credentialId)
      toast.success('Credential revoked')
      void credentialsQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke credential')
    }
  }

  const handleRotateCredential = async (credentialId: string) => {
    if (client === null) return
    try {
      const created = await client.agentRotateCredential(agentId, credentialId)
      setShowNewKey(created.fullKey)
      toast.success('Credential rotated — copy the new key now')
      void credentialsQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rotate credential')
    }
  }

  const handleGrantCapability = async () => {
    if (!grantCap || client === null) return
    try {
      await client.agentGrantCapability(agentId, { capability: grantCap })
      setGrantCap('')
      setShowGrantCap(false)
      toast.success('Capability granted')
      void capabilitiesQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to grant capability')
    }
  }

  const handleRevokeCapability = async (capability: string) => {
    if (client === null) return
    try {
      await client.agentRevokeCapability(agentId, capability)
      toast.success('Capability revoked')
      void capabilitiesQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke capability')
    }
  }

  const runLifecycle = async (action: 'suspend' | 'revoke' | 'reactivate') => {
    if (client === null) return
    setBusy(true)
    try {
      if (action === 'suspend') await client.agentIdentitySuspend(agentId)
      else if (action === 'revoke') await client.agentIdentityRevoke(agentId)
      else await client.agentIdentityReactivate(agentId)
      toast.success(`Agent ${action}d`)
      void agentQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action} agent`)
    } finally {
      setBusy(false)
    }
  }

  if (agentQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading agent...</div>
      </div>
    )
  }

  if (agentQuery.isError || agent === null) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p>{agentQuery.isError ? 'Failed to load agent' : 'Agent not found'}</p>
        <p className="text-muted-foreground max-w-sm text-center text-xs">
          {agentQuery.error instanceof Error ? agentQuery.error.message : ''}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void agentQuery.refetch()}>
            <RefreshCw className="mr-1 h-3 w-3" /> Retry
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.ACTIVE
  const StatusIcon = cfg.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className={`${cfg.bg} flex h-12 w-12 items-center justify-center rounded-xl`}>
          <StatusIcon className={`h-6 w-6 ${cfg.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
            <Badge variant="outline" className={ENV_COLORS[agent.environment] ?? ''}>
              {agent.environment}
            </Badge>
            <Badge variant={agent.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {agent.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            <span className="font-mono">{agent.slug}</span>
            {agent.description && <span> · {agent.description}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {agent.status === 'ACTIVE' && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void runLifecycle('suspend')}
            >
              Suspend
            </Button>
          )}
          {agent.status === 'SUSPENDED' && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void runLifecycle('reactivate')}
            >
              Reactivate
            </Button>
          )}
          {agent.status !== 'REVOKED' && (
            <Button
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={() => void runLifecycle('revoke')}
            >
              Revoke
            </Button>
          )}
        </div>
      </div>

      {/* Secret Key Reveal */}
      {showNewKey !== null && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                API Key Created — Save this now!
              </span>
            </div>
            <p className="mb-2 text-xs text-amber-600">
              This secret will NOT be shown again. Copy it and store it securely.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded border bg-white p-2 font-mono text-xs">
                {showNewKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void navigator.clipboard.writeText(showNewKey)}
              >
                <Copy className="mr-1 h-3 w-3" /> Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNewKey(null)}>
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Status</div>
            <div className={`mt-1 text-sm font-medium ${cfg.color}`}>{agent.status}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Environment</div>
            <div className="mt-1 text-sm font-medium">{agent.environment}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Credentials</div>
            <div className="mt-1 text-sm font-medium">{credentials.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Capabilities</div>
            <div className="mt-1 text-sm font-medium">{capabilities.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Credentials */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Key className="h-4 w-4" /> Credentials
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void credentialsQuery.refetch()}
            aria-label="Refresh credentials"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={newCredName}
              onChange={(e) => setNewCredName(e.target.value)}
              placeholder="Credential name (e.g. production-key)"
              className="bg-background flex-1 rounded-md border px-3 py-1.5 text-sm"
            />
            <Button
              size="sm"
              onClick={() => void handleCreateCredential()}
              disabled={!newCredName.trim() || creatingCred}
            >
              {creatingCred ? 'Creating...' : 'Create Key'}
            </Button>
          </div>
          {credentials.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-xs">No credentials yet</p>
          ) : (
            <div className="space-y-2">
              {credentials.map((cred) => (
                <div key={cred.id} className="flex items-center gap-3 rounded border p-3">
                  <Key className="text-muted-foreground h-4 w-4" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cred.name}</span>
                      <Badge
                        variant={cred.status === 'ACTIVE' ? 'default' : 'destructive'}
                        className="text-[10px]"
                      >
                        {cred.status}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-0.5 font-mono text-[10px]">
                      {cred.keyPrefix}
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-[10px]">
                      Created {new Date(cred.createdAt).toLocaleDateString()}
                      {cred.lastUsedAt &&
                        ` · Last used ${new Date(cred.lastUsedAt).toLocaleDateString()}`}
                      {cred.expiresAt &&
                        ` · Expires ${new Date(cred.expiresAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  {cred.status === 'ACTIVE' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => void handleRotateCredential(cred.id)}
                      >
                        Rotate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600"
                        onClick={() => void handleRevokeCredential(cred.id)}
                      >
                        Revoke
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" /> Capabilities
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowGrantCap(!showGrantCap)}>
            <Plus className="mr-1 h-3 w-3" /> Grant
          </Button>
        </CardHeader>
        <CardContent>
          {showGrantCap && (
            <div className="mb-3 flex items-center gap-2">
              <select
                value={grantCap}
                onChange={(e) => setGrantCap(e.target.value)}
                className="bg-background flex-1 rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">Select capability...</option>
                {ALL_CAPABILITIES.filter(
                  (c) => !capabilities.some((existing) => existing.capability === c),
                ).map((cap) => (
                  <option key={cap} value={cap}>
                    {cap}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={() => void handleGrantCapability()} disabled={!grantCap}>
                Grant
              </Button>
            </div>
          )}
          {capabilities.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-xs">
              No capabilities granted — agent cannot use any MCP tools
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {capabilities.map((cap) => (
                <div
                  key={cap.id}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
                >
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                  <span className="font-mono">{cap.capability}</span>
                  <button
                    onClick={() => void handleRevokeCapability(cap.capability)}
                    className="ml-1 text-red-400 hover:text-red-600"
                    aria-label={`Revoke ${cap.capability}`}
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Identity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">ID: </span>
              <span className="font-mono">{agent.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              {new Date(agent.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="text-muted-foreground">Last Used: </span>
              {agent.lastUsedAt ? new Date(agent.lastUsedAt).toLocaleString() : 'Never'}
            </div>
            {agent.purpose && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Purpose: </span>
                {agent.purpose}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
