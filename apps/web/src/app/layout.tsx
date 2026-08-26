import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { APP } from '@/constants'
import { ThemeProvider } from '@/providers/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: `${APP.name} — ${APP.subtitle}`,
    template: `%s — ${APP.name}`,
  },
  description: APP.description,
  applicationName: APP.name,
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // ClerkProvider is required here so the user menu can call useClerk()
    // (sign-out). Auth pages style themselves via <SignIn/>/<SignUp/> props.
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased">
          {/* Skip to main content — accessibility requirement */}
          <a
            href="#main-content"
            className="focus:bg-background focus:ring-primary sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2"
          >
            Skip to main content
          </a>
          <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
