import { type PermissionContextDto, type UserContextDto } from '@/application/dto'

/** Input to a permission compilation. */
export interface CompilePermissionInput {
  organizationId: string
  workspaceId: string | null
  user: UserContextDto
}

/**
 * Compiles a caller's effective permission context (role, permission level,
 * compliance clearances, explicit grants/denials) from the tenant's permission
 * profiles. The permission stages and `CompilePermissionUseCase` depend on
 * this contract — never on a concrete implementation.
 */
export interface IPermissionCompiler {
  compile(input: CompilePermissionInput): Promise<PermissionContextDto>

  /** Invalidates cached permission decisions for a user (on profile change). */
  invalidate(userId: string): Promise<void>
}
