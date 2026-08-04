import { APP } from '@/constants'
import type { HealthStatusDto } from '@/dto/health.dto'
import { getLogger } from '@/services/logging'

const healthLogger = getLogger('health')

/**
 * HealthService contract.
 *
 * Services are the business-logic layer. Each feature owns a service module
 * exposing an interface plus an implementation bound at composition time,
 * following the Dependency Inversion principle.
 */
export interface HealthService {
  check(): Promise<HealthStatusDto>
}

class HealthServiceImpl implements HealthService {
  async check(): Promise<HealthStatusDto> {
    healthLogger.debug('Health check requested')

    return {
      status: 'ok',
      service: APP.name,
      version: APP.version,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    }
  }
}

/** Composition root for the health feature (see `src/services/README.md`). */
export const healthService: HealthService = new HealthServiceImpl()
