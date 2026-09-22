import { z } from 'zod'

/* Login input. Credentials are verified against the user's bcrypt hash
   (User.passwordHash); IdP-backed users without a local hash cannot log in here. */
export const loginSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email().max(320),
  password: z.string().min(1, 'Password is required').max(1024),
})

export type LoginInput = z.infer<typeof loginSchema>
