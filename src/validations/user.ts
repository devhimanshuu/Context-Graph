import { z } from 'zod'
import { jsonObjectSchema } from '@/validations/common/fields'
import {
  COMPLIANCE_CLEARANCE_VALUES,
  PERMISSION_LEVEL_VALUES,
  ROLE_VALUES,
  USER_STATUS_VALUES,
} from '@/constants/domain'

export const createUserSchema = z.object({
  organizationId: z.uuid(),
  departmentId: z.uuid().nullish(),
  email: z.string().email().max(320),
  name: z.string().min(1).max(255),
  role: z.enum(ROLE_VALUES),
  permissionLevel: z.enum(PERMISSION_LEVEL_VALUES).default('READ'),
  complianceClearance: z.enum(COMPLIANCE_CLEARANCE_VALUES).default('STANDARD'),
  status: z.enum(USER_STATUS_VALUES).default('INVITED'),
  authProviderUserId: z.string().max(255).nullish(),
  metadata: jsonObjectSchema.default({}),
})

export const updateUserSchema = createUserSchema.partial()

export type CreateUserSchema = z.infer<typeof createUserSchema>
export type UpdateUserSchema = z.infer<typeof updateUserSchema>
