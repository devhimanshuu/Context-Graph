import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/layout/app-logo'
import { ROUTES } from '@/constants'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Security', href: '#security' },
] as const

/**
 * Marketing site header. Sticky with backdrop blur; navigation collapses to
 * the primary CTA on small screens.
 */
export function SiteHeader() {
  return (
    <header className="bg-background/70 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6">
        <AppLogo href={ROUTES.home} />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Landing">
          {NAV_LINKS.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              asChild
            >
              <a href={link.href}>{link.label}</a>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hidden sm:inline-flex"
            asChild
          >
            <Link href={ROUTES.login}>Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={ROUTES.login}>
              Get started
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
