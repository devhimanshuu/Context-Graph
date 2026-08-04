import { z } from 'zod'
import { jsonObjectSchema } from '@/validations/common/fields'

export const createDepartmentSchema = z.object({
  organizationId: z.uuid(),
  /** Null = root department. */
  parentId: z.uuid().nullish(),
  name: z.string().min(1).max(255),
  /** Stable, org-unique short identifier (e.g. "CARDIOLOGY"). */
  code: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Z0-9_-]+$/, 'Uppercase snake/kebab code (e.g. "CARDIOLOGY")'),
  hierarchyLevel: z.number().int().min(0).default(0),
  metadata: jsonObjectSchema.default({}),
})

export const updateDepartmentSchema = createDepartmentSchema.partial()

export type CreateDepartmentSchema = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentSchema = z.infer<typeof updateDepartmentSchema>
