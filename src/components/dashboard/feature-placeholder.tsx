import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FeaturePlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
  /** Scope bullets describing what the capability will cover. */
  items: string[]
}

/**
 * Placeholder surface for capabilities planned in later phases.
 * Keeps navigation and the shell fully explorable without inventing
 * business logic ahead of its phase.
 */
export function FeaturePlaceholder({
  icon: Icon,
  title,
  description,
  items,
}: FeaturePlaceholderProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="bg-sidebar-accent text-sidebar-accent-foreground flex size-12 items-center justify-center rounded-xl">
            <Icon className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="text-muted-foreground mx-auto max-w-md text-sm">{description}</p>
          </div>
          <Badge variant="secondary">Planned for a later phase</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scope</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground space-y-2.5 text-sm">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="bg-primary/50 mt-1.5 size-1.5 shrink-0 rounded-full" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
