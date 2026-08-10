import { Inject, Injectable } from '@nestjs/common'
import {
  type AuthenticatedUser,
  type ComplianceClearance,
  type EntityId,
  OrganizationStatus,
  PermissionAction,
  type PermissionLevel,
  type Role,
} from '@contextgraph/types'
import { IAuthorizationDataRepository } from '../repositories/authorization-data.repository'
import { IAuthorizationCompiler } from '../compiler/permission-compiler'
import { IAuthorizationEvaluator } from '../evaluator/permission-evaluator'
import {
  AUTHORIZATION_CACHE,
  type IAuthorizationCache,
} from '../cache/authorization-cache.interface'
import { AUTHORIZATION_METRICS, type IAuthorizationMetrics } from '../metrics/authorization-metrics'
import {
  AUTHORIZATION_AUDIT_LOGGER,
  type IAuthorizationAuditLogger,
} from '../audit/authorization-audit-logger'
import {
  AuthorizationContextMissingException,
  PermissionDeniedException,
} from '../errors/authorization-errors'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import { ResourceVisibility, type ResourceAuthorizationContext } from '../domain/resource-context'
import type { AuthorizationDecision } from '../domain/authorization-decision'

/**
 * The application-facing surface of the authorization engine.
 *
 * Security property: the context is always compiled from freshly loaded server
 * data (user row, tenant status, department subtree) keyed by the principal id
 * — never from client-supplied role/level/org claims. Compiled contexts are
 * cached per principal for reuse across hundreds of node checks.
 */
export abstract class IAuthorizationService {
  abstract getContext(user: AuthenticatedUser): Promise<CompiledAuthorizationContext>

  abstract evaluateResource(
    user: AuthenticatedUser,
    resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): Promise<AuthorizationDecision>

  abstract canReadNode(
    user: AuthenticatedUser,
    resource: ResourceAuthorizationContext,
  ): Promise<boolean>
  abstract canWriteNode(
    user: AuthenticatedUser,
    resource: ResourceAuthorizationContext,
  ): Promise<boolean>
  abstract canDeleteNode(
    user: AuthenticatedUser,
    resource: ResourceAuthorizationContext,
  ): Promise<boolean>

  abstract canAccessOrganization(
    user: AuthenticatedUser,
    organizationId: EntityId,
  ): Promise<boolean>
  abstract canAccessDepartment(user: AuthenticatedUser, departmentId: EntityId): Promise<boolean>
  abstract hasPermissionLevel(user: AuthenticatedUser, required: PermissionLevel): Promise<boolean>
  abstract hasComplianceClearance(
    user: AuthenticatedUser,
    required: ComplianceClearance,
  ): Promise<boolean>
  abstract isRoleAllowed(user: AuthenticatedUser, roles: readonly Role[]): Promise<boolean>

  /** Route-guard check: evaluates and throws PermissionDeniedException on denial. */
  abstract checkAction(
    user: AuthenticatedUser,
    resourceType: string,
    action: PermissionAction,
  ): Promise<void>

  abstract invalidate(userId: EntityId): Promise<void>
}

@Injectable()
export class AuthorizationService implements IAuthorizationService {
  constructor(
    @Inject(IAuthorizationDataRepository)
    private readonly dataRepository: IAuthorizationDataRepository,
    @Inject(IAuthorizationCompiler) private readonly compiler: IAuthorizationCompiler,
    @Inject(IAuthorizationEvaluator) private readonly evaluator: IAuthorizationEvaluator,
    @Inject(AUTHORIZATION_CACHE) private readonly cache: IAuthorizationCache,
    @Inject(AUTHORIZATION_METRICS) private readonly metrics: IAuthorizationMetrics,
    @Inject(AUTHORIZATION_AUDIT_LOGGER)
    private readonly audit: IAuthorizationAuditLogger,
  ) {}

  async getContext(user: AuthenticatedUser): Promise<CompiledAuthorizationContext> {
    const cached = await this.cache.get(user.id)
    if (cached !== undefined) {
      this.metrics.recordCacheHit()
      return cached
    }
    this.metrics.recordCacheMiss()

    const data = await this.dataRepository.loadUser(user.id)
    if (data === null) {
      throw new AuthorizationContextMissingException('Account no longer exists')
    }

    const organizationStatus =
      (await this.dataRepository.loadOrganizationStatus(data.organizationId)) ??
      // Missing tenant fails closed.
      OrganizationStatus.SUSPENDED

    const departmentSubtree =
      data.departmentId === null
        ? []
        : await this.dataRepository.loadDepartmentSubtree(data.organizationId, data.departmentId)

    const context = this.compiler.compile({
      user: data,
      organizationStatus,
      departmentSubtree,
    })
    await this.cache.set(user.id, context)
    return context
  }

