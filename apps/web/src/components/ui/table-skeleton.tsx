import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface TableSkeletonProps {
  rows?: number
  columns?: number
  /** Approximate width of each column. Falls back to equal distribution. */
  columnWidths?: string[]
  /** Whether to alternate row backgrounds for scannability. */
  striped?: boolean
  /** Show a header row skeleton. */
  showHeader?: boolean
}

/**
 * Renders realistic skeleton table rows that match the actual DataTable layout.
 * Produces a visual structure (header + rows + cells) that closely matches the
 * real table, improving perceived loading performance.
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  columnWidths,
  striped = true,
  showHeader = true,
}: TableSkeletonProps) {
  const widths = columnWidths ?? Array.from({ length: columns }, () => `${100 / columns}%`)
  // Use a seeded variation so widths are deterministic per cell position
  const cellWidth = (row: number, col: number) => {
    const base = widths[col] ?? `${100 / columns}%`
    // Slight random variation for a realistic look — vary by 40-90% of the base
    if (!base.endsWith('%') && !base.endsWith('px')) return base
    if (base.endsWith('px')) {
      const px = parseInt(base, 10)
      const factor = 0.5 + ((row * 7 + col * 13) % 10) / 20
      return `${Math.round(px * factor)}px`
    }
    return base
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        {showHeader && (
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr className="text-muted-foreground text-xs">
              {widths.map((_, colIndex) => (
                <th
                  key={`header-${colIndex}`}
                  className="px-3 py-2.5 text-left font-medium tracking-wide uppercase"
                >
                  <Skeleton className="h-3" style={{ width: cellWidth(0, colIndex) }} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className={cn(
                'border-b transition-colors last:border-0',
                striped && rowIndex % 2 === 1 && 'bg-muted/10',
              )}
            >
              {widths.map((_, colIndex) => (
                <td key={`cell-${rowIndex}-${colIndex}`} className="px-3 py-2.5">
                  <Skeleton className="h-3.5" style={{ width: cellWidth(rowIndex, colIndex) }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
