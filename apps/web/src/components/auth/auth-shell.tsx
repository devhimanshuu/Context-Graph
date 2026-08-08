import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Boxes, ScrollText, ShieldCheck } from 'lucide-react'
import { AppLogo } from '@/components/layout/app-logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { HeroBackdrop } from '@/components/marketing/hero-backdrop'
import { PipelineStory } from '@/components/marketing/pipeline-story'
import { RotatingStatus } from '@/components/marketing/rotating-status'
import { APP, ROUTES } from '@/constants'

/* Shared auth shell: a split-screen brand panel (animated backdrop, live */
const AUTH_BULLETS = [
  {
    icon: Boxes,
    title: 'Graph traversal',
    description: 'Retrieve knowledge by traversing your organization\u2019s knowledge graph.',
  },
  {
    icon: ScrollText,
    title: 'Deterministic rules',
    description: 'Priority-ordered, explainable evaluation of context-building rules.',
  },
  {
    icon: ShieldCheck,
    title: 'Permission-aware',
    description: 'Role, department, and compliance filtering on every context package.',
  },
] as const

const AUTH_STATS = [
  { label: 'Traversal', value: 'BFS', icon: Boxes },
  { label: 'Rules', value: 'Deterministic', icon: ScrollText },
  { label: 'Access', value: 'Permission-aware', icon: ShieldCheck },
] as const

interface AuthShellProps {
  children: ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-svh flex-col">
      {/* One shared clock drives the status line on both the desktop brand
          panel and the compact mobile strip — a single coherent live demo. */}
      <PipelineStory>
        <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* Brand panel — only on large screens, mirrors the landing hero's motion */}
          <aside className="border-border/60 relative hidden overflow-hidden lg:flex lg:flex-col lg:border-r">
            <HeroBackdrop />
            <div className="relative z-10 flex flex-1 flex-col gap-8 px-10 py-8 xl:px-14 xl:py-10">
              <AppLogo />

              <div className="flex flex-1 flex-col justify-center gap-7">
                <Badge
                  variant="outline"
                  className="cg-rise bg-background/60 self-start font-mono text-[10px] font-medium tracking-[0.18em] uppercase"
                >
                  <span className="relative mr-2 flex size-1.5" aria-hidden="true">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                  </span>
                  {APP.subtitle}
                </Badge>

                <h2
                  className="cg-rise text-3xl leading-[1.12] font-semibold tracking-tight text-balance xl:text-4xl"
                  style={{ animationDelay: '90ms' }}
                >
                  Turn organizational knowledge into{' '}
                  <span className="animate-cg-shimmer bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-transparent">
                    governed AI context
                  </span>
                </h2>

                <div className="cg-rise" style={{ animationDelay: '180ms' }}>
                  <RotatingStatus />
                </div>

                <ul className="cg-rise grid gap-3.5" style={{ animationDelay: '240ms' }}>
                  {AUTH_BULLETS.map(({ icon: Icon, title, description }) => (
                    <li key={title} className="flex items-start gap-3.5">
                      <span className="border-border/70 bg-background/60 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border">
                        <Icon className="text-primary size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{title}</p>
                        <p className="text-muted-foreground text-sm">{description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <dl className="border-border/70 grid grid-cols-3 gap-6 border-t pt-6">
                {AUTH_STATS.map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-1.5">
                    <dt className="text-muted-foreground text-xs">{stat.label}</dt>
                    <dd className="flex items-center gap-2 font-mono text-sm font-medium">
                      <stat.icon className="text-primary size-4" />
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>

          {/* Form panel */}
          <main className="relative flex flex-col">
            <div className="from-primary/[0.05] pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent" />
            <div className="relative flex items-center justify-between px-4 py-4 md:px-8">
              <AppLogo className="lg:hidden" href={ROUTES.home} />
              <div className="ml-auto flex items-center gap-1.5">
                <ThemeToggle />
                <Link
                  href={ROUTES.home}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to home
                </Link>
              </div>
            </div>

            <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8">
              {/* Compact brand line for small screens (the aside is hidden below lg) */}
              <div className="mb-8 lg:hidden">
                <RotatingStatus />
              </div>
              <div className="w-full max-w-md">{children}</div>
            </div>
          </main>
        </div>
      </PipelineStory>

      {/* Bottom hairline — a thin brand-tinted line with a soft upward fade,
          so the page dissolves into the background instead of ending abruptly. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="h-14 bg-gradient-to-t from-indigo-500/5 to-transparent" />
        <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      </div>
    </div>
  )
}
