import {
  Boxes,
  Building2,
  FileCheck2,
  Radio,
  ScrollText,
  ShieldCheck,
  Waypoints,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const FEATURES: readonly Feature[] = [
  {
    icon: Waypoints,
    title: 'Knowledge graph traversal',
    description:
      'Model facts, constraints, decisions and anti-patterns as typed nodes and edges, traversed with deterministic BFS reachability.',
  },
  {
    icon: ScrollText,
    title: 'Deterministic rule engine',
    description:
      'Versioned, declarative rules with JSON conditions — auditable, dry-runnable, and evaluated in priority order.',
  },
  {
    icon: ShieldCheck,
    title: 'Permission-aware filtering',
    description:
      'Roles, permission profiles and compliance clearance filter every query before a single token is assembled.',
  },
  {
    icon: Boxes,
    title: 'Context assembly for AI',
    description:
      'Combine traversal output, rule evaluations and permissions into token-budgeted context packages for LLMs.',
  },
  {
    icon: Building2,
    title: 'Multi-tenant by construction',
    description:
      'Every row anchors to an organization; isolation is a query-plan property, not a convention teams must remember.',
  },
  {
    icon: FileCheck2,
    title: 'Audit & compliance',
    description:
      'Append-only event log with before/after snapshots, validity windows and regulatory tags out of the box.',
  },
  {
    icon: Zap,
    title: 'MCP tool server',
    description:
      'Production MCP server with 6 governed tools — agents connect once and get authorized context, action guardrails, and governed write-back.',
  },
  {
    icon: Radio,
    title: 'Real-time events',
    description:
      'SSE-powered event stream with transactional outbox, dead-letter handling, and tenant-scoped subscriptions for live agent and UI updates.',
  },
]

/* Bento spans: 4-col grid — two full-width cards bookend three rows of two. */
const BENTO_SPANS = [
  'sm:col-span-2 lg:col-span-4',
  'sm:col-span-1 lg:col-span-2',
  'sm:col-span-1 lg:col-span-2',
  'sm:col-span-1 lg:col-span-2',
  'sm:col-span-1 lg:col-span-2',
  'sm:col-span-1 lg:col-span-2',
  'sm:col-span-1 lg:col-span-2',
  'sm:col-span-2 lg:col-span-4',
] as const

/** The wide closing card reads best with a roomier description. */
const IS_WIDE = (index: number) => index === FEATURES.length - 1

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="relative scroll-mt-20 overflow-hidden border-t py-20 lg:py-24"
    >
      {/* Ambient glow above the grid */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h3 className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            Platform capabilities
          </h3>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            Everything an enterprise context platform needs
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            One platform, every industry — built for regulated, knowledge-heavy teams from
            healthcare to government.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={(index % 3) * 90}
              className={cn('h-full', BENTO_SPANS[index])}
            >
              <Card className="group hover:border-primary/30 relative h-full overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(var(--cg-glow),0.4)]">
                {/* Gradient wash + top hairline on hover */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-fuchsia-500/[0.06] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                />

                {IS_WIDE(index) ? (
                  /* Full-width closing card — horizontal arrangement */
                  <div className="relative flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 lg:p-8">
                    <div className="text-primary flex size-12 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <feature.icon className="size-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <CardTitle className="text-lg tracking-tight">{feature.title}</CardTitle>
                      <CardDescription className="max-w-2xl leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </div>
                    <span className="text-muted-foreground/40 group-hover:text-muted-foreground/70 font-mono text-xs transition-colors duration-300">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                ) : (
                  <>
                    <CardHeader className="relative">
                      <div className="flex items-start justify-between">
                        <div className="text-primary flex size-11 items-center justify-center rounded-xl border bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                          <feature.icon className="size-5" />
                        </div>
                        <span className="text-muted-foreground/40 group-hover:text-muted-foreground/70 font-mono text-xs transition-colors duration-300">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <CardTitle className="mt-5 text-lg tracking-tight">{feature.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="relative">
                      <CardDescription className="leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </>
                )}
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
