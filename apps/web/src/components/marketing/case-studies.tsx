import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Reveal } from './reveal'

interface CaseStudy {
  industry: string
  company: string
  headline: string
  challenge: string
  approach: string
  stat: string
  statLabel: string
}

const CASE_STUDIES: readonly CaseStudy[] = [
  {
    industry: 'Healthcare',
    company: 'Meridian Health System',
    headline: 'Protocol answers clinicians can trust',
    challenge:
      'Care teams needed real-time answers on clinical protocols without risking hallucinated or superseded instructions.',
    approach:
      '4,800 protocol facts and constraints were modeled as typed nodes, gated by role and tagged for compliance.',
    stat: '100%',
    statLabel: 'of answers trace to approved sources',
  },
  {
    industry: 'Finance',
    company: 'Apex Compliance Group',
    headline: 'Regulatory Q&A that holds up in review',
    challenge:
      'Analysts had to reconcile retrieval results against a fast-moving regulatory calendar before every response.',
    approach:
      'Deterministic rules gate each answer and the full decision path is written to an append-only audit log.',
    stat: '40%',
    statLabel: 'fewer compliance escalations',
  },
  {
    industry: 'Legal',
    company: 'Crane & Voss LLP',
    headline: 'Precedent retrieval with privilege intact',
    challenge:
      'Partners needed jurisdiction- and matter-scoped retrieval without leaking privileged material across teams.',
    approach:
      'Matter-level permission profiles isolate every search; sources are versioned with full provenance.',
    stat: 'Seconds',
    statLabel: 'to find relevant precedent, not days',
  },
]

/* Mini case studies — challenge → approach → measurable result. */
export function CaseStudies() {
  return (
    <section
      id="case-studies"
      className="bg-muted/30 relative scroll-mt-20 overflow-hidden border-y py-20 lg:py-24"
    >
      <div className="relative mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            ▸ Case studies
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            How teams put knowledge to work
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Real problem, governed approach, measurable outcome.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CASE_STUDIES.map((study, index) => (
            <Reveal key={study.company} delay={index * 100} className="h-full">
              <Card className="group hover:border-primary/30 relative flex h-full flex-col overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(var(--cg-glow),0.35)]">
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-primary font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
                      {study.industry}
                    </span>
                    <ArrowRight className="text-muted-foreground/50 group-hover:text-primary size-4 transition-all duration-300 group-hover:translate-x-0.5" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{study.headline}</h3>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="text-muted-foreground text-sm leading-relaxed">{study.challenge}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{study.approach}</p>
                  <div className="border-primary/20 mt-auto border-t pt-4">
                    <p className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                      {study.stat}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {study.statLabel}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
