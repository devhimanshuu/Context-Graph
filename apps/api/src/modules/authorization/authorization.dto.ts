import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  ComplianceClearance,
  ComplianceTag,
  PermissionAction,
  PermissionLevel,
  Role,
} from '@contextgraph/types'
import type { CompiledAuthorizationContext } from './domain/authorization-context'
import { ResourceVisibility } from './domain/resource-context'

/** Redacted view of a compiled authorization context (caller-facing). */
export class AuthorizationContextDto {
  @ApiProperty()
  userId!: string

  @ApiProperty()
  organizationId!: string

  @ApiPropertyOptional({ nullable: true })
  departmentId!: string | null

  @ApiProperty({ enum: Role })
  role!: Role

  @ApiProperty({ enum: PermissionLevel })
  permissionLevel!: PermissionLevel

  @ApiProperty({ enum: ComplianceClearance })
  complianceClearance!: ComplianceClearance

  @ApiProperty({ enum: ComplianceTag, isArray: true })
  effectiveComplianceTags!: ComplianceTag[]

  @ApiProperty({ isArray: true })
  accessibleDepartmentIds!: string[]

  @ApiProperty()
  compiledAt!: string
}

export class AuthorizationDecisionDto {
  @ApiProperty()
  allowed!: boolean

  @ApiProperty()
  reason!: string

  @ApiPropertyOptional({ nullable: true })
  failedPolicy!: string | null

  @ApiProperty({ isArray: true })
  evaluatedPolicies!: string[]

  @ApiPropertyOptional({ description: 'Per-policy verdicts in pipeline order' })
  verdicts?: { policy: string; outcome: string; reason?: string }[]
}

export class ResourceEvaluationInputDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ example: 'knowledge-node' })
  resourceType!: string

  @ApiPropertyOptional({ description: 'Defaults to the caller organization' })
  organizationId?: string

  @ApiPropertyOptional({ nullable: true })
  workspaceId?: string | null

  @ApiPropertyOptional({ nullable: true })
  departmentId?: string | null

  @ApiPropertyOptional({ nullable: true })
  ownerId?: string | null

  @ApiPropertyOptional({ enum: PermissionLevel, nullable: true })
  requiredPermissionLevel?: PermissionLevel | null

  @ApiPropertyOptional({ enum: ComplianceTag, isArray: true })
  complianceTags?: ComplianceTag[]

  @ApiProperty({ enum: ResourceVisibility })
  visibility!: ResourceVisibility

  @ApiPropertyOptional({ nullable: true })
  status?: string | null

  @ApiPropertyOptional({ description: 'Optional action to evaluate; defaults to READ' })
  action?: PermissionAction

  @ApiPropertyOptional()
  attributes?: Record<string, unknown>
}

/** Maps a compiled context to its redacted DTO. */
export function contextToDto(context: CompiledAuthorizationContext): AuthorizationContextDto {
  return {
    userId: context.userId,
    organizationId: context.organizationId,
    departmentId: context.departmentId,
    role: context.role,
    permissionLevel: context.permissionLevel,
    complianceClearance: context.complianceClearance,
    effectiveComplianceTags: [...context.effectiveComplianceTags].sort(),
    accessibleDepartmentIds: [...context.accessibleDepartmentIds].sort(),
    compiledAt: context.compiledAt,
  }
}
