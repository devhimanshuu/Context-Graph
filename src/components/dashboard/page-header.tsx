import * as React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  /** Optional action slot rendered on the right (buttons, badges, ...). */
  children?: React.ReactNode
}

/** Consistent page header used across all dashboard pages. */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description !== undefined && (
          <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>
        )}
      </div>
      {children !== undefined && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
