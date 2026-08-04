import Link from 'next/link'
import { cn } from '@/lib/utils'
import { APP } from '@/constants'

interface AppLogoProps {
  className?: string
  /** Render only the icon mark (used in compact contexts). */
  compact?: boolean
  /** When provided, the logo becomes a link to this route. */
  href?: string
}

/**
 * ContextGraph brand logo: a small node-graph mark inside a primary tile,
 * with the wordmark and tagline. Pure presentational component.
 */
export function AppLogo({ className, compact = false, href }: AppLogoProps) {
  const content = (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
        <GraphMark className="size-4" />
      </div>
      {!compact && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">{APP.name}</span>
          <span className="text-muted-foreground text-[10px] font-medium">{APP.tagline}</span>
        </div>
      )}
    </div>
  )

  if (href !== undefined) {
    return (
      <Link href={href} className="focus-visible:outline-ring rounded-md focus-visible:outline-2">
        {content}
      </Link>
    )
  }

  return content
}

function GraphMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="5.5" cy="12" r="2.5" />
      <circle cx="18.5" cy="5.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
      <path d="M7.6 10.8 16.4 6.6M7.6 13.2l8.8 4.2" />
    </svg>
  )
}
