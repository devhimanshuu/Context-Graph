/**
 * Consistent date/time formatting across the app using Intl.DateTimeFormat.
 * Replaces ad-hoc .toLocaleString() / .toLocaleDateString() calls.
 */

const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
})

const relativeFmt = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto',
})

/** "Jan 15, 2026" */
export function formatDate(iso: string | Date): string {
  return dateFmt.format(new Date(iso))
}

/** "Jan 15, 2026, 2:30 PM" */
export function formatDateTime(iso: string | Date): string {
  return dateTimeFmt.format(new Date(iso))
}

/** "2:30 PM" */
export function formatTime(iso: string | Date): string {
  return timeFmt.format(new Date(iso))
}

/** "2 hours ago", "3 days ago", etc. */
export function formatRelativeTime(iso: string | Date): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return relativeFmt.format(-diffMin, 'minute')
  if (diffHr < 24) return relativeFmt.format(-diffHr, 'hour')
  if (diffDay < 30) return relativeFmt.format(-diffDay, 'day')
  return formatDate(iso)
}

/**
 * Format a number with locale-aware separators.
 * Replaces ad-hoc .toLocaleString() calls.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(undefined, options).format(value)
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * 1234 → "1.2s", 500 → "500ms"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Format currency.
 * 0.0042 → "$0.0042"
 */
export function formatCurrency(usd: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
  }).format(usd)
}
