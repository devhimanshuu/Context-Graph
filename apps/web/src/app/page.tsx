import type { Metadata } from 'next'
import {
  Building2,
  Cpu,
  Factory,
  GraduationCap,
  HeartPulse,
  Landmark,
  Scale,
  type LucideIcon,
} from 'lucide-react'
import { SiteHeader } from '@/components/marketing/site-header'
import { Hero } from '@/components/marketing/hero'
import { FeatureGrid } from '@/components/marketing/feature-grid'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { ProductTour } from '@/components/marketing/product-tour'
import { UseCases } from '@/components/marketing/use-cases'
import { ComparisonTable } from '@/components/marketing/comparison-table'
import { CaseStudies } from '@/components/marketing/case-studies'
import { Integrations } from '@/components/marketing/integrations'
import { ComplianceStrip } from '@/components/marketing/compliance-strip'
import { FaqSection } from '@/components/marketing/faq-section'
import { CtaSection } from '@/components/marketing/cta-section'
import { Reveal } from '@/components/marketing/reveal'
import { SiteFooter } from '@/components/marketing/site-footer'
import { cn } from '@/lib/utils'
import { APP } from '@/constants'

export const metadata: Metadata = {
  title: `${APP.name} — ${APP.subtitle}`,
  description: APP.description,
}

/**
 * Industry icon wall — the muted icon colorizes on hover, mimicking a
 * grayscale-to-color logo wall without inventing real customer logos.
 */
const INDUSTRIES = [
  { name: 'Healthcare', icon: HeartPulse, tone: 'group-hover:text-rose-500' },
  { name: 'Finance', icon: Landmark, tone: 'group-hover:text-emerald-500' },
  { name: 'Legal', icon: Scale, tone: 'group-hover:text-violet-500' },
  { name: 'Technology', icon: Cpu, tone: 'group-hover:text-sky-500' },
  { name: 'Education', icon: GraduationCap, tone: 'group-hover:text-amber-500' },
  { name: 'Manufacturing', icon: Factory, tone: 'group-hover:text-orange-500' },
  { name: 'Government', icon: Building2, tone: 'group-hover:text-indigo-500' },
] as const satisfies readonly { name: string; icon: LucideIcon; tone: string }[]

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />

        {/* Industry strip — trusted-by band: live label + icon wall */}
        <section className="bg-muted/20 border-y">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6">
            <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
              <span className="flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.2em] text-emerald-500 uppercase">
                <span className="relative flex size-1.5" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                Trusted by teams in regulated industries
              </span>
              <p className="text-foreground/80 text-sm font-medium tracking-tight">
                Domain-agnostic by design — deployed from healthcare to government
              </p>
            </Reveal>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              {INDUSTRIES.map((industry, index) => (
                <Reveal key={industry.name} delay={index * 50}>
                  <span className="group bg-background/60 hover:border-primary/40 relative inline-flex items-center gap-2.5 overflow-hidden rounded-full border px-4 py-2 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_-6px_rgba(var(--cg-glow),0.5)]">
                    {/* Breathing halo behind the icon — echoes the hero's live
                        motion with its aurora palette. */}
                    <span
                      aria-hidden="true"
                      className="animate-cg-halo pointer-events-none absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500/50 via-sky-500/50 to-fuchsia-500/50 blur-md transition-[filter] duration-300 group-hover:blur-sm"
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-fuchsia-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                    {/* Grayscale icon that colorizes on hover, like a logo wall */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'text-muted-foreground relative transition-colors duration-300',
                        industry.tone,
                      )}
                    >
                      <industry.icon className="size-4" />
                    </span>
                    <span className="text-muted-foreground group-hover:text-foreground relative text-sm transition-colors duration-300">
                      {industry.name}
                    </span>
                  </span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <FeatureGrid />
        <HowItWorks />
        <ProductTour />
        <UseCases />
        <ComparisonTable />
        <CaseStudies />
        <Integrations />
        <ComplianceStrip />
        <FaqSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
