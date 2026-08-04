import { healthController } from '@/controllers/health.controller'
import { handleRouteError } from '@/lib/http/error-handler'
import { ok } from '@/utils/api-response'
import { createRequestId } from '@/utils/request-id'

// Always report real runtime state; never serve a stale static response.
export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 *
 * Infrastructure endpoint that reports process liveness for deployments and
 * load balancers. It also serves as the reference implementation of the API
 * architecture used by every endpoint in later phases:
 *
 *   route handler (HTTP adapter)
 *     → controller (orchestration)
 *       → service (logic)
 *         → repository (data access — not needed here)
 *
 * Errors from any layer flow through `handleRouteError`, which normalizes,
 * logs, and serializes them into the standard error envelope.
 */
export async function GET() {
  const requestId = createRequestId()

  try {
    const health = await healthController.getHealth()
    return ok(health, { requestId })
  } catch (error) {
    return handleRouteError(error, { requestId })
  }
}
