import 'server-only'
import { auth, currentUser } from '@clerk/nextjs/server'
import type { ComplianceClearance, PermissionLevel, Role } from '@/domain/enums'
import type { SessionUser } from './types'

/* Session facade (Clerk). The single seam between the app and the auth provider: consumers call */

/** Default tenant applied until organization sync lands. */
const DEFAULT_ORGANIZATION = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Meridian Health System',
  slug: 'meridian-health',
} as const

const ROLES: readonly Role[] = ['ADMIN', 'HOD', 'EDITOR', 'VIEWER', 'QUALITY', 'AUDITOR']
const PERMISSION_LEVELS: readonly PermissionLevel[] = ['NONE', 'READ', 'WRITE', 'ADMIN']
const CLEARANCES: readonly ComplianceClearance[] = [
  'NONE',
  'STANDARD',
  'SENSITIVE',
  'RESTRICTED',
  'CRITICAL',
]

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

function isPermissionLevel(value: unknown): value is PermissionLevel {
  return typeof value === 'string' && (PERMISSION_LEVELS as readonly string[]).includes(value)
}

function isComplianceClearance(value: unknown): value is ComplianceClearance {
  return typeof value === 'string' && (CLEARANCES as readonly string[]).includes(value)
}

function stringFromMetadata(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>

/** Maps a Clerk user into the application's session identity. */
function toSessionUser(user: ClerkUser): SessionUser {
  const metadata = user.publicMetadata ?? {}

  const primaryEmail =
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId) ??
    user.emailAddresses[0]
  const email = primaryEmail?.emailAddress ?? ''

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.username ||
    email.split('@')[0] ||
    'User'

  return {
    id: user.id,
    name,
    email,
    role: isRole(metadata.role) ? metadata.role : 'VIEWER',
    permissionLevel: isPermissionLevel(metadata.permissionLevel)
      ? metadata.permissionLevel
      : 'READ',
    complianceClearance: isComplianceClearance(metadata.complianceClearance)
      ? metadata.complianceClearance
      : 'STANDARD',
    organizationId: stringFromMetadata(metadata, 'organizationId') ?? DEFAULT_ORGANIZATION.id,
    organizationName: stringFromMetadata(metadata, 'organizationName') ?? DEFAULT_ORGANIZATION.name,
    organizationSlug: stringFromMetadata(metadata, 'organizationSlug') ?? DEFAULT_ORGANIZATION.slug,
  }
}

/** Resolves the current session, or `null` when unauthenticated. */
export async function getSession(): Promise<SessionUser | null> {
  const session = await auth()
  if (session.userId === null) {
    return null
  }

  const user = await currentUser()
  if (user === null) {
    return null
  }

  return toSessionUser(user)
}
