import { randomUUID } from 'node:crypto'

/** Creates a new UUID v4. */
export const uuid = (): string => randomUUID()

/** Validates a UUID v4 string. */
export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
