import Link from 'next/link'
import { AppLogo } from '@/components/layout/app-logo'
import { APP, ROUTES } from '@/constants'

const FOOTER_COLUMNS = [
  {
    heading: 'Product',
    links: [
      { label: 'Knowledge Graph', href: ROUTES.knowledgeGraph },
      { label: 'Rules', href: ROUTES.rules },
      { label: 'Permissions', href: ROUTES.permissions },
      { label: 'Contexts', href: ROUTES.contexts },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Platform features', href: '#features' },
      { label: 'Architecture', href: '#architecture' },
      { label: 'API health', href: '/api/health' },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-3">
            <AppLogo />
            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              {APP.description}
            </p>
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              All systems operational
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-sm font-semibold">{column.heading}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground mt-12 flex flex-col gap-2 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP.name} · {APP.subtitle}
          </p>
          <p className="font-mono">v{APP.version} · Phase 2</p>
        </div>
      </div>
    </footer>
  )
}
