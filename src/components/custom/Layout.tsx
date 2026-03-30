import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Separator } from '@/components/ui/separator'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
  pageTitle?: string
}

export default function Layout({ children, currentPage, onNavigate, pageTitle }: LayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar currentPage={currentPage} onNavigate={onNavigate} />
      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        <header className="flex items-center gap-3 border-b border-border px-4 py-4 bg-background sticky top-0 z-10">
          <SidebarTrigger className="size-8 text-muted-foreground hover:text-foreground" />
          {pageTitle && (
            <>
              <Separator orientation="vertical" className="h-8" />
              <span className="font-heading text-sm font-medium text-muted-foreground truncate">{pageTitle}</span>
            </>
          )}
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </SidebarProvider>
  )
}
