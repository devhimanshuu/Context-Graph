import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href={ROUTES.dashboard}>Back to overview</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={ROUTES.home}>Visit the site</Link>
        </Button>
      </div>
    </div>
  )
}
