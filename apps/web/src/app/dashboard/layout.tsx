import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SidebarProvider } from '@/components/layout/sidebar-context'
import { ApiProvider } from '@/components/dashboard/api-provider'
import { ApiStatusBar } from '@/components/dashboard/api-status-bar'
import { QueryProvider } from '@/components/dashboard/query-provider'
import { DashboardShortcutsProvider } from '@/components/layout/dashboard-shortcuts-provider'
import { getSession } from '@/lib/auth/session'
import { ROUTES } from '@/constants'

/* Dashboard shell (authenticated). Wraps children with global keyboard
   shortcuts, the command palette, and the shortcuts help dialog. */
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getSession()

  if (session === null) {
    redirect(ROUTES.login)
  }

  return (
    <div className="min-h-svh">
      <SidebarProvider>
        <div className="flex min-h-svh">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <ApiProvider>
              <QueryProvider>
                <DashboardShortcutsProvider>
                  <AppHeader user={session} />
                  <ApiStatusBar />
                  <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
                    <div className="mx-auto w-full max-w-7xl">{children}</div>
                  </main>
                </DashboardShortcutsProvider>
              </QueryProvider>
            </ApiProvider>
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}
