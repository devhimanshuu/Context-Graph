'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Theme provider wrapper around `next-themes`.
 *
 * Kept as a separate provider module so the root layout stays declarative and
 * additional providers (Query, Auth, ...) can be stacked here in later phases.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
