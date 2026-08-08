import Link from 'next/link'
import { cn } from '@/lib/utils'
import { APP } from '@/constants'

interface AppLogoProps {
  className?: string
  /** When provided, the logo becomes a link to this route. */
  href?: string
}

/* ContextGraph brand logo: purely text-based wordmark and tagline. */
export function AppLogo({ className, href }: AppLogoProps) {
  const content = (
    <div className={cn('flex flex-col leading-tight', className)}>
      <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
        {APP.name}
      </span>
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
