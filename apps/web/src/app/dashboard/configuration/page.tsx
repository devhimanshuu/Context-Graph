'use client'

import { CircleAlert, Cpu, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/components/dashboard/api-provider'
import { useEngineConfiguration } from '@/hooks/use-api-query'
import type { EngineConfiguration } from '@/lib/api/types'

const ENGINE_LABELS: Record<keyof EngineConfiguration, string> = {
  pipeline: 'Pipeline',
  traversal: 'Traversal (graph engine)',
  ruleEngine: 'Rule engine',
  permission: 'Permission engine',
  cache: 'Cache',
  metrics: 'Metrics',
}

export default function ConfigurationPage() {
  const { selectedUser } = useApi()
  const config = useEngineConfiguration()
  const isAdmin = selectedUser?.role === 'ADMIN'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuration"
        description="Live engine configuration surfaced by the NestJS configuration module — read-only."
      >
        <Badge variant="outline" className="gap-1.5">
          <Cpu className="size-3" />
          {isAdmin ? 'ADMIN view' : 'Limited view'}
        </Badge>
      </PageHeader>

      {!isAdmin && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <CircleAlert className="size-4" />
            Engine configuration is restricted to the ADMIN role.
          </CardContent>
        </Card>
      )}

      {config.isError && (
        <Card>
          <CardContent className="text-destructive flex items-center gap-2 py-4 text-sm">
            <CircleAlert className="size-4" />
            {config.error?.message ?? 'Failed to load configuration'}
          </CardContent>
        </Card>
      )}

      {config.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : config.data === null ? (
        <EmptyState
          icon={SlidersHorizontal}
          title="No configuration available"
          description="Connect to the API to inspect engine configuration."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(Object.keys(ENGINE_LABELS) as Array<keyof EngineConfiguration>).map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-sm">{ENGINE_LABELS[key]}</CardTitle>
                <CardDescription>
                  <code className="text-muted-foreground">/{key}</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="divide-y">
                  {Object.entries(config.data?.[key] ?? {}).map(([property, value]) => (
                    <div
                      key={property}
                      className="flex items-center justify-between gap-3 py-1.5 text-xs"
                    >
                      <dt className="text-muted-foreground font-mono">{property}</dt>
                      <dd className="font-mono">{formatValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null || value === undefined) return '—'
  return JSON.stringify(value)
}
