import { describe, expect, it, vi } from 'vitest'
import type { ExecutionContext } from '@nestjs/common'
import { ComplianceClearance, PermissionAction, PermissionLevel, Role } from '@contextgraph/types'
import { AuthorizationGuard } from './authorization.guard'
import { IAuthorizationService } from '../../modules/authorization/services/authorization.service'
import { PermissionDeniedException } from '../../modules/authorization/errors/authorization-errors'

function makeGuard(service: Partial<IAuthorizationService>) {
  const reflector = {
    getAllAndOverride: vi.fn(() => undefined),
  } as unknown as { getAllAndOverride: ReturnType<typeof vi.fn> }
  return { guard: new AuthorizationGuard(reflector, service as IAuthorizationService), reflector }
}

function makeContext(overrides: Partial<Record<string, unknown>> = {}): ExecutionContext {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => ({ user: overrides['user'] ?? undefined }),
    }),
    ...overrides,
  } as unknown as ExecutionContext
}

const serviceStub = {
  isRoleAllowed: vi.fn(async () => true),
  hasPermissionLevel: vi.fn(async () => true),
  hasComplianceClearance: vi.fn(async () => true),
  checkAction: vi.fn(async () => undefined),
}

describe('AuthorizationGuard', () => {
  it('passes through without authorization metadata (no I/O)', async () => {
    const { guard } = makeGuard(serviceStub)
    await expect(guard.canActivate(makeContext())).resolves.toBe(true)
    expect(serviceStub.isRoleAllowed).not.toHaveBeenCalled()
  })

  it('delegates @Roles to the engine and denies on failure', async () => {
    const { guard, reflector } = makeGuard(serviceStub)
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === 'roles' ? [Role.ADMIN] : undefined,
    )
    serviceStub.isRoleAllowed.mockResolvedValueOnce(false)
    await expect(
      guard.canActivate(makeContext({ user: { role: Role.VIEWER } })),
    ).rejects.toBeInstanceOf(PermissionDeniedException)
    expect(serviceStub.isRoleAllowed).toHaveBeenCalledWith({ role: Role.VIEWER }, [Role.ADMIN])
  })

  it('delegates @RequirePermissions to checkAction for every requirement', async () => {
    const { guard, reflector } = makeGuard(serviceStub)
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === 'requiredPermissions'
        ? [{ resource: 'knowledge-node', action: PermissionAction.WRITE }]
        : undefined,
    )
    await expect(guard.canActivate(makeContext({ user: { role: Role.EDITOR } }))).resolves.toBe(
      true,
    )
    expect(serviceStub.checkAction).toHaveBeenCalledWith(
      { role: Role.EDITOR },
      'knowledge-node',
      PermissionAction.WRITE,
    )
  })

  it('enforces @RequireClearance through the engine', async () => {
    const { guard, reflector } = makeGuard(serviceStub)
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === 'requiredComplianceClearance' ? ComplianceClearance.RESTRICTED : undefined,
    )
    serviceStub.hasComplianceClearance.mockResolvedValueOnce(false)
    await expect(
      guard.canActivate(makeContext({ user: { complianceClearance: 'SENSITIVE' } })),
    ).rejects.toBeInstanceOf(PermissionDeniedException)
  })

  it('enforces @RequirePermissionLevel through the engine', async () => {
    const { guard, reflector } = makeGuard(serviceStub)
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === 'requiredPermissionLevel' ? PermissionLevel.ADMIN : undefined,
    )
    serviceStub.hasPermissionLevel.mockResolvedValueOnce(false)
    await expect(
      guard.canActivate(makeContext({ user: { permissionLevel: 'WRITE' } })),
    ).rejects.toBeInstanceOf(PermissionDeniedException)
  })

  it('throws when no authenticated principal is present', async () => {
    const { guard, reflector } = makeGuard(serviceStub)
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === 'roles' ? [Role.ADMIN] : undefined,
    )
    await expect(guard.canActivate(makeContext({ user: undefined }))).rejects.toBeInstanceOf(
      PermissionDeniedException,
    )
  })
})
