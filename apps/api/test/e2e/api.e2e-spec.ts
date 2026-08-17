import 'dotenv/config'
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { Test } from '@nestjs/testing'
import { VersioningType, type INestApplication } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  ComplianceClearance,
  PermissionLevel,
  Role,
  UserStatus,
  type AuthenticatedUser,
} from '@contextgraph/types'
import { AppModule } from '../../src/app.module'
import { PrismaService } from '../../src/database/prisma.service'
import { UserEntity } from '../../src/modules/users/user.entity'
import { IUsersRepository } from '../../src/modules/users/user.repository'
import { IContextPipelineOrchestrator } from '../../src/modules/pipeline/orchestrator/context-pipeline-orchestrator'
import type { ContextPackage } from '../../src/modules/pipeline/contracts/context-pipeline.contracts'

// The dev `.env` leaves PORT=0 (auto-pick); the config schema requires > 0
// when the Test module constructs ConfigService, so normalize it before boot.
if (process.env.PORT === undefined || process.env.PORT === '0') {
  process.env.PORT = '3001'
}

const ORG_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333'
const ENTRY_NODE_ID = '44444444-4444-4444-8444-444444444444'

function makeUserEntity(): UserEntity {
  return new UserEntity(
    USER_ID,
    ORG_ID,
    null,
    'admin@e2e.test',
    'E2E Admin',
    Role.ADMIN,
    PermissionLevel.ADMIN,
    ComplianceClearance.RESTRICTED,
    UserStatus.ACTIVE,
    null,
    {},
    '2026-06-15T12:00:00.000Z',
    '2026-06-15T12:00:00.000Z',
    null,
  )
}

const CANNED_PACKAGE = {
  packageId: 'pkg-e2e-1',
  requestId: 'req-e2e-1',
  version: 'contextgraph-v1',
  mode: 'STANDARD',
  workspaceId: WORKSPACE_ID,
  entryNodeId: ENTRY_NODE_ID,
  strategy: 'bfs',
  evaluatedAt: '2026-06-15T12:00:00.000Z',
  generatedAt: '2026-06-15T12:00:01.000Z',
  tokenBudget: 2048,
  tokensUsed: 512,
  truncated: false,
  candidates: [],
  exclusions: [],
  summary: {
    requestId: 'req-e2e-1',
    packageId: 'pkg-e2e-1',
    version: 'contextgraph-v1',
    mode: 'STANDARD',
    evaluatedAt: '2026-06-15T12:00:00.000Z',
    funnel: { reachable: 1, authorized: 1, ruleCandidates: 1, included: 1 },
    metrics: {
      totalDurationMs: 12,
      stagesExecuted: 10,
      reachableNodes: 1,
      authorizedNodes: 1,
      injectedNodes: 0,
      ruleCandidates: 1,
      builtCandidates: 1,
      rankedCandidates: 1,
      includedCandidates: 1,
      excludedByRules: 0,
      excludedByBudget: 0,
      excludedByRank: 0,
      ruleEngineDurationMs: 2,
      stageDurationsMs: {},
    },
    trace: [],
  },
} as unknown as ContextPackage

const VALID_RESOLVE_BODY = {
  workspaceId: WORKSPACE_ID,
  entryNodeId: ENTRY_NODE_ID,
  maxDepth: 3,
  strategy: 'bfs',
  tokenBudget: 2048,
  mode: 'STANDARD',
}

