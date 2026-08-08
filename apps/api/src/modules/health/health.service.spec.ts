import { describe, expect, it, vi } from 'vitest'
import { HealthService } from './health.service'

describe('HealthService', () => {
  it('liveness always reports ok with uptime and timestamp', () => {
    const service = new HealthService({} as never, {} as never, {} as never)
    const result = service.liveness()
    expect(result.status).toBe('ok')
    expect(result.uptime).toBeGreaterThanOrEqual(0)
    expect(result.timestamp).toBeTruthy()
  })

  it('readiness delegates to the terminus health check', async () => {
    const health = {
      check: vi.fn(async () => ({ status: 'ok', info: {}, error: {}, details: {} })),
    }
    const service = new HealthService(health as never, {} as never, {} as never)
    await service.readiness()
    expect(health.check).toHaveBeenCalledOnce()
  })
})
