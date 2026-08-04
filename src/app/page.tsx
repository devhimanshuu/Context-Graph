import type { Metadata } from 'next'
import { SiteHeader } from '@/components/marketing/site-header'
import { Hero } from '@/components/marketing/hero'
import { FeatureGrid } from '@/components/marketing/feature-grid'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { ArchitectureSection } from '@/components/marketing/architecture-section'
import { CtaSection } from '@/components/marketing/cta-section'
import { Reveal } from '@/components/marketing/reveal'
import { SiteFooter } from '@/components/marketing/site-footer'
import { APP } from '@/constants'

export const metadata: Metadata = {
  title: `${APP.name} — ${APP.subtitle}`,
  description: APP.description,
}

const INDUSTRIES = [
  'Healthcare',
  'Finance',
  'Legal',
  'Technology',
  'Education',
  'Manufacturing',
  'Government',
] as const

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />

        {/* Industry strip */}
        <section className="border-y py-10">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
            <Reveal>
              <p className="text-muted-foreground text-center text-xs font-medium tracking-widest uppercase">
                Domain-agnostic by design — deployed across regulated industries
              </p>
            </Reveal>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {INDUSTRIES.map((industry, index) => (
                <Reveal key={industry} delay={index * 60}>
                  <span className="text-muted-foreground border-border/80 hover:border-primary/40 hover:text-foreground rounded-full border px-3.5 py-1.5 text-sm transition-colors">
                    {industry}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <FeatureGrid />
        <HowItWorks />
        <ArchitectureSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}
