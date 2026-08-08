import type { SignIn } from '@clerk/nextjs'
import type { ComponentProps } from 'react'

/* Shared premium Clerk appearance. Both auth pages pass this so the card */
type ClerkAppearance = ComponentProps<typeof SignIn>['appearance']

export const CLERK_APPEARANCE: ClerkAppearance = {
  elements: {
    rootBox: 'mx-auto w-full',
    cardBox:
      'w-full rounded-2xl border border-border/70 bg-card/80 shadow-[0_24px_70px_-24px_rgba(var(--cg-glow),0.4)] backdrop-blur-md',
    card: 'bg-transparent',
    header: 'hidden',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    socialButtonsBlockButton:
      'rounded-lg border border-border bg-background/60 text-foreground shadow-none transition-colors hover:border-border hover:bg-muted/60',
    socialButtonsBlockButtonText: 'text-sm font-medium',
    dividerLine: 'bg-border/60',
    dividerText:
      'font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground',
    formFieldLabel: 'text-foreground text-sm font-medium',
    formFieldInput:
      'rounded-lg border-input bg-background/60 text-foreground shadow-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/25',
    formButtonPrimary:
      'rounded-lg bg-gradient-to-r from-indigo-500 via-sky-500 to-fuchsia-500 font-medium text-white shadow-[0_8px_24px_-8px_rgba(var(--cg-glow),0.55)] transition-all hover:brightness-110 hover:shadow-[0_8px_32px_-8px_rgba(var(--cg-glow),0.7)]',
    formFieldError: 'text-destructive text-xs',
    footer: 'hidden',
  },
}
