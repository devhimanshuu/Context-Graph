import Link from 'next/link'
import { ArrowRight, Boxes, ScrollText, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeroBackdrop } from './hero-backdrop'
import { NodeTypeMarquee } from './node-type-marquee'
import { RotatingStatus } from './rotating-status'
import { TokenMeter } from './token-meter'
import { APP, ROUTES } from '@/constants'

const HERO_STATS = [
  { label: 'Traversal', value: 'BFS', icon: Boxes },
  { label: 'Rules', value: 'Deterministic', icon: ScrollText },
  { label: 'Access', value: 'Permission-aware', icon: ShieldCheck },
] as const

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Animated backdrop: aurora orbs, crawling grid, data streams, scan
          beam, particles — with mouse parallax. */}
      <HeroBackdrop />

      <div className="relative mx-auto flex w-full max-w-full flex-col items-center justify-center gap-8 px-4 pt-20 pb-24 text-center md:px-8 lg:px-12 lg:pt-32 lg:pb-40">
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
          className="cg-rise text-4xl leading-[1.06] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[4rem]"
          style={{ animationDelay: '90ms' }}
        >
          The knowledge graph for your{' '}
          <span className="animate-cg-shimmer bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-transparent">
            AI systems
          </span>
        </h1>

        <p
          className="cg-rise text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg lg:text-xl"
          style={{ animationDelay: '180ms' }}
        >
          {APP.description} Built for regulated, knowledge-heavy industries — domain-agnostic by
          design, multi-tenant by default.
        </p>

        <div className="cg-rise" style={{ animationDelay: '230ms' }}>
          <RotatingStatus />
        </div>

        <div
          className="cg-rise flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: '270ms' }}
        >
          <Button
            size="lg"
            className="group h-12 px-8 text-base shadow-[0_8px_32px_-8px_rgba(99,102,241,0.5)] transition-shadow hover:shadow-[0_8px_40px_-6px_rgba(99,102,241,0.65)]"
            asChild
          >
            <Link href={ROUTES.login}>
              Get started free
              <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
            <Link href={ROUTES.login}>Explore the platform</Link>
          </Button>
        </div>

        <p
          className="cg-rise text-muted-foreground font-mono text-xs"
          style={{ animationDelay: '320ms' }}
        >
          <span className="text-emerald-500">$</span> no credit card required · deploy on Vercel +
          Supabase PostgreSQL
        </p>

        <dl
          className="cg-rise mt-8 grid w-full max-w-2xl grid-cols-3 gap-6 border-t pt-8"
          style={{ animationDelay: '400ms' }}
        >
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2">
              <dt className="text-muted-foreground text-xs">{stat.label}</dt>
              <dd className="flex items-center gap-2 font-mono text-sm font-medium">
                <stat.icon className="text-primary size-4" />
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="cg-rise w-full max-w-md" style={{ animationDelay: '480ms' }}>
          <TokenMeter />
        </div>
      </div>

      {/* Scrolling ticker of the graph's typed vocabulary */}
      <NodeTypeMarquee />
    </section>
  )
}
