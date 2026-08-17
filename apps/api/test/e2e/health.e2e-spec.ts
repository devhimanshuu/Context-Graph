import 'dotenv/config'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { Test } from '@nestjs/testing'
import { VersioningType, type INestApplication } from '@nestjs/common'
import { AppModule } from '../../src/app.module'
import { PrismaService } from '../../src/database/prisma.service'

// The dev `.env` leaves PORT=0 (auto-pick); the config schema requires > 0
// when the Test module constructs ConfigService, so normalize it before boot.
if (process.env.PORT === undefined || process.env.PORT === '0') {
  process.env.PORT = '3001'
}

/* E2E scaffold (supertest against the booted application). */
describe('Health (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({} as PrismaService)
      .compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/v1/health returns the liveness probe inside the success envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('ok')
    expect(response.body.requestId).toBeTruthy()
    expect(response.body.timestamp).toBeTruthy()
  })

  it('exposes the request id response header', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health')
    expect(response.headers['x-request-id']).toBeTruthy()
    expect(response.headers['x-correlation-id']).toBeTruthy()
  })

  it('returns a uniform 404 envelope for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('ERR_NOT_FOUND')
  })
})
