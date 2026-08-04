'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { getBreadcrumbItems } from '@/utils'

/**
 * Header breadcrumbs, derived from the current pathname via
 * `getBreadcrumbItems` (see `src/utils/breadcrumbs.ts`).
 */
export function Breadcrumbs() {
  const pathname = usePathname()
  const items = getBreadcrumbItems(pathname)

  return (
    <Breadcrumb className="hidden min-w-0 sm:block">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <BreadcrumbItem key={item.href} className="min-w-0">
              {isLast ? (
                <BreadcrumbPage className="truncate">{item.label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link href={item.href} className="truncate">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator>
                    <ChevronRight />
                  </BreadcrumbSeparator>
                </>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
