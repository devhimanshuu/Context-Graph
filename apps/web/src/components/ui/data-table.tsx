'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns for skeleton sizing. */
  columns?: number
  /** Show alternating row backgrounds. */
  striped?: boolean
  /** Make the header sticky when scrolling. */
  stickyHeader?: boolean
}

/**
 * Shared table wrapper that adds scannability features across all tables:
 * - Alternating row backgrounds (striped)
 * - Sticky header on scroll
 * - Consistent hover states
 * - Responsive horizontal scroll
 * - Proper semantic structure
 *
 * Replaces the raw `<div className="overflow-x-auto"><table className="w-full text-sm">` pattern.
 */
export function DataTable({
  children,
  className,
  striped: _striped = true,
  stickyHeader: _stickyHeader = true,
  ...props
}: DataTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border', className)} {...props}>
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function DataTableHead({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('bg-muted/50 sticky top-0 z-10', className)} {...props}>
      {children}
    </thead>
  )
}

export function DataTableBody({
  children,
  className,
  striped = true,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement> & { striped?: boolean }) {
  return (
    <tbody className={cn(striped && '[&_tr:nth-child(even)]:bg-muted/20', className)} {...props}>
      {children}
    </tbody>
  )
}

export function DataTableRow({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'hover:bg-muted/40 data-[selected]:bg-muted/60 border-b transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function DataTableHeader({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'text-muted-foreground px-3 py-2.5 text-left text-xs font-medium tracking-wide uppercase',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function DataTableCell({
  children,
  className,
  mono = false,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { mono?: boolean }) {
  return (
    <td
      className={cn('px-3 py-2.5 text-sm', mono && 'font-mono text-xs tabular-nums', className)}
      {...props}
    >
      {children}
    </td>
  )
}
