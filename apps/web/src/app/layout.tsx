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
          <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
