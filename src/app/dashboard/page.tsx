import type { Metadata } from 'next'
import { Boxes, Circle, CircleCheck, ScrollText, ShieldCheck, Waypoints } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'
import { HealthStatusCard } from '@/components/dashboard/health-status-card'
import { PageHeader } from '@/components/dashboard/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { APP } from '@/constants'

export const metadata: Metadata = {
  title: 'Overview',
}

const ROADMAP = [
  { label: 'Project foundation & architecture', done: true },
  { label: 'Database layer & domain model (schema, migrations, seed)', done: true },
  { label: 'Authentication, graph traversal & rule engines', done: false },
  { label: 'Permission-aware context assembly', done: false },
  { label: 'AI integrations & analytics', done: false },
] as const

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`Welcome to ${APP.name} — your enterprise context intelligence workspace.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Graph nodes"
          value="0"
          icon={Waypoints}
          hint="Connected knowledge entities"
          badge="Phase 3"
        />
        <StatCard
          label="Edges"
          value="0"
          icon={Boxes}
          hint="Relationships between nodes"
          badge="Phase 3"
        />
        <StatCard
          label="Contexts"
          value="0"
          icon={ScrollText}
          hint="Assembled for AI systems"
          badge="Phase 3"
        />
        <StatCard
          label="Active rules"
          value="0"
          icon={ShieldCheck}
          hint="Deterministic rule engine"
          badge="Phase 3"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>Platform delivery roadmap</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {ROADMAP.map((item) => {
                const DoneIcon = item.done ? CircleCheck : Circle
                return (
                  <li key={item.label} className="flex items-center gap-3 text-sm">
                    <DoneIcon
                      className={
                        item.done
                          ? 'size-4 shrink-0 text-emerald-500'
                          : 'text-muted-foreground/60 size-4 shrink-0'
                      }
                    />
                    <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                    {item.done && (
                      <span className="ml-auto rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Complete
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <HealthStatusCard />
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Waypoints}
                title="Nothing yet"
                description="Graph traversals, rule evaluations and context assemblies will appear here in later phases."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
