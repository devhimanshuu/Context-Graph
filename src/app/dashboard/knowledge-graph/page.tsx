import type { Metadata } from 'next'
import { Waypoints } from 'lucide-react'
import { FeaturePlaceholder } from '@/components/dashboard/feature-placeholder'
import { PageHeader } from '@/components/dashboard/page-header'

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
        description="Graph traversal, node and edge management, and interactive visualization arrive in Phase 3."
        items={[
          'Graph traversal engine (BFS-based reachability)',
          'Interactive graph visualization (React Flow)',
          'Bulk import and provenance tracking',
          'Supersession and validity management',
        ]}
      />
    </div>
  )
}
