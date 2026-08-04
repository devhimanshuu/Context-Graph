import { type ICacheProvider } from '@/application/caching'
import { type PermissionContextDto } from '@/application/dto'
import { type ILogger } from '@/application/logging'
import { type IPermissionCompiler } from '@/application/services/interfaces'
import { type UseCase, type UseCaseFactory } from './base'

/** Input to permission compilation. */
export interface CompilePermissionUseCaseInput {
  organizationId: string
  workspaceId: string
  userId: string
}

export type CompilePermissionUseCaseOutput = PermissionContextDto

/** Service contracts `CompilePermissionUseCase` requires. */
export interface CompilePermissionUseCaseDependencies {
  permissionCompiler: IPermissionCompiler
  /** Permission cache (`CacheKeys.permission(userId, orgId, workspaceId)`). */
  permissionCache: ICacheProvider
  logger: ILogger
}

/**
 * Compiles (and caches) a caller's effective permission context for a
 * workspace. The entry point for permission-aware feature surfaces.
 */ export type ICompilePermissionUseCase = UseCase<
  CompilePermissionUseCaseInput,
  CompilePermissionUseCaseOutput
>

export type CompilePermissionUseCaseFactory = UseCaseFactory<
  ICompilePermissionUseCase,
  CompilePermissionUseCaseDependencies
>
