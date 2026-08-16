/* Heat color for a duration cell, normalized to the slowest cell in the matrix. */

/** Returns the Tailwind classes for a cell whose duration is `ms` of `maxMs`. */
export function heatColor(ms: number, maxMs: number): string {
  if (maxMs <= 0) return 'bg-muted'
  const ratio = ms / maxMs
  if (ratio <= 0.1) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
  if (ratio <= 0.3) return 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300'
  if (ratio <= 0.55) return 'bg-amber-500/25 text-amber-700 dark:text-amber-300'
  if (ratio <= 0.8) return 'bg-orange-500/30 text-orange-700 dark:text-orange-300'
  return 'bg-rose-500/40 text-rose-700 dark:text-rose-300'
}
