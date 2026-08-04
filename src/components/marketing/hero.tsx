import Link from 'next/link'
import { ArrowRight, Boxes, ScrollText, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GraphVisual } from './graph-visual'
import { APP, ROUTES } from '@/constants'

const HERO_STATS = [
  { label: 'Traversal', value: 'BFS', icon: Boxes },
  { label: 'Rules', value: 'Deterministic', icon: ScrollText },
  { label: 'Access', value: 'Permission-aware', icon: ShieldCheck },
] as const

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Backdrop */}
      <div className="cg-grid-bg absolute inset-0" aria-hidden="true" />
      <div
        className="absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pt-16 pb-20 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24 lg:pb-28">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="outline" className="gap-2 rounded-full px-3 py-1">
            <span className="bg-primary size-1.5 rounded-full" aria-hidden="true" />
            {APP.subtitle}
          </Badge>

          <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            The knowledge graph for your{' '}
            <span className="animate-cg-shimmer bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-transparent">
              AI systems
            </span>
          </h1>

          <p className="text-muted-foreground max-w-xl text-base leading-relaxed sm:text-lg">
            {APP.description} Built for regulated, knowledge-heavy industries — domain-agnostic by
            design, multi-tenant by default.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href={ROUTES.login}>
                Get started free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={ROUTES.login}>Explore the platform</Link>
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            No credit card required · Deploy on Vercel + Supabase PostgreSQL
          </p>

          <dl className="mt-2 grid w-full grid-cols-3 gap-4 border-t pt-6">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-xs">{stat.label}</dt>
                <dd className="flex items-center gap-1.5 text-sm font-medium">
                  <stat.icon className="text-primary size-3.5" />
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Product-style visual */}
        <div className="relative">
          <div
            className="animate-cg-float bg-background absolute -top-6 -right-2 z-10 hidden rounded-lg border px-3 py-2 shadow-lg sm:block"
            aria-hidden="true"
          >
            <p className="text-muted-foreground text-[10px] font-medium">Context assembly</p>
            <p className="text-sm font-semibold text-emerald-500">Ready · 128 tokens</p>
          </div>

          <div className="border-border/80 bg-card overflow-hidden rounded-2xl border shadow-2xl">
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="size-2 rounded-full bg-red-400/70" />
                <span className="size-2 rounded-full bg-amber-400/70" />
                <span className="size-2 rounded-full bg-emerald-400/70" />
              </div>
              <p className="text-muted-foreground mt-2 text-xs">Workspace · Inpatient Assessment</p>
            </div>
            <GraphVisual className="bg-muted/30 px-2 py-6" />
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs">
              <span className="text-muted-foreground">18 nodes · 11 typed edges</span>
              <Badge variant="secondary">HIPAA-aware</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
