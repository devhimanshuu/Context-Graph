import { z } from 'zod'

export const createDepartmentSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(32),
  parentId: z.string().uuid().nullable().optional(),
  hierarchyLevel: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const updateDepartmentSchema = createDepartmentSchema.partial()

export const departmentIdSchema = z.string().uuid()

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>
