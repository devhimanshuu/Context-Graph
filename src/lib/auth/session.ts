import 'server-only'
import { cookies } from 'next/headers'
import type { SessionUser } from './types'

/**
 * Session management (mock phase).
 *
 * The session is an httpOnly cookie holding the serialized `SessionUser`.
 * This is the SINGLE seam that swaps when Supabase Auth arrives (Phase 3):
 * `getSession` will read the Supabase session, `createSession`/`destroySession`
 * will delegate to Supabase sign-in/sign-out. Nothing above this module
 * changes.
 */

export const SESSION_COOKIE_NAME = 'cg_session'

/** Resolves the current session, or `null` when unauthenticated. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE_NAME)?.value
  if (raw === undefined) {
    return null
  }

  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    // Malformed cookie — treat as logged out rather than crashing.
    return null
  }
}

/** Persists a session for the current request (sets the cookie). */
export async function createSession(user: SessionUser): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

/** Clears the session cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE_NAME)
}
