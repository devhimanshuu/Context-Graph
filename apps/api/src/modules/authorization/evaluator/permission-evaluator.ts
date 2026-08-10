import { Inject, Injectable } from '@nestjs/common'
import {
  type ComplianceClearance,
  type ComplianceTag,
  type EntityId,
  OrganizationStatus,
  PermissionAction,
  type PermissionLevel,
  type Role,
} from '@contextgraph/types'
import { PolicyPipeline } from '../policies/policy-pipeline'
import { type AuthorizationDecision } from '../domain/authorization-decision'
import type { CompiledAuthorizationContext } from '../domain/authorization-context'
import type { ResourceAuthorizationContext } from '../domain/resource-context'
import { clearanceDominates } from '../domain/compliance'
import { levelDominates } from '../domain/permission-level'

/**
 * Evaluation contract. Everything is synchronous and in-memory over a compiled
 * context — no I/O, so batch pipeline evaluation of thousands of nodes costs
 * zero database queries. Node checks run the full policy pipeline; the
 * `can*`/`has*` predicates are single-concern helpers for guards and services.
 */
export abstract class IAuthorizationEvaluator {
  abstract evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): AuthorizationDecision

  abstract canReadNode(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
  ): AuthorizationDecision
  abstract canWriteNode(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
  ): AuthorizationDecision
  abstract canDeleteNode(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
  ): AuthorizationDecision

  abstract canAccessOrganization(
    context: CompiledAuthorizationContext,
    organizationId: EntityId,
  ): boolean
  abstract canAccessDepartment(
    context: CompiledAuthorizationContext,
    departmentId: EntityId,
  ): boolean
  abstract hasPermissionLevel(
    context: CompiledAuthorizationContext,
    required: PermissionLevel,
  ): boolean
  abstract hasComplianceClearance(
    context: CompiledAuthorizationContext,
    required: ComplianceClearance,
  ): boolean
  abstract hasComplianceTag(context: CompiledAuthorizationContext, tag: ComplianceTag): boolean
  abstract isRoleAllowed(context: CompiledAuthorizationContext, roles: readonly Role[]): boolean
}

@Injectable()
export class PermissionEvaluator implements IAuthorizationEvaluator {
  constructor(@Inject(PolicyPipeline) private readonly pipeline: PolicyPipeline) {}

  evaluate(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
    action: PermissionAction,
  ): AuthorizationDecision {
    return this.pipeline.evaluate(context, resource, action)
  }

  canReadNode(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
  ): AuthorizationDecision {
    return this.pipeline.evaluate(context, resource, PermissionAction.READ)
  }

  canWriteNode(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
  ): AuthorizationDecision {
    return this.pipeline.evaluate(context, resource, PermissionAction.WRITE)
  }

  canDeleteNode(
    context: CompiledAuthorizationContext,
    resource: ResourceAuthorizationContext,
  ): AuthorizationDecision {
    return this.pipeline.evaluate(context, resource, PermissionAction.DELETE)
  }

  canAccessOrganization(context: CompiledAuthorizationContext, organizationId: EntityId): boolean {
    return (
      context.organizationId === organizationId &&
      context.organizationStatus !== OrganizationStatus.SUSPENDED &&
      context.organizationStatus !== OrganizationStatus.ARCHIVED
    )
  }

  canAccessDepartment(context: CompiledAuthorizationContext, departmentId: EntityId): boolean {
    return context.accessibleDepartmentIds.has(departmentId)
  }

  hasPermissionLevel(context: CompiledAuthorizationContext, required: PermissionLevel): boolean {
    return levelDominates(context.permissionLevel, required)
  }

  hasComplianceClearance(
    context: CompiledAuthorizationContext,
    required: ComplianceClearance,
  ): boolean {
    return clearanceDominates(context.complianceClearance, required)
  }

  hasComplianceTag(context: CompiledAuthorizationContext, tag: ComplianceTag): boolean {
    return context.effectiveComplianceTags.has(tag)
  }

  isRoleAllowed(context: CompiledAuthorizationContext, roles: readonly Role[]): boolean {
    return roles.includes(context.role)
  }
}
