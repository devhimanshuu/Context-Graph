'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Plus, Cpu, Check, X, Globe, Lock } from 'lucide-react'

interface ModelConfig {
  configId: string
  provider: string
  status: string
  allowedModels: string[]
  blockedModels: string[]
  defaultModel: string | null
  fallbackModel: string | null
  maxTokensPerRequest: number
  createdAt: string
}

interface OrgSettings {
  externalLlmPolicy: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export default function ModelGovernancePage() {
  const { data: models, isLoading } = useQuery<ModelConfig[]>({
    queryKey: ['governance', 'models'],
    queryFn: () => fetchJson('/api/v1/governance/models'),
  })
  const { data: settings } = useQuery<OrgSettings>({
    queryKey: ['governance', 'settings'],
    queryFn: () => fetchJson('/api/v1/governance/settings'),
  })
  const policy = settings?.externalLlmPolicy ?? 'EXTERNAL_LLM_ALLOWED'
  const policyInfo: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    EXTERNAL_LLM_ALLOWED: {
      label: 'External LLMs Allowed',
      icon: Globe,
      color: 'text-emerald-600',
    },
    EXTERNAL_LLM_BLOCKED: { label: 'External LLMs Blocked', icon: Lock, color: 'text-red-600' },
    LOCAL_MODEL_ONLY: { label: 'Local Models Only', icon: Lock, color: 'text-amber-600' },
  }
  const info = policyInfo[policy] ?? policyInfo.EXTERNAL_LLM_ALLOWED

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Model Governance</h1>
          <p className="text-muted-foreground">
            Configure model providers, allowlists, and data policies
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Provider
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <info.icon className={`h-5 w-5 ${info.color}`} />
            External LLM Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary" className={info.color}>
            {info.label}
          </Badge>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Configured Providers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={3} columns={4} />
          ) : models && models.length > 0 ? (
            <div className="space-y-3">
              {models.map((m) => (
                <div key={m.configId} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-medium">{m.provider}</span>
                      <Badge variant={m.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {m.status}
                      </Badge>
                      {m.defaultModel && <Badge variant="outline">Default: {m.defaultModel}</Badge>}
                    </div>
                    <span className="text-muted-foreground text-sm">
                      Max {m.maxTokensPerRequest.toLocaleString()} tokens
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-medium">
                        Allowed Models
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {m.allowedModels.length > 0 ? (
                          m.allowedModels.map((model) => (
                            <Badge key={model} variant="secondary" className="text-xs">
                              <Check className="mr-1 h-3 w-3 text-emerald-500" />
                              {model}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">All models allowed</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1 text-xs font-medium">
                        Blocked Models
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {m.blockedModels.length > 0 ? (
                          m.blockedModels.map((model) => (
                            <Badge key={model} variant="secondary" className="text-xs">
                              <X className="mr-1 h-3 w-3 text-red-500" />
                              {model}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">No blocked models</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-12 text-center">
              <Cpu className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No model providers configured</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
