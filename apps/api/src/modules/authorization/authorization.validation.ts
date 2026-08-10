import { z } from 'zod'
import { ComplianceTag, PermissionAction, PermissionLevel } from '@contextgraph/types'
import { ResourceVisibility } from './domain/resource-context'

const complianceTagValues = Object.values(ComplianceTag) as [ComplianceTag, ...ComplianceTag[]]
const permissionLevelValues = Object.values(PermissionLevel) as [
  PermissionLevel,
  ...PermissionLevel[],
]
const visibilityValues = Object.values(ResourceVisibility) as [
  ResourceVisibility,
  ...ResourceVisibility[],
]
const actionValues = Object.values(PermissionAction) as [PermissionAction, ...PermissionAction[]]

export const evaluateResourceSchema = z.object({
  id: z.string().uuid(),
  resourceType: z.string().min(1).max(100),
  organizationId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  requiredPermissionLevel: z.enum(permissionLevelValues).nullable().optional(),
  complianceTags: z.array(z.enum(complianceTagValues)).optional(),
  visibility: z.enum(visibilityValues),
  status: z.string().max(50).nullable().optional(),
  action: z.enum(actionValues).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
})

export type EvaluateResourceInput = z.infer<typeof evaluateResourceSchema>
