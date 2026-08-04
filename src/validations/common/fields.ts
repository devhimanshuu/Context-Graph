import { z } from 'zod'

/**
 * Reusable field schemas so entity validations never redefine primitives.
 */

/** UUID primary key / foreign key. */
export const uuidSchema = z.uuid()

/** Optional ISO-8601 datetime (validity windows, etc.). */
export const isoDateTimeSchema = z.iso.datetime({ offset: true })

export const optionalIsoDateTimeSchema = isoDateTimeSchema.nullish()

/** Free-form JSON object (metadata, configuration, rule payloads). */
export const jsonObjectSchema = z.record(z.string(), z.unknown())

/** URL-safe slug, e.g. `meridian-health`, `inpatient-assessment`. */
export const slugSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase URL-safe slug (e.g. "meridian-health")')
