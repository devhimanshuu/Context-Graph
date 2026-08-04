import type { SessionUser } from './types'

/**
 * Mock authentication directory (Phase 2.5 bridge).
 *
 * Until Supabase Auth lands (Phase 3), sign-in validates against this
 * in-code directory, which mirrors the users seeded by `src/prisma/seed.ts`
 * so the demo feels real. Every demo account uses the password `demo`.
 *
 * When Supabase Auth arrives this module is deleted; the login route is the
 * only place that changes.
 */
const ORGS = {
  meridian: {
    organizationId: '00000000-0000-4000-8000-000000000001',
    organizationName: 'Meridian Health System',
    organizationSlug: 'meridian-health',
  },
  helios: {
    organizationId: '00000000-0000-4000-8000-000000000002',
    organizationName: 'Helios Capital',
    organizationSlug: 'helios-capital',
  },
} as const

interface DemoAccount {
  email: string
  password: string
  user: SessionUser
}

export const DEMO_PASSWORD = 'demo'

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    email: 'amelia.chen@meridian.health',
    password: DEMO_PASSWORD,
    user: {
      id: '00000000-0000-4000-8000-000000000011',
      name: 'Dr. Amelia Chen',
      email: 'amelia.chen@meridian.health',
      role: 'ADMIN',
      permissionLevel: 'ADMIN',
      complianceClearance: 'CRITICAL',
      ...ORGS.meridian,
    },
  },
  {
    email: 'raj.patel@meridian.health',
    password: DEMO_PASSWORD,
    user: {
      id: '00000000-0000-4000-8000-000000000012',
      name: 'Dr. Raj Patel',
      email: 'raj.patel@meridian.health',
      role: 'HOD',
      permissionLevel: 'WRITE',
      complianceClearance: 'RESTRICTED',
      ...ORGS.meridian,
    },
  },
  {
    email: 'sofia.rossi@meridian.health',
    password: DEMO_PASSWORD,
    user: {
      id: '00000000-0000-4000-8000-000000000013',
      name: 'Dr. Sofia Rossi',
      email: 'sofia.rossi@meridian.health',
      role: 'EDITOR',
      permissionLevel: 'WRITE',
      complianceClearance: 'SENSITIVE',
      ...ORGS.meridian,
    },
  },
  {
    email: 'michael.okafor@meridian.health',
    password: DEMO_PASSWORD,
    user: {
      id: '00000000-0000-4000-8000-000000000014',
      name: 'Michael Okafor, RN',
      email: 'michael.okafor@meridian.health',
      role: 'VIEWER',
      permissionLevel: 'READ',
      complianceClearance: 'STANDARD',
      ...ORGS.meridian,
    },
  },
  {
    email: 'lena.weber@meridian.health',
    password: DEMO_PASSWORD,
    user: {
      id: '00000000-0000-4000-8000-000000000015',
      name: 'Dr. Lena Weber',
      email: 'lena.weber@meridian.health',
      role: 'QUALITY',
      permissionLevel: 'WRITE',
      complianceClearance: 'SENSITIVE',
      ...ORGS.meridian,
    },
  },
  {
    email: 'tom.becker@meridian.health',
    password: DEMO_PASSWORD,
    user: {
      id: '00000000-0000-4000-8000-000000000016',
      name: 'Tom Becker',
      email: 'tom.becker@meridian.health',
      role: 'AUDITOR',
      permissionLevel: 'READ',
      complianceClearance: 'CRITICAL',
      ...ORGS.meridian,
    },
  },
  {
    email: 'nina.kowalski@helios.capital',
    password: DEMO_PASSWORD,
    user: {
      id: '00000000-0000-4000-8000-000000000017',
      name: 'Nina Kowalski',
      email: 'nina.kowalski@helios.capital',
      role: 'ADMIN',
      permissionLevel: 'ADMIN',
      complianceClearance: 'CRITICAL',
      ...ORGS.helios,
    },
  },
]

/**
 * Validates credentials against the demo directory.
 * Returns the session user, or `null` when credentials are invalid.
 */
export function authenticate(email: string, password: string): SessionUser | null {
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.email === email.trim().toLowerCase())
  if (account === undefined || account.password !== password) {
    return null
  }
  return account.user
}
