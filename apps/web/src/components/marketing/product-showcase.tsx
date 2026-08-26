import Link from 'next/link'
import { ArrowRight, ExternalLink, GitBranch, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Reveal } from './reveal'
import { ROUTES } from '@/constants'

/**
 * Product showcase: a stylized representation of the Agent Playground
 * that gives visitors a concrete sense of the product without requiring
 * an actual screenshot.
 */

const DEMO_STEPS = [
  {
    time: '10:42:01',
    agent: 'Research Agent',
    action: 'resolve_context',
    result: '12 authorized nodes',
    status: 'success' as const,
  },
  {
    time: '10:42:02',
    agent: 'Decision Agent',
    action: 'check_action',
    result: 'REQUIRES_APPROVAL',
    status: 'warning' as const,
  },
  {
    time: '10:42:03',
    agent: 'Decision Agent',
    action: 'propose_node',
    result: 'PENDING_APPROVAL',
    status: 'info' as const,
  },
  {
    time: '10:42:04',
    agent: 'System',
    action: 'NODE_PUBLISHED',
    result: 'Event emitted',
    status: 'success' as const,
  },
  {
    time: '10:42:05',
    agent: 'Synthesis Agent',
    action: 'Context assembled',
    result: '3 citations, 0 policy violations',
    status: 'success' as const,
  },
] as const

const CAPABILITIES = [
  {
    icon: ShieldCheck,
    label: 'Permission-aware',
    detail: 'Every query filtered by role & clearance',
  },
  {
    icon: GitBranch,
    label: 'Deterministic rules',
    detail: 'Versioned, declarative, fully auditable',
  },
  { icon: Zap, label: 'Real-time events', detail: 'SSE-powered live updates for agents & UI' },
] as const

export function ProductShowcase() {
  return (
    <section id="product" className="relative scroll-mt-20 overflow-hidden border-t py-20 lg:py-24">
      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            ▸ See it in action
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            The Agent Playground
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Connect an MCP-compatible agent, execute governed context retrieval, inspect decisions,
            and watch real-time events — all in one developer console.
          </p>
        </Reveal>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-2">
          {/* Left: stylized execution trace */}
          <Reveal direction="left">
            <div className="bg-background/80 relative overflow-hidden rounded-2xl border shadow-2xl">
              {/* Title bar */}
              <div className="border-border flex items-center gap-2 border-b px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-rose-500/80" />
                <span className="size-2.5 rounded-full bg-amber-500/80" />
                <span className="size-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  Agent Playground — Execution Timeline
                </span>
              </div>

              {/* Execution steps */}
              <div className="p-4">
                <div className="space-y-1">
                  {DEMO_STEPS.map((step, index) => (
                    <div
                      key={index}
                      className="hover:bg-muted/40 flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-xs transition-colors"
                    >
                      <span className="text-muted-foreground/60 w-16 shrink-0">{step.time}</span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[9px] ${
                          step.status === 'success'
                            ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                            : step.status === 'warning'
                              ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                              : 'border-sky-500/40 text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {step.status === 'success' ? '✓' : step.status === 'warning' ? '⚠' : '●'}
                      </Badge>
                      <span className="text-foreground/80 w-28 shrink-0 truncate">
                        {step.agent}
                      </span>
                      <span className="text-primary shrink-0 font-medium">{step.action}</span>
                      <span className="text-muted-foreground ml-auto truncate">{step.result}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom bar */}
                <div className="border-border mt-3 flex items-center justify-between border-t pt-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-1.5" aria-hidden="true">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Live
                    </span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    5 events · 0 violations
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right: capabilities + CTA */}
          <Reveal direction="right" className="flex flex-col gap-6">
            <div className="space-y-5">
              {CAPABILITIES.map((cap) => (
                <div key={cap.label} className="flex items-start gap-3">
                  <div className="text-primary flex size-9 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10">
                    <cap.icon className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">{cap.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                      {cap.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-border border-t pt-5">
              <p className="text-muted-foreground mb-3 text-sm">
                Every interaction is authorized, auditable, and deterministic. The agent cannot
                override ContextGraph — it can only use the capabilities it was granted.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="group">
                  <Link href={ROUTES.agentPlayground}>
                    Open the Agent Playground
                    <ArrowRight className="ml-1.5 size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={ROUTES.multiAgentDemo}>
                    Multi-agent demo
                    <ExternalLink className="ml-1.5 size-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
