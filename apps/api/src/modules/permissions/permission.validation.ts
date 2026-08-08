import { z } from 'zod'

export const createProfileSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  rules: z.record(z.string(), z.unknown()).default({}),
  isDefault: z.boolean().default(false),
})

export const assignProfileSchema = z.object({
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
})

export type CreateProfileInput = z.infer<typeof createProfileSchema>
export type AssignProfileInput = z.infer<typeof assignProfileSchema>
