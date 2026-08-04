import type { HealthStatusDto } from '@/dto/health.dto'
import { healthService } from '@/services/health/health.service'

/**
 * Health controller.
 *
 * Controllers are a thin orchestration layer: they validate/parse the request,
 * call exactly one service, and return plain DTOs. They must not contain
 * business logic or data access. Route handlers (`src/app/api/**`) act as the
 * HTTP adapter that invokes controllers and serializes responses.
 */
class HealthController {
  async getHealth(): Promise<HealthStatusDto> {
    return healthService.check()
  }
}

export const healthController = new HealthController()
