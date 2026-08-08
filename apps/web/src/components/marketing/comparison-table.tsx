import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'

interface ComparisonRow {
  capability: string
  diy: string
  contextGraph: string
}

const COMPARISON_ROWS: readonly ComparisonRow[] = [
  {
    capability: 'Permission-aware filtering',
    diy: 'Manual, error-prone',
    contextGraph: 'Enforced at the query layer',
  },
  {
    capability: 'Auditability',
    diy: 'Ad-hoc logging',
    contextGraph: 'Append-only, before/after snapshots',
  },
  {
    capability: 'Deterministic rules',
    diy: 'Bespoke code',
    contextGraph: 'Versioned declarative rules',
  },
  {
    capability: 'Tenant isolation',
    diy: 'By convention',
    contextGraph: 'A query-plan property',
  },
  {
    capability: 'Context assembly',
    diy: 'Prompt engineering',
    contextGraph: 'Token-budgeted packages',
  },
  {
    capability: 'Time to production',
    diy: 'Months of glue code',
    contextGraph: 'Days on a standard contract',
  },
]

/* Decision table — ContextGraph vs building a governed RAG pipeline yourself. */
export function ComparisonTable() {
  return (
    <section
      id="comparison"
      className="relative scroll-mt-20 overflow-hidden border-t py-20 lg:py-24"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            ▸ Comparison
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            A governed pipeline, not more glue code
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            Retrieval alone can&apos;t enforce policy. Here&apos;s what changes when context is a
            first-class, governed layer.
          </p>
        </Reveal>

        <Reveal delay={100} className="mx-auto mt-12 max-w-4xl">
          {/* Scrolls horizontally on narrow screens so columns keep readable width */}
          <div className="overflow-x-auto rounded-2xl border">
            <div className="bg-border grid min-w-[560px] grid-cols-[1.2fr_1fr_1fr] gap-px">
              <div className="bg-background/80 p-4" />
              <div className="bg-background/80 p-4 text-center">
                <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
                  DIY RAG pipeline
                </p>
              </div>
              <div className="bg-background/80 p-4 text-center">
                <p className="text-primary font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
                  ContextGraph
                </p>
              </div>

              {COMPARISON_ROWS.map((row) => (
                <div key={row.capability} className="contents">
                  <div className="bg-background flex items-center p-4 text-sm font-semibold tracking-tight">
                    {row.capability}
                  </div>
                  <div className="bg-background flex items-center justify-center gap-2 p-4 text-center">
                    <X className="text-muted-foreground/60 size-4 shrink-0" aria-hidden="true" />
                    <span className="text-muted-foreground text-sm leading-snug">{row.diy}</span>
                  </div>
                  <div className="bg-background flex items-center justify-center gap-2 p-4 text-center">
                    <Check className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span className={cn('text-sm leading-snug')}>{row.contextGraph}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
