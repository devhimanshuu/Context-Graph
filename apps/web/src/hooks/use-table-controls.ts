'use client'

import * as React from 'react'

export interface TableControls<T> {
  query: string
  setQuery: (value: string) => void
  sortKey: string | null
  sortDir: 'asc' | 'desc'
  toggleSort: (key: string) => void
  rows: T[]
}

/**
 * Lightweight client-side table controls: case-insensitive text search across
 * selected fields plus column sorting. Good up to a few hundred rows; swap in
 * server-side pagination when lists grow beyond that.
 */
export function useTableControls<T>(
  rows: T[],
  options: {
    /** Accessors whose stringified values are matched by the search query. */
    searchFields?: Array<keyof T & string>
    /** Initial sort column; defaults to unsorted (original order). */
    initialSortKey?: string
    initialSortDir?: 'asc' | 'desc'
    /** Custom comparators for non-string columns (e.g. dates, numbers). */
    sortValues?: Partial<Record<string, (row: T) => string | number>>
  } = {},
): TableControls<T> {
  const {
    searchFields = [],
    initialSortKey = null,
    initialSortDir = 'asc',
    sortValues = {},
  } = options

  const [query, setQuery] = React.useState('')
  const [sortKey, setSortKey] = React.useState<string | null>(initialSortKey)
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>(initialSortDir)

  const toggleSort = React.useCallback((key: string) => {
    setSortKey((previousKey) => {
      if (previousKey !== key) {
        setSortDir('asc')
        return key
      }
      setSortDir((previousDir) => (previousDir === 'asc' ? 'desc' : 'asc'))
      return previousKey
    })
  }, [])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return rows
    return rows.filter((row) =>
      searchFields.some((field) => {
        const value = row[field]
        return typeof value === 'string' && value.toLowerCase().includes(q)
      }),
    )
  }, [rows, query, searchFields])

  const sorted = React.useMemo(() => {
    if (sortKey === null) return filtered
    const accessor = sortValues[sortKey]
    const comparable = (row: T): string | number => {
      if (accessor !== undefined) return accessor(row)
      const value = row[sortKey as keyof T]
      if (typeof value === 'number') return value
      if (typeof value === 'string') return value.toLowerCase()
      return ''
    }
    return [...filtered].sort((a, b) => {
      const av = comparable(a)
      const bv = comparable(b)
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir, sortValues])

  return { query, setQuery, sortKey, sortDir, toggleSort, rows: sorted }
}
