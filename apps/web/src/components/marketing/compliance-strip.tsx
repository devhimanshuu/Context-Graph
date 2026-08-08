import { ShieldCheck } from 'lucide-react'
import { Reveal } from './reveal'

const STANDARDS = [
  { name: 'HIPAA', detail: 'Protected health data' },
  { name: 'SOC 2', detail: 'Security & availability' },
  { name: 'GDPR', detail: 'EU data rights' },
  { name: 'ISO 27001', detail: 'Security management' },
  { name: 'CCPA', detail: 'California privacy' },
] as const

/* Compliance strip — the trust signals regulated buyers look for first. */
export function ComplianceStrip() {
  return (
    <section
      id="compliance"
      className="relative scroll-mt-20 overflow-hidden border-t py-16 lg:py-20"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            ▸ Compliance
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            Built for regulated environments
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Compliance-ready by design — audit trails, permission enforcement and data controls that
            map to the frameworks you already report under.
          </p>
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          {STANDARDS.map((standard, index) => (
            <Reveal key={standard.name} delay={index * 60}>
              <div className="group bg-background/60 hover:border-primary/30 flex items-center gap-3 rounded-full border px-5 py-2.5 transition-all duration-300 hover:-translate-y-0.5">
                <ShieldCheck className="text-primary size-4 transition-transform duration-300 group-hover:scale-110" />
                <div className="text-left leading-tight">
                  <p className="text-sm font-semibold tracking-tight">{standard.name}</p>
                  <p className="text-muted-foreground text-[11px]">{standard.detail}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
