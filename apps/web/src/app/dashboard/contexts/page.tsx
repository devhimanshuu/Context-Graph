import type { Metadata } from 'next'
import { Boxes } from 'lucide-react'
import { FeaturePlaceholder } from '@/components/dashboard/feature-placeholder'
import { PageHeader } from '@/components/dashboard/page-header'
import { Ticker } from '@/components/ui/ticker'

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
        description="Context assembly — combining traversal, rules and permissions into LLM-ready payloads — arrives in Phase 7."
        items={[
          'Context templates and assembly rules',
          'Permission-aware context filtering',
          'Token budget management',
          'Context versioning and audit trail',
        ]}
      />

      <Ticker
        prefix="Context assembly"
        items={[
          { label: 'Templates', tone: 'bg-sky-400' },
          { label: 'Rules', tone: 'bg-amber-400' },
          { label: 'Permissions', tone: 'bg-indigo-400' },
          { label: 'Token budgets', tone: 'bg-fuchsia-400' },
          { label: 'Versioning', tone: 'bg-emerald-400' },
          { label: 'Audit trail', tone: 'bg-violet-400' },
        ]}
        className="rounded-xl border py-3"
        fadeClassName="w-16"
      />
    </div>
  )
}
