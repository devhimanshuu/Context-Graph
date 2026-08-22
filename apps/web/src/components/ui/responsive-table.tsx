'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  /** Column definitions for mobile card rendering. */
  columns: { key: string; label: string; mono?: boolean; className?: string }[]
  /** Row data. Each item should have keys matching column definitions. */
  data: Record<string, React.ReactNode>[]
  /** Key function to extract a unique key from each row. */
  keyFn: (item: Record<string, React.ReactNode>, index: number) => string
  /** Optional className for the container. */
  className?: string
  /** Optional onRowClick handler. */
  onRowClick?: (item: Record<string, React.ReactNode>) => void
  /** Optional empty state. */
  empty?: React.ReactNode
}

/**
 * Responsive table that shows as a standard table on desktop and collapses
 * to a card layout on mobile screens (< 768px).
 *
 * Usage:
 *   <ResponsiveTable
 *     columns={[
 *       { key: 'name', label: 'Name' },
 *       { key: 'role', label: 'Role', mono: true },
 *       { key: 'status', label: 'Status' },
 *     ]}
 *     data={users.map(u => ({ name: u.name, role: u.role, status: u.status }))}
 *     keyFn={(item) => String(item.name)}
 *   />
 */
export function ResponsiveTable({
  columns,
  data,
  keyFn,
  className,
  onRowClick,
  empty,
}: ResponsiveTableProps) {
  if (data.length === 0 && empty !== undefined) {
    return <>{empty}</>
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      {/* Desktop: standard table */}
      <table className="hidden w-full text-sm md:table">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr className="text-muted-foreground border-b text-left text-xs">
            {columns.map((col) => (
              <th key={col.key} className={cn('px-3 py-2.5 font-medium', col.className)}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:nth-child(even)]:bg-muted/20">
          {data.map((row, index) => (
            <tr
              key={keyFn(row, index)}
              className={cn(
                'hover:bg-muted/40 border-b transition-colors last:border-0',
                onRowClick !== undefined && 'cursor-pointer',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-3 py-2.5 text-sm',
                    col.mono && 'font-mono text-xs tabular-nums',
                    col.className,
                  )}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: card layout */}
      <div className="space-y-2 md:hidden">
        {data.length === 0 && empty !== undefined ? (
          <>{empty}</>
        ) : (
          data.map((row, index) => (
            <div
              key={keyFn(row, index)}
              className={cn(
                'space-y-1.5 rounded-lg border p-3',
                onRowClick !== undefined && 'hover:bg-muted/30 cursor-pointer',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">{col.label}</span>
                  <span
                    className={cn(
                      'text-right text-sm font-medium',
                      col.mono && 'font-mono text-xs tabular-nums',
                    )}
                  >
                    {row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
