import Link from 'next/link'
import { ArrowRight, Boxes, Lock, ScrollText, ShieldCheck, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeroBackdrop } from './hero-backdrop'
import { NodeTypeMarquee } from './node-type-marquee'
import { PipelineStory } from './pipeline-story'
import { APP, ROUTES } from '@/constants'

/**
 * Hero stat cards — each shows a core capability that differentiates
 * ContextGraph from plain retrieval or generic RAG.
 */
const HERO_STATS = [
  { label: 'Traversal', value: 'BFS', icon: Boxes, detail: 'Deterministic reachability' },
  { label: 'Rules', value: 'Versioned', icon: ScrollText, detail: 'Declarative & auditable' },
  {
    label: 'Access',
    value: 'Permission-aware',
    icon: ShieldCheck,
    detail: 'Filtered at query time',
  },
  {
    label: 'Governance',
    value: 'Policy-enforced',
    icon: Lock,
    detail: 'Action guardrails built in',
  },
] as const

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh_-_4rem)] flex-col overflow-hidden">
      {/* Animated backdrop: aurora orbs, crawling grid, data streams, scan
          beam, particles — with mouse parallax. */}
      <HeroBackdrop />

      {/* One shared clock drives the status line, graph highlights and token
          counter below — a single, coherent live-pipeline story. */}
      <PipelineStory>
        <div className="relative mx-auto flex w-[90%] max-w-6xl flex-1 flex-col items-center justify-center gap-5 py-8 text-center lg:gap-6 lg:py-10">
          <div className="cg-rise">
            <Badge
              variant="outline"
              className="bg-background/60 font-mono text-[10px] font-medium tracking-[0.18em] uppercase"
            >
              <span className="relative mr-2 flex size-1.5" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              {APP.subtitle}
            </Badge>
          </div>

          <h1
            className="cg-rise text-4xl leading-[1.06] font-semibold tracking-tight text-balance md:text-5xl lg:text-[3.25rem]"
            style={{ animationDelay: '90ms' }}
          >
            The governed context layer for AI
            <br className="hidden sm:block" />
            that{' '}
            <span className="animate-cg-shimmer bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-transparent">
              regulators trust
            </span>
          </h1>

          <p
            className="cg-rise text-muted-foreground max-w-3xl text-base leading-normal sm:text-lg lg:text-xl"
            style={{ animationDelay: '180ms' }}
          >
            {APP.heroSubheadline}
          </p>

          <div
            className="cg-rise flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: '230ms' }}
          >
            <Button
              size="lg"
              className="group h-12 px-8 text-base shadow-[0_8px_32px_-8px_rgba(var(--cg-glow),0.5)] transition-shadow hover:shadow-[0_8px_40px_-6px_rgba(var(--cg-glow),0.65)]"
              asChild
            >
              <Link href={ROUTES.signUp}>
                Get started free
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
              <Link href={ROUTES.agentPlayground}>
                <Zap className="mr-2 size-4" />
                Try the Agent Playground
              </Link>
            </Button>
          </div>

          <p
            className="cg-rise text-muted-foreground font-mono text-xs"
            style={{ animationDelay: '280ms' }}
          >
            <span className="text-emerald-500">$</span> no credit card required · secure, auditable,
            and enterprise-ready
          </p>

          <dl
            className="cg-rise mt-6 grid w-full max-w-3xl grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4 sm:gap-6"
            style={{ animationDelay: '360ms' }}
          >
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1.5">
                <dt className="text-muted-foreground text-xs">{stat.label}</dt>
                <dd className="flex items-center gap-1.5 font-mono text-sm font-medium">
                  <stat.icon className="text-primary size-3.5" />
                  {stat.value}
                </dd>
                <dd className="text-muted-foreground/70 text-[11px]">{stat.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </PipelineStory>

      {/* Scrolling ticker of the graph's typed vocabulary */}
      <NodeTypeMarquee />
    </section>
  )
}
