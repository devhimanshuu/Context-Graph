import type { Metadata } from 'next'
import { ScrollText } from 'lucide-react'
import { FeaturePlaceholder } from '@/components/dashboard/feature-placeholder'
import { PageHeader } from '@/components/dashboard/page-header'

export const metadata: Metadata = {
  title: 'Rules',
}

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Rules" description="Author and manage the deterministic rule engine." />
      <FeaturePlaceholder
        icon={ScrollText}
        title="Rules"
        description="Rule storage and evaluation contracts live on the NestJS API; the evaluation loop arrives in Phase 6."
        items={[
          'Declarative rule authoring (JSON/YAML schemas)',
          'Deterministic evaluation engine',
          'Rule versioning and dry-run mode',
          'Evaluation audit logs',
        ]}
      />
    </div>
  )
}
