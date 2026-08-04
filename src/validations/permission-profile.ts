import { z } from 'zod'

export const createPermissionProfileSchema = z.object({
  organizationId: z.uuid(),
  /** Null = organization-wide profile. */
  workspaceId: z.uuid().nullish(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  /**
   * Rule document consumed by the permission compiler (Phase 3), e.g.
   * [{ role: "EDITOR", resource: "knowledgeNode", actions: ["read", "write"] }].
   */
  rules: z.array(z.record(z.string(), z.unknown())).default([]),
  isDefault: z.boolean().default(false),
})

export const updatePermissionProfileSchema = createPermissionProfileSchema.partial()

export type CreatePermissionProfileSchema = z.infer<typeof createPermissionProfileSchema>
export type UpdatePermissionProfileSchema = z.infer<typeof updatePermissionProfileSchema>
