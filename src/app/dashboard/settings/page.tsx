import type { Metadata } from 'next'
import { Settings } from 'lucide-react'
import { FeaturePlaceholder } from '@/components/dashboard/feature-placeholder'
import { PageHeader } from '@/components/dashboard/page-header'

export const metadata: Metadata = {
  title: 'Settings',
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Workspace configuration and preferences." />
      <FeaturePlaceholder
        icon={Settings}
        title="Settings"
        description="Workspace, organization and profile settings arrive with authentication in Phase 3."
        items={[
          'Organization profile and members',
          'Workspace preferences (theme, defaults)',
          'API keys and webhook configuration',
          'Audit and compliance views',
        ]}
      />
    </div>
  )
}
