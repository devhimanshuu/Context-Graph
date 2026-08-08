import { ROUTE_TITLES } from '@/constants'

export interface BreadcrumbItem {
  label: string
  href: string
}

/* Derives breadcrumb items from a pathname using the `ROUTE_TITLES` map. */
export function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return [{ label: ROUTE_TITLES['/'] ?? 'Overview', href: '/' }]
  }

  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`
    const label = ROUTE_TITLES[href] ?? ROUTE_TITLES[`/${segment}`] ?? humanize(segment)
    return { label, href }
  })
}

function humanize(segment: string): string {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
