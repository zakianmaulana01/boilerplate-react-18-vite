import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
]

function MainLayout() {
  return (
    <div className="bg-grid flex min-h-screen flex-col">
      <nav className="border-b border-border/80 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_24px_hsl(var(--primary)/0.7)]" />
            <span className="text-sm font-semibold tracking-[0.18em] text-foreground/80 uppercase">
              Ultimate Boilerplate
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card/70 p-1 shadow-soft">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-16">
        <Outlet />
      </main>

      <footer className="border-t border-border/80 bg-background/90">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm text-muted-foreground">
          <span>Scalable React foundation</span>
          <span>React 18 + Vite + shadcn/ui</span>
        </div>
      </footer>
    </div>
  )
}

export default MainLayout
