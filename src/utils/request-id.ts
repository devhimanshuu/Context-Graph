import { randomUUID } from 'node:crypto'

/**
 * Generates a unique id used to correlate a single request across logs and
 * API responses. Server-only (imports `node:crypto`).
 */
export function createRequestId(): string {
  return randomUUID()
}
