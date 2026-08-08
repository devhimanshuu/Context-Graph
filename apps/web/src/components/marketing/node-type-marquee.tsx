import { Ticker } from '@/components/ui/ticker'
import { NODE_TYPE_TICKER_ITEMS } from '@/constants'

/** Scrolling ticker of typed knowledge nodes at the bottom of the hero. */
export function NodeTypeMarquee() {
  return (
    <div className="border-border/80 relative border-t">
      <Ticker items={NODE_TYPE_TICKER_ITEMS} prefix="Typed knowledge nodes" className="py-4" />
    </div>
  )
}