describe('API (e2e)', () => {
  let app: INestApplication
  let token: string
  const resolveSpy = vi.fn()

  beforeAll(async () => {
    resolveSpy.mockImplementation(async () => CANNED_PACKAGE)

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({} as PrismaService)
      .overrideProvider(IUsersRepository)
      .useValue({
        findById: async () => makeUserEntity(),
        findMany: async () => [],
        create: async () => makeUserEntity(),
        update: async () => makeUserEntity(),
        softDelete: async () => undefined,
        findByEmail: async () => null,
        findByOrganization: async () => [],
        countByOrganization: async () => 1,
        findByAuthProviderUserId: async () => null,
      })
      .overrideProvider(IContextPipelineOrchestrator)
      .useValue({
        resolve: resolveSpy,
        getDefinition: () => ({ version: 'contextgraph-v1', stages: [] }),
      })
      .compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })
    app.useBodyParser('json', { limit: '256kb' })
    await app.init()

    token = app.get(JwtService).sign({ sub: USER_ID })
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/v1/health/live returns the liveness probe in the envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/live').expect(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.status).toBe('ok')
    expect(response.body.requestId).toBeTruthy()
    expect(response.headers['x-request-id']).toBeTruthy()
  })

  it('GET /api/v1/users/me returns the trusted principal from the JWT', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(response.body.data.id).toBe(USER_ID)
    expect(response.body.data.organizationId).toBe(ORG_ID)
    expect(response.body.data.email).toBe('admin@e2e.test')
  })

  it('POST /api/v1/context/resolve requires authentication (401, no stack leak)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/context/resolve')
      .send(VALID_RESOLVE_BODY)
      .expect(401)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('ERR_UNAUTHORIZED')
    expect(JSON.stringify(response.body)).not.toContain('at ')
  })

  it('POST /api/v1/context/resolve rejects an invalid JWT', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/context/resolve')
      .set('Authorization', 'Bearer not-a-real-token')
      .send(VALID_RESOLVE_BODY)
      .expect(401)
    expect(response.body.error.code).toBe('ERR_UNAUTHORIZED')
  })

  it('POST /api/v1/context/resolve returns the package with trusted server-side context', async () => {
    resolveSpy.mockClear()
    const response = await request(app.getHttpServer())
      .post('/api/v1/context/resolve')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_RESOLVE_BODY)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.data.packageId).toBe('pkg-e2e-1')
    expect(response.body.data.version).toBe('contextgraph-v1')
    expect(response.body.requestId).toBeTruthy()

    // The controller delegates the TRUSTED user (from the JWT), never a body role.
    const [user, input, options] = resolveSpy.mock.calls[0] as [
      AuthenticatedUser,
      typeof VALID_RESOLVE_BODY,
      { idempotencyKey: string | null },
    ]
    expect(user.id).toBe(USER_ID)
    expect(user.organizationId).toBe(ORG_ID)
    expect(user.role).toBe(Role.ADMIN)
    expect(input.workspaceId).toBe(WORKSPACE_ID)
    expect(options.idempotencyKey).toBeNull()
  })

  it('forwards a valid Idempotency-Key header to the orchestrator', async () => {
    resolveSpy.mockClear()
    await request(app.getHttpServer())
      .post('/api/v1/context/resolve')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'resolve-e2e-0001')
      .send(VALID_RESOLVE_BODY)
      .expect(200)
    const options = resolveSpy.mock.calls[0]?.[2] as { idempotencyKey: string | null }
    expect(options.idempotencyKey).toBe('resolve-e2e-0001')
  })

  it('rejects a malformed Idempotency-Key header (400)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/context/resolve')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', 'x')
      .send(VALID_RESOLVE_BODY)
      .expect(400)
    expect(response.body.error.code).toBe('ERR_VALIDATION')
  })

  it('rejects an invalid request body early with field details (400)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/context/resolve')
      .set('Authorization', `Bearer ${token}`)
      .send({ workspaceId: WORKSPACE_ID })
      .expect(400)
    expect(response.body.error.code).toBe('ERR_VALIDATION')
    expect(Array.isArray(response.body.error.details)).toBe(true)
  })

  it('rejects oversized request bodies (413) with a stable error code', async () => {
    const oversized = {
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_NODE_ID,
      maxDepth: 3,
      tokenBudget: 2048,
      // > 256kb so the body parser rejects before validation runs.
      noise: 'x'.repeat(300_000),
    }
    const response = await request(app.getHttpServer())
      .post('/api/v1/context/resolve')
      .set('Authorization', `Bearer ${token}`)
      .send(oversized)
      .expect(413)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('ERR_PAYLOAD_TOO_LARGE')
  })

  it('returns the uniform 404 envelope for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404)
    expect(response.body.success).toBe(false)
    expect(response.body.error.code).toBe('ERR_NOT_FOUND')
  })
})
