import type { Metadata } from 'next'
import { Boxes } from 'lucide-react'
import { FeaturePlaceholder } from '@/components/dashboard/feature-placeholder'
import { PageHeader } from '@/components/dashboard/page-header'

export const metadata: Metadata = {
  title: 'Contexts',
}

export default function ContextsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contexts"
        description="Assemble permission-aware context packages for AI systems."
      />
      <FeaturePlaceholder
        icon={Boxes}
        title="Contexts"
        description="Context assembly — combining graph traversal output, rules and permissions into LLM-ready payloads — arrives in Phase 3."
        items={[
          'Context templates and assembly rules',
          'Permission-aware context filtering',
          'Token budget management',
          'Context versioning and audit trail',
        ]}
      />
    </div>
  )
}
