/**
 * Scrolling ticker of the graph's typed vocabulary, echoing the node colors
 * used in the hero's graph visual. Pure CSS animation (translateX -50% over
 * duplicated halves for a seamless loop), pauses on hover, and freezes to a
 * static strip under prefers-reduced-motion.
 */
const NODE_TYPES = [
  { label: 'Fact', tone: 'bg-sky-400' },
  { label: 'Constraint', tone: 'bg-amber-400' },
  { label: 'Decision', tone: 'bg-indigo-400' },
  { label: 'Anti-pattern', tone: 'bg-rose-400' },
  { label: 'Policy', tone: 'bg-emerald-400' },
  { label: 'Precedent', tone: 'bg-violet-400' },
  { label: 'Workflow', tone: 'bg-teal-400' },
] as const

function NodeTypeGroup({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex items-center gap-10" aria-hidden={ariaHidden}>
      <span className="text-primary font-mono text-[10px] font-medium tracking-[0.25em] uppercase">
        Typed knowledge nodes
      </span>
      {NODE_TYPES.map((type) => (
        <span key={type.label} className="flex items-center gap-2 text-xs">
          <span className={`size-1.5 rounded-full ${type.tone}`} aria-hidden="true" />
          <span className="text-muted-foreground font-mono tracking-wider uppercase">
            {type.label}
          </span>
        </span>
      ))}
    </div>
  )
}

export function NodeTypeMarquee() {
  return (
    <div className="border-border/80 relative border-t">
      <div className="cg-marquee flex w-max items-center gap-10 py-4">
        <NodeTypeGroup />
        <NodeTypeGroup ariaHidden />
      </div>
      {/* Soft edge fades so items slide out of view naturally */}
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r to-transparent" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l to-transparent" />
    </div>
  )
}
