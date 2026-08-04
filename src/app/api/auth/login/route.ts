import { z } from 'zod'
import { authService } from '@/services/auth/auth.service'
import { handleRouteError } from '@/lib/http/error-handler'
import { ok } from '@/utils/api-response'
import { createRequestId } from '@/utils/request-id'

const loginBodySchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
})

/**
 * POST /api/auth/login
 *
 * Mock sign-in: validates credentials against the demo directory
 * (`src/lib/auth/demo-users.ts`) and sets the session cookie. This endpoint
 * is replaced by Supabase Auth in Phase 3.
 *
 * Errors flow through `handleRouteError` — invalid credentials become a
 * uniform 401 envelope.
 */
export async function POST(request: Request) {
  const requestId = createRequestId()

  try {
    const body = loginBodySchema.parse(await request.json())
    const user = await authService.login(body.email, body.password)
    return ok({ user }, { requestId })
  } catch (error) {
    return handleRouteError(error, { requestId })
  }
}
