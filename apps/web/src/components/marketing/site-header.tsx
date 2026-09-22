'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { AppLogo } from '@/components/layout/app-logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { ScrollProgress } from './scroll-progress'
import { ROUTES } from '@/constants'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Security', href: '#compliance' },
  { label: 'FAQ', href: '#faq' },
] as const

/* Marketing site header. Sticky with backdrop blur; navigation collapses to */
export function SiteHeader() {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    handleScroll() // initial check
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="pointer-events-none sticky top-0 z-50 flex w-full justify-center transition-all duration-500">
      <header
        className={cn(
          'bg-background/80 pointer-events-auto relative flex flex-col overflow-hidden backdrop-blur-lg transition-all duration-700 ease-in-out',
          isScrolled
            ? 'border-border/50 mt-4 w-[95%] rounded-full border shadow-lg md:w-[70%]'
            : 'border-border/40 mt-0 w-[90%] rounded-[0px] border-b shadow-none',
        )}
      >
        <ScrollProgress />
        <div
          className={cn(
            'mx-auto flex h-16 w-full items-center gap-4 transition-all duration-500',
            isScrolled ? 'px-6 md:px-8' : 'px-4 md:px-0',
          )}
        >
          <AppLogo href={ROUTES.home} />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Landing">
            {NAV_LINKS.map((link) => (
              <Button
                key={link.href}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground transition-colors"
                asChild
              >
                <a href={link.href}>{link.label}</a>
              </Button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Desktop CTAs — hidden below sm; they live in the mobile menu */}
            <div className="hidden items-center gap-2 sm:flex">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground transition-colors"
                asChild
              >
                <Link href={ROUTES.agentPlayground}>Playground</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground transition-colors"
                asChild
              >
                <Link href={ROUTES.login}>Sign in</Link>
              </Button>
              <Button
                size="sm"
                className="cg-glow-pulse group shadow-[0_0_16px_-6px_rgba(var(--cg-glow),0.55)] transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98]"
                asChild
              >
                <Link href={ROUTES.signUp}>
                  Get started
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            {/* Mobile menu drawer */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[82%]">
                <SheetHeader>
                  <SheetTitle>
                    <AppLogo />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                  {NAV_LINKS.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <a
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                      >
                        {link.label}
                      </a>
                    </SheetClose>
                  ))}
                </nav>
                <SheetFooter className="gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-muted-foreground text-sm">Theme</span>
                    <ThemeToggle />
                  </div>
                  <Button asChild className="w-full">
                    <Link href={ROUTES.signUp}>
                      Get started
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={ROUTES.agentPlayground}>Try the Playground</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href={ROUTES.login}>Sign in</Link>
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </div>
  )
}