  async evaluateResource(
    user: AuthenticatedUser,
    resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): Promise<AuthorizationDecision> {
    const startedAt = performance.now()
    const context = await this.getContext(user)
    const decision = this.evaluator.evaluate(context, resource, action)
    this.metrics.recordCheck(decision.allowed, performance.now() - startedAt)
    if (!decision.allowed) {
      this.metrics.recordDenial(decision.failedPolicy ?? 'UNKNOWN')
      // Interactive evaluations are audited; batch pipeline evaluation uses the
      // evaluator directly to avoid per-node audit writes.
      await this.audit.recordDenial({
        organizationId: context.organizationId,
        actorId: context.userId,
        resourceType: resource.resourceType,
        resourceId: resource.id,
        reason: decision.reason,
        failedPolicy: decision.failedPolicy,
      })
    }
    return decision
  }

  async canReadNode(
    user: AuthenticatedUser,
    resource: ResourceAuthorizationContext,
  ): Promise<boolean> {
    return (await this.evaluateResource(user, resource, PermissionAction.READ)).allowed
  }

  async canWriteNode(
    user: AuthenticatedUser,
    resource: ResourceAuthorizationContext,
  ): Promise<boolean> {
    return (await this.evaluateResource(user, resource, PermissionAction.WRITE)).allowed
  }

  async canDeleteNode(
    user: AuthenticatedUser,
    resource: ResourceAuthorizationContext,
  ): Promise<boolean> {
    return (await this.evaluateResource(user, resource, PermissionAction.DELETE)).allowed
  }

  async canAccessOrganization(user: AuthenticatedUser, organizationId: EntityId): Promise<boolean> {
    const context = await this.getContext(user)
    return this.evaluator.canAccessOrganization(context, organizationId)
  }

  async canAccessDepartment(user: AuthenticatedUser, departmentId: EntityId): Promise<boolean> {
    const context = await this.getContext(user)
    return this.evaluator.canAccessDepartment(context, departmentId)
  }

  async hasPermissionLevel(user: AuthenticatedUser, required: PermissionLevel): Promise<boolean> {
    const context = await this.getContext(user)
    return this.evaluator.hasPermissionLevel(context, required)
  }

  async hasComplianceClearance(
    user: AuthenticatedUser,
    required: ComplianceClearance,
  ): Promise<boolean> {
    const context = await this.getContext(user)
    return this.evaluator.hasComplianceClearance(context, required)
  }

  async isRoleAllowed(user: AuthenticatedUser, roles: readonly Role[]): Promise<boolean> {
    const context = await this.getContext(user)
    return this.evaluator.isRoleAllowed(context, roles)
  }

  async checkAction(
    user: AuthenticatedUser,
    resourceType: string,
    action: PermissionAction,
  ): Promise<void> {
    const context = await this.getContext(user)
    // Route-level capability check against the principal's own tenant scope.
    const decision = this.evaluator.evaluate(
      context,
      routeScopeResource(context, resourceType),
      action,
    )
    this.metrics.recordCheck(decision.allowed, 0)
    if (!decision.allowed) {
      throw new PermissionDeniedException('Insufficient permission', {
        reason: decision.reason,
        failedPolicy: decision.failedPolicy,
        resourceType,
      })
    }
  }

  async invalidate(userId: EntityId): Promise<void> {
    const cached = await this.cache.get(userId)
    await this.cache.invalidate(userId)
    if (cached !== undefined) {
      await this.audit.recordEvent(
        'AUTHORIZATION_CONTEXT_INVALIDATED',
        cached.organizationId,
        userId,
        { invalidated: true },
      )
    }
  }
}

/** Minimal resource representing "any resource of this type in the caller's tenant". */
function routeScopeResource(
  context: CompiledAuthorizationContext,
  resourceType: string,
): ResourceAuthorizationContext {
  return {
    id: `route:${resourceType}`,
    resourceType,
    organizationId: context.organizationId,
    visibility: ResourceVisibility.INTERNAL,
    attributes: {},
  }
}
