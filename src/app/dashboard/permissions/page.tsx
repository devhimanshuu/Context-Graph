import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { FeaturePlaceholder } from '@/components/dashboard/feature-placeholder'
import { PageHeader } from '@/components/dashboard/page-header'

export const metadata: Metadata = {
  title: 'Permissions',
}

export default function PermissionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="Control who can see and use organizational knowledge."
      />
      <FeaturePlaceholder
        icon={ShieldCheck}
        title="Permissions"
        description="Permission-aware filtering integrated with Supabase Auth arrives in Phase 3."
        items={[
          'Roles, scopes and policy definitions',
          'Permission-aware graph filtering',
          'Policy evaluation alongside the rule engine',
          'Audit trails for access decisions',
        ]}
      />
    </div>
  )
}
