'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { Plus, Shield, Check } from 'lucide-react'

interface Policy {
  policyId: string
  name: string
  description: string
  type: string
  version: number
  status: string
  createdAt: string
}

const TYPE_COLORS: Record<string, string> = {
  ACCESS: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  KNOWLEDGE: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  AGENT: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  MODEL: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  COST: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  SECURITY: 'bg-red-500/10 text-red-700 dark:text-red-400',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  DISABLED: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export default function PoliciesPage() {
  const queryClient = useQueryClient()
  const { data: policies, isLoading } = useQuery<Policy[]>({
    queryKey: ['governance', 'policies'],
    queryFn: () => fetchJson('/api/v1/governance/policies'),
  })

  const publishMutation = useMutation({
    mutationFn: (policyId: string) =>
      fetch(`/api/v1/governance/policies/${policyId}/publish`, { method: 'POST' }).then((r) =>
        r.json(),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance', 'policies'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
          <p className="text-muted-foreground">
            Governance policies for access, agents, models, and security
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Policy
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : policies && policies.length > 0 ? (
            <div className="space-y-2">
              {policies.map((p) => (
                <div
                  key={p.policyId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <Badge className={TYPE_COLORS[p.type] ?? ''} variant="secondary">
                        {p.type}
                      </Badge>
                      <Badge className={STATUS_COLORS[p.status] ?? ''} variant="secondary">
                        {p.status}
                      </Badge>
                      <span className="text-muted-foreground text-xs">v{p.version}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{p.description}</p>
                  </div>
                  {p.status === 'DRAFT' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => publishMutation.mutate(p.policyId)}
                      disabled={publishMutation.isPending}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Publish
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-12 text-center">
              <Shield className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No policies created yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
