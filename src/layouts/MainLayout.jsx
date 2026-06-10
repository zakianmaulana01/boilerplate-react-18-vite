import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/components/layout/AppHeader'

function MainLayout() {
  return (
    <div className="bg-grid flex min-h-screen flex-col">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border/80 bg-background/90 py-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 text-xs font-medium text-muted-foreground">
          <span>Local Mock Simulation</span>
          <span>Genlogic React Catalog</span>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout

