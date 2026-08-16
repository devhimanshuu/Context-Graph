import { z } from 'zod'

/** Format a stored run's package into a prompt-ready document. */
export const contextFormatSchema = z.object({
  requestId: z.string().uuid(),
  /** Render the excluded-node notes block (default false). */
  includeExclusions: z.boolean().optional(),
})

export type ContextFormatInput = z.infer<typeof contextFormatSchema>
