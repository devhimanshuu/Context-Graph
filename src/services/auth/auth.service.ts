import { authenticate, DEMO_ACCOUNTS } from '@/lib/auth/demo-users'
import { createSession, destroySession } from '@/lib/auth/session'
import type { SessionUser } from '@/lib/auth/types'
import { UnauthorizedError } from '@/lib/errors'
import { getLogger } from '@/services/logging'

const authLogger = getLogger('auth')

/**
 * Auth service (mock bridge until Supabase Auth in Phase 3).
 *
 * Kept deliberately small and interface-shaped so the swap to Supabase only
 * touches this module. The mock directory validates credentials; sessions are
 * httpOnly cookies.
 */
export interface AuthService {
  login(email: string, password: string): Promise<SessionUser>
  logout(): Promise<void>
}

class AuthServiceImpl implements AuthService {
  async login(email: string, password: string): Promise<SessionUser> {
    const user = authenticate(email, password)
    if (user === null) {
      authLogger.warn('Sign-in rejected', { email })
      throw new UnauthorizedError('Invalid email or password')
    }

    await createSession(user)
    authLogger.info('Signed in', { email: user.email, role: user.role })
    return user
  }

  async logout(): Promise<void> {
    await destroySession()
  }
}

/** Composition root for the auth bridge. */
export const authService: AuthService = new AuthServiceImpl()

/** Email addresses that can sign in during the mock phase (UI hint). */
export const DEMO_EMAILS: readonly string[] = DEMO_ACCOUNTS.map((account) => account.email)
