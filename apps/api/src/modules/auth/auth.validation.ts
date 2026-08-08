import { z } from 'zod'

/* Login input. `password` is accepted for API/contract stability but NOT verified yet — */
export const loginSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email().max(320),
  password: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
