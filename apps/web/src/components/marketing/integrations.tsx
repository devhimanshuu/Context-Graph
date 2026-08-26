import { Ticker } from '@/components/ui/ticker'
import { Reveal } from './reveal'

const INTEGRATION_ITEMS = [
  { label: 'OpenAI', tone: 'bg-emerald-400' },
  { label: 'Anthropic', tone: 'bg-amber-400' },
  { label: 'LangChain', tone: 'bg-sky-400' },
  { label: 'LlamaIndex', tone: 'bg-fuchsia-400' },
  { label: 'Pinecone', tone: 'bg-emerald-400' },
  { label: 'Redis', tone: 'bg-red-400' },
  { label: 'PostgreSQL', tone: 'bg-sky-400' },
  { label: 'Supabase', tone: 'bg-emerald-400' },
  { label: 'Slack', tone: 'bg-violet-400' },
  { label: 'Jira', tone: 'bg-blue-400' },
  { label: 'Datadog', tone: 'bg-orange-400' },
  { label: 'Sentry', tone: 'bg-rose-400' },
] as const

/* Partner ecosystem marquee — the governed layer plugs into the stack you */
export function Integrations() {
  return (
    <section id="integrations" className="relative scroll-mt-20 border-t py-20 lg:py-24">
      <div className="mx-auto w-[90%] max-w-7xl px-4 md:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h3 className="text-primary font-mono text-xs font-medium tracking-[0.2em] uppercase">
            Integrations
          </h3>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.6rem]">
            Works with the stack you already run
          </h2>
          <p className="text-muted-foreground mt-4 text-base leading-relaxed">
            The governed context layer plugs into your models, vector stores, queues and
            observability tooling.
          </p>
        </Reveal>
      </div>

      <Reveal delay={120} className="mt-12">
        <Ticker
          items={INTEGRATION_ITEMS}
          prefix="Works with your stack"
          duration="38s"
          className="border-border/80 border-y py-5"
          fadeClassName="w-24"
        />
      </Reveal>
    </section>
  )
}
