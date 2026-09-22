import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { AppLogo } from '@/components/layout/app-logo'
import { Reveal } from './reveal'
import { APP, ROUTES } from '@/constants'

interface FooterLink {
  label: string
  href: string
}

const FOOTER_COLUMNS: ReadonlyArray<{ heading: string; links: readonly FooterLink[] }> = [
  {
    heading: 'Product',
    links: [
      { label: 'Knowledge Graph', href: ROUTES.knowledgeGraph },
      { label: 'Pipeline', href: ROUTES.pipeline },
      { label: 'Rules', href: ROUTES.rules },
      { label: 'Permissions', href: ROUTES.permissions },
      { label: 'Guardrails', href: ROUTES.guardrails },
      { label: 'Agent Playground', href: ROUTES.agentPlayground },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Security', href: '#security' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'Agent Playground', href: ROUTES.agentPlayground },
      { label: 'MCP Tools', href: '#features' },
      { label: 'Multi-Agent Demo', href: ROUTES.multiAgentDemo },
      { label: 'Events', href: ROUTES.events },
      { label: 'Changelog', href: '#changelog' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t">
      {/* Gradient hairline divider */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
        aria-hidden="true"
      />

      {/* Giant watermark — same brand gradient as the logo wordmark. Light theme needs
          a higher opacity for the mid-tone gradient to read on white; dark stays subtle. */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 flex w-full -translate-x-1/2 -translate-y-1/2 items-center justify-center opacity-[0.08] dark:opacity-[0.02]">
        <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-[16vw] leading-none font-black tracking-tighter whitespace-nowrap text-transparent select-none">
          CONTEXTGRAPH
        </span>
      </div>

      <div className="relative z-10 mx-auto w-[90%] max-w-7xl px-4 py-14 md:px-6">
        {/* Logo & description: full width on mobile, side column on desktop */}
        <Reveal>
          <div className="mb-10 space-y-5 lg:mb-0 lg:grid lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] lg:gap-10">
            <div className="space-y-5">
              <AppLogo />
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                The governed context, memory, and guardrail infrastructure layer for AI agents.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Link columns: 1-col mobile, 2-col sm, 4-col lg */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_COLUMNS.map((column, index) => (
            <Reveal key={column.heading} delay={120 + index * 80}>
              <p className="text-primary font-mono text-[10px] font-medium tracking-[0.25em] uppercase">
                {column.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1 text-sm transition-colors"
                    >
                      {link.label}
                      <ArrowUpRight
                        className="size-3 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="text-muted-foreground mt-14 flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()}{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text font-semibold text-transparent">
                {APP.name}
              </span>{' '}
              · {APP.subtitle}
            </p>
            <p className="font-mono">
              <span className="text-emerald-500" aria-hidden="true">
                ●
              </span>{' '}
              v{APP.version}
            </p>
          </div>
        </Reveal>
      </div>
    </footer>
  )
}
