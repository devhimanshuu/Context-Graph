import { ArrowUpRight, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Reveal } from './reveal'

interface ChangelogEntry {
  date: string
  title: string
  description: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'outline'
}

const ENTRIES: readonly ChangelogEntry[] = [
  {
    date: 'Phase 15',
    title: 'Reference Multi-Agent System',
    description:
      'Four specialized agents — Research, Analysis, Decision, Synthesis — demonstrate ContextGraph as shared governed infrastructure. Each agent uses its own identity, capabilities, and authorization scope.',
    badge: 'Latest',
  },
  {
    date: 'Phase 14',
    title: 'Agent Identity & Service Accounts',
    description:
      'Production-grade workload identity for AI agents. Secure credential hashing, capability isolation, session management, and full authentication audit chain.',
    badge: 'New',
  },
  {
    date: 'Phase 13',
    title: 'Agent Playground & MCP Observability',
    description:
      'Premium developer console for interacting with ContextGraph through MCP. Tool explorer, manual invocation, context package viewer, guardrail trace, and live event stream.',
  },
  {
    date: 'Phase 12',
    title: 'Event Stream & Real-Time Events',
    description:
      'Transactional outbox pattern, SSE-powered event delivery, dead-letter handling, tenant-scoped subscriptions, and Last-Event-ID replay.',
  },
] as const

export function Changelog() {
  return (
    <section
      id="changelog"
      className="relative scroll-mt-20 overflow-hidden border-t py-20 lg:py-24"
    >
      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-medium tracking-[0.15em] text-emerald-500 uppercase">
            <Zap className="size-3" />
            Actively developing
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            What&apos;s new in ContextGraph
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Recent platform milestones — from core context pipeline to enterprise agent
            infrastructure.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          {ENTRIES.map((entry, index) => (
            <Reveal key={entry.title} delay={index * 80}>
              <Card className="group hover:border-primary/25 relative overflow-hidden transition-colors duration-300">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div className="bg-primary/10 flex size-8 items-center justify-center rounded-lg">
                        <span className="text-primary font-mono text-[10px] font-bold">
                          {entry.date.replace('Phase ', 'P')}
                        </span>
                      </div>
                      {index < ENTRIES.length - 1 && (
                        <div className="border-border/60 w-px flex-1 border-l border-dashed" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold tracking-tight">{entry.title}</h3>
                        {entry.badge && (
                          <Badge variant={entry.badgeVariant ?? 'secondary'} className="text-[9px]">
                            {entry.badge}
                          </Badge>
                        )}
                        <ArrowUpRight className="text-muted-foreground/40 size-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </div>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
