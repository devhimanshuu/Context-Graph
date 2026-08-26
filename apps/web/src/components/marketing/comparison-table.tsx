import { Check, Minus, X } from 'lucide-react'
import { Reveal } from './reveal'

interface ComparisonRow {
  capability: string
  langchain: string
  vectordb: string
  contextGraph: string
}

const COMPARISON_ROWS: readonly ComparisonRow[] = [
  {
    capability: 'Deterministic rules',
    langchain: 'Chains, non-deterministic',
    vectordb: 'Not applicable',
    contextGraph: 'Versioned declarative rules',
  },
  {
    capability: 'Permission-aware filtering',
    langchain: 'Manual retrieval filters',
    vectordb: 'Metadata filtering only',
    contextGraph: 'Enforced at the query layer',
  },
  {
    capability: 'Action guardrails',
    langchain: 'Not built-in',
    vectordb: 'Not applicable',
    contextGraph: 'Built-in check_action',
  },
  {
    capability: 'Audit trail',
    langchain: 'LangSmith (separate)',
    vectordb: 'Not built-in',
    contextGraph: 'Append-only, before/after snapshots',
  },
  {
    capability: 'Multi-tenant isolation',
    langchain: 'By convention',
    vectordb: 'Namespace/collection',
    contextGraph: 'A query-plan property',
  },
  {
    capability: 'Context assembly',
    langchain: 'Manual prompt assembly',
    vectordb: 'Raw chunks returned',
    contextGraph: 'Token-budgeted context packages',
  },
  {
    capability: 'Knowledge governance',
    langchain: 'Not built-in',
    vectordb: 'Not applicable',
    contextGraph: 'Propose, validate, approve, publish',
  },
  {
    capability: 'Real-time events',
    langchain: 'Callbacks',
    vectordb: 'Not built-in',
    contextGraph: 'SSE + transactional outbox',
  },
  {
    capability: 'Agent identity & capabilities',
    langchain: 'Not built-in',
    vectordb: 'Not applicable',
    contextGraph: 'Service accounts with scoped capabilities',
  },
  {
    capability: 'Time to production',
    langchain: 'Weeks of wiring',
    vectordb: 'Fast start, governance later',
    contextGraph: 'Days with governed defaults',
  },
]

/**
 * Comparison table — ContextGraph vs LangChain and vector DB approaches.
 * Three columns show that governed context is a different category, not
 * a better version of the same thing.
 */
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
            Retrieval frameworks and vector databases solve part of the problem. ContextGraph adds
            the governance layer that enterprise AI requires.
          </p>
        </Reveal>

        <Reveal delay={100} className="mx-auto mt-12 max-w-5xl">
          {/* Mobile: card-based layout. Desktop: table layout. */}
          <div className="space-y-3 lg:space-y-0">
            {/* Desktop table — hidden on mobile */}
            <div className="hidden overflow-x-auto rounded-2xl border lg:block">
              <div className="bg-border grid min-w-[680px] grid-cols-[1.2fr_1fr_1fr_1fr] gap-px">
                <div className="bg-background/80 p-4" />
                <div className="bg-background/80 p-4 text-center">
                  <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
                    LangChain
                  </p>
                  <p className="text-muted-foreground/60 mt-0.5 text-[10px]">Agent framework</p>
                </div>
                <div className="bg-background/80 p-4 text-center">
                  <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
                    Vector DB
                  </p>
                  <p className="text-muted-foreground/60 mt-0.5 text-[10px]">Retrieval layer</p>
                </div>
                <div className="bg-background/80 p-4 text-center">
                  <p className="text-primary font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
                    ContextGraph
                  </p>
                  <p className="text-muted-foreground/60 mt-0.5 text-[10px]">
                    Governed context layer
                  </p>
                </div>

                {COMPARISON_ROWS.map((row) => (
                  <div key={row.capability} className="contents">
                    <div className="bg-background flex items-center p-4 text-sm font-semibold tracking-tight">
                      {row.capability}
                    </div>
                    <div className="bg-background flex items-center justify-center gap-2 p-3 text-center">
                      {row.langchain === 'Not built-in' || row.langchain === 'Not applicable' ? (
                        <X
                          className="text-muted-foreground/50 size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Minus className="size-3.5 shrink-0 text-amber-500/70" aria-hidden="true" />
                      )}
                      <span className="text-muted-foreground text-xs leading-snug">
                        {row.langchain}
                      </span>
                    </div>
                    <div className="bg-background flex items-center justify-center gap-2 p-3 text-center">
                      {row.vectordb === 'Not built-in' || row.vectordb === 'Not applicable' ? (
                        <X
                          className="text-muted-foreground/50 size-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Minus className="size-3.5 shrink-0 text-amber-500/70" aria-hidden="true" />
                      )}
                      <span className="text-muted-foreground text-xs leading-snug">
                        {row.vectordb}
                      </span>
                    </div>
                    <div className="bg-background flex items-center justify-center gap-2 p-3 text-center">
                      <Check className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                      <span className="text-xs leading-snug">{row.contextGraph}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile cards — shown only below lg */}
          <div className="space-y-4 lg:hidden">
            {COMPARISON_ROWS.map((row, index) => (
              <div key={row.capability} className="bg-background/60 rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold tracking-tight">{row.capability}</p>
                  <span className="text-muted-foreground/40 font-mono text-[9px]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5 text-xs">
                    {row.langchain === 'Not built-in' || row.langchain === 'Not applicable' ? (
                      <X
                        className="text-muted-foreground/50 mt-0.5 size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Minus
                        className="mt-0.5 size-3.5 shrink-0 text-amber-500/70"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-muted-foreground/60 w-20 shrink-0 font-medium">
                      LangChain
                    </span>
                    <span className="text-muted-foreground min-w-0 leading-snug">
                      {row.langchain}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs">
                    {row.vectordb === 'Not built-in' || row.vectordb === 'Not applicable' ? (
                      <X
                        className="text-muted-foreground/50 mt-0.5 size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <Minus
                        className="mt-0.5 size-3.5 shrink-0 text-amber-500/70"
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-muted-foreground/60 w-20 shrink-0 font-medium">
                      Vector DB
                    </span>
                    <span className="text-muted-foreground min-w-0 leading-snug">
                      {row.vectordb}
                    </span>
                  </div>
                  <div className="border-primary/15 flex items-start gap-2.5 border-t pt-2.5 text-xs">
                    <Check
                      className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="text-primary/80 w-20 shrink-0 font-medium">ContextGraph</span>
                    <span className="min-w-0 leading-snug font-medium">{row.contextGraph}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-muted-foreground/60 mt-4 text-center text-xs">
            ContextGraph is not a replacement for LangChain or vector databases — it is the
            governance layer that sits between your agents and your knowledge.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
