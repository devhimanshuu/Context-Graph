import { authService } from '@/services/auth/auth.service'
import { handleRouteError } from '@/lib/http/error-handler'
import { noContent } from '@/utils/api-response'
import { createRequestId } from '@/utils/request-id'

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. Replaced by Supabase sign-out in Phase 3.
 */
export async function POST() {
  const requestId = createRequestId()

  try {
    await authService.logout()
    return noContent()
  } catch (error) {
    return handleRouteError(error, { requestId })
  }
}
