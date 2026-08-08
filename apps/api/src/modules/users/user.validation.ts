import { z } from 'zod'
import { ComplianceClearance, PermissionLevel, Role } from '@contextgraph/types'

export const createUserSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(1).max(200),
  role: z.nativeEnum(Role),
  permissionLevel: z.nativeEnum(PermissionLevel).default(PermissionLevel.READ),
  complianceClearance: z.nativeEnum(ComplianceClearance).default(ComplianceClearance.STANDARD),
  departmentId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const updateUserSchema = createUserSchema.partial()

export const userIdSchema = z.string().uuid()

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
