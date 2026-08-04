/**
 * Deterministic test utilities — reproducible time for fixtures and
 * assertions without mocking the clock.
 */

/** The fixed clock every fixture builder uses. */
export const TEST_FIXED_TIME = new Date('2026-01-01T00:00:00.000Z')

/** Returns `base` advanced by `ms` — cheap deterministic time math. */
export function advanceTime(base: Date, ms: number): Date {
  return new Date(base.getTime() + ms)
}

/** Returns the fixed test time (convenience alias for builders). */
export function fixedNow(): Date {
  return new Date(TEST_FIXED_TIME.getTime())
}
