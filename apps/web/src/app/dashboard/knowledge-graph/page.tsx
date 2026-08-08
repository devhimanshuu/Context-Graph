import type { Metadata } from 'next'
import { Waypoints } from 'lucide-react'
import { FeaturePlaceholder } from '@/components/dashboard/feature-placeholder'
import { PageHeader } from '@/components/dashboard/page-header'
import { Ticker } from '@/components/ui/ticker'
import { NODE_TYPE_TICKER_ITEMS } from '@/constants'

export const metadata: Metadata = {
  title: 'Knowledge Graph',
}

export default function KnowledgeGraphPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Graph"
        description="Explore and author the organizational knowledge graph."
      />
      <FeaturePlaceholder
        icon={Waypoints}
        title="Knowledge Graph"
        description="Interactive visualization arrives in Phase 7 — the NestJS Graph API is already live."
        items={[
          'Graph traversal engine (BFS-based reachability)',
          'Interactive graph visualization (React Flow)',
          'Bulk import and provenance tracking',
          'Supersession and validity management',
        ]}
      />

      <Ticker
        items={NODE_TYPE_TICKER_ITEMS}
        prefix="Typed knowledge nodes"
        className="rounded-xl border py-3"
        fadeClassName="w-16"
      />
    </div>
  )
}
