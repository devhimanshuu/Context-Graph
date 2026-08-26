import Link from 'next/link'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'
import { ROUTES } from '@/constants'

interface PricingTier {
  name: string
  price: string
  period: string
  description: string
  cta: string
  ctaHref: string
  featured: boolean
  badge?: string
  features: readonly { label: string; included: boolean }[]
}

const TIERS: readonly PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For teams evaluating governed context for the first time.',
    cta: 'Get started',
    ctaHref: ROUTES.signUp,
    featured: false,
    features: [
      { label: 'Up to 1,000 knowledge nodes', included: true },
      { label: '1 organization', included: true },
      { label: 'Graph traversal & BFS', included: true },
      { label: 'Deterministic rules (5 active)', included: true },
      { label: 'Permission-aware filtering', included: true },
      { label: 'Context assembly', included: true },
      { label: 'Agent Playground', included: true },
      { label: 'Community support', included: true },
      { label: 'Custom domains', included: false },
      { label: 'SSO / SAML', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$299',
    period: '/month',
    description: 'For production teams running governed AI context pipelines.',
    cta: 'Start free trial',
    ctaHref: ROUTES.signUp,
    featured: true,
    badge: 'Most popular',
    features: [
      { label: 'Up to 100,000 knowledge nodes', included: true },
      { label: 'Up to 10 organizations', included: true },
      { label: 'Everything in Free', included: true },
      { label: 'Unlimited rules', included: true },
      { label: 'Action guardrails (check_action)', included: true },
      { label: 'Governed write-back (propose_node)', included: true },
      { label: 'Real-time SSE events', included: true },
      { label: 'MCP tool server', included: true },
      { label: 'Agent identity & capabilities', included: true },
      { label: 'Email support (48h)', included: true },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For regulated organizations with custom compliance and deployment needs.',
    cta: 'Contact sales',
    ctaHref: '#contact',
    featured: false,
    features: [
      { label: 'Unlimited knowledge nodes', included: true },
      { label: 'Unlimited organizations', included: true },
      { label: 'Everything in Pro', included: true },
      { label: 'Multi-agent orchestration', included: true },
      { label: 'Custom compliance frameworks', included: true },
      { label: 'SSO / SAML / SCIM', included: true },
      { label: 'On-premise deployment', included: true },
      { label: 'Dedicated support & SLA', included: true },
      { label: 'Custom integrations', included: true },
      { label: 'Audit export & reporting', included: true },
    ],
  },
] as const

export function Pricing() {
  return (
    <section
      id="pricing"
      className="bg-muted/30 relative scroll-mt-20 overflow-hidden border-y py-20 lg:py-24"
    >
      <div className="cg-grid-bg absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            ▸ Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            Start free, scale when ready
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Every tier includes the full governed context pipeline. Scale nodes, organizations, and
            features as your AI infrastructure grows.
          </p>
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
          {TIERS.map((tier, index) => (
            <Reveal key={tier.name} delay={index * 100} className="h-full">
              <div
                className={cn(
                  'relative flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300',
                  tier.featured
                    ? 'border-primary/40 shadow-[0_24px_80px_-20px_rgba(var(--cg-glow),0.35)]'
                    : 'hover:border-primary/25',
                )}
              >
                {/* Featured gradient wash */}
                {tier.featured && (
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-fuchsia-500/[0.06]"
                    aria-hidden="true"
                  />
                )}

                <div className="relative p-6 pb-0">
                  {tier.badge && (
                    <Badge className="mb-3 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-[10px] text-white">
                      {tier.badge}
                    </Badge>
                  )}
                  <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                    {tier.period && (
                      <span className="text-muted-foreground text-sm">{tier.period}</span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="relative flex flex-1 flex-col p-6 pt-4">
                  <ul className="space-y-2.5">
                    {tier.features.map((feature) => (
                      <li key={feature.label} className="flex items-start gap-2.5 text-sm">
                        {feature.included ? (
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-emerald-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <Minus
                            className="text-muted-foreground/40 mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span className={cn(feature.included ? '' : 'text-muted-foreground/50')}>
                          {feature.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    <Button
                      asChild
                      variant={tier.featured ? 'default' : 'outline'}
                      className={cn(
                        'w-full',
                        tier.featured && 'shadow-[0_4px_20px_-4px_rgba(var(--cg-glow),0.5)]',
                      )}
                    >
                      <Link href={tier.ctaHref}>
                        {tier.cta}
                        <ArrowRight className="ml-1.5 size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="text-muted-foreground/60 mt-8 text-center text-xs">
          All prices in USD. Enterprise pricing includes dedicated infrastructure, custom SLAs, and
          compliance configuration.
        </p>
      </div>
    </section>
  )
}
