'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from './reveal'

interface FaqItem {
  question: string
  answer: string
}

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: 'How does permission-aware filtering work?',
    answer:
      'Every read passes through the same pipeline: role, permission profile and compliance clearance are evaluated against the requesting user before any content is returned. The filtering is a query-plan property, not a convention teams have to remember.',
  },
  {
    question: 'Can it integrate with the LLMs we already use?',
    answer:
      'Yes. ContextGraph assembles governed context packages that any model can consume — from OpenAI and Anthropic to self-hosted or on-prem models. The platform composes the context; your model stays your choice.',
  },
  {
    question: 'Is it multi-tenant and safe for regulated industries?',
    answer:
      'Multi-tenancy is built into the schema: every row anchors to an organization, so isolation is enforced at the query level. Audit logs are append-only, and the platform is designed for HIPAA, SOC 2 and GDPR-style requirements from day one.',
  },
  {
    question: 'We already use RAG. How is this different?',
    answer:
      'A plain RAG pipeline retrieves chunks without governance. ContextGraph layers a knowledge graph, deterministic rules and permission filtering on top of retrieval — so answers are traceable to approved sources, constrained by policy, and safe to audit.',
  },
  {
    question: 'What does it take to get started?',
    answer:
      'You model your knowledge as typed nodes and edges, connect your sources, and define roles and rules. Teams typically stand up their first governed context package in days on a standard contract.',
  },
]

/* Accordion FAQ — one open panel at a time, animated via the grid-rows trick. */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section
      id="faq"
      className="bg-muted/30 relative scroll-mt-20 overflow-hidden border-y py-20 lg:py-24"
    >
      <div className="cg-grid-bg absolute inset-0 opacity-40" aria-hidden="true" />

      <div className="relative mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h3 className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            FAQ
          </h3>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            Questions, answered
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            The essentials on how governed AI context actually works.
          </p>
        </Reveal>

        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <Reveal key={item.question} delay={index * 60}>
                <div
                  className={cn(
                    'bg-background/70 overflow-hidden rounded-xl border transition-colors duration-300',
                    isOpen
                      ? 'hover:border-primary/40 border-primary/30'
                      : 'hover:border-primary/25',
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold tracking-tight">{item.question}</span>
                    <ChevronDown
                      className={cn(
                        'text-muted-foreground size-4 shrink-0 transition-transform duration-300',
                        isOpen && 'text-primary rotate-180',
                      )}
                    />
                  </button>
                  <div
                    id={`faq-panel-${index}`}
                    className={cn(
                      'grid transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="text-muted-foreground px-5 pb-5 text-sm leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
